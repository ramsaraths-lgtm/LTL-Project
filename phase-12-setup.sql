-- LTL PHASE 12: shared avatars + test-only points + leaderboard
-- Run this once in Supabase SQL Editor after Phase 11 setup.

-- 1) Avatars are intended to be visible to other signed-in learners.
-- Public bucket allows image reads; uploads/updates/deletes remain owner-only.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('ltl-avatars', 'ltl-avatars', true, 8388608, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = true, file_size_limit = 8388608,
  allowed_mime_types = array['image/jpeg','image/png','image/webp'];

drop policy if exists "Users can upload own LTL avatar" on storage.objects;
create policy "Users can upload own LTL avatar"
on storage.objects for insert to authenticated
with check (bucket_id = 'ltl-avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users can update own LTL avatar" on storage.objects;
create policy "Users can update own LTL avatar"
on storage.objects for update to authenticated
using (bucket_id = 'ltl-avatars' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'ltl-avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users can read own LTL avatar" on storage.objects;
create policy "Users can read own LTL avatar"
on storage.objects for select to authenticated
using (bucket_id = 'ltl-avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users can delete own LTL avatar" on storage.objects;
create policy "Users can delete own LTL avatar"
on storage.objects for delete to authenticated
using (bucket_id = 'ltl-avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- 2) Refresh the chat directory RPC to include the avatar object path.
-- PostgreSQL requires dropping it first because the returned table shape changes.
drop function if exists public.ltl_chat_people_directory();
create function public.ltl_chat_people_directory()
returns table(id uuid, full_name text, role text, avatar_path text)
language sql stable security definer set search_path = '' as $$
  select p.id,
         coalesce(nullif(trim(p.full_name), ''), 'Learner') as full_name,
         p.role,
         nullif(u.raw_user_meta_data ->> 'avatar_path', '') as avatar_path
  from public.profiles p
  join auth.users u on u.id = p.id
  where auth.uid() is not null
  order by coalesce(nullif(trim(p.full_name), ''), 'Learner');
$$;
revoke all on function public.ltl_chat_people_directory() from public, anon;
grant execute on function public.ltl_chat_people_directory() to authenticated;

-- 3) Aggregate points awarded ONLY when a scheduled test attempt is submitted.
create table if not exists public.ltl_test_points (
  user_id uuid primary key references auth.users(id) on delete cascade,
  total_points bigint not null default 0 check (total_points >= 0),
  updated_at timestamptz not null default now()
);
alter table public.ltl_test_points enable row level security;
drop policy if exists "Learners can read leaderboard points" on public.ltl_test_points;
create policy "Learners can read leaderboard points"
on public.ltl_test_points for select to authenticated using (true);
revoke insert, update, delete on public.ltl_test_points from anon, authenticated;

create or replace function public.ltl_award_test_points()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if old.status = 'in_progress' and new.status = 'submitted' then
    insert into public.ltl_test_points(user_id, total_points, updated_at)
    values (new.user_id, greatest(coalesce(new.score, 0), 0), now())
    on conflict (user_id) do update
      set total_points = public.ltl_test_points.total_points + greatest(coalesce(new.score, 0), 0),
          updated_at = now();
  end if;
  return new;
end;
$$;
drop trigger if exists ltl_award_test_points_after_submit on public.ltl_test_attempts;
create trigger ltl_award_test_points_after_submit
after update of status on public.ltl_test_attempts
for each row execute function public.ltl_award_test_points();

-- 4) The signed-in learner can read their own total.
create or replace function public.ltl_my_test_points()
returns bigint language sql stable security definer set search_path = '' as $$
  select coalesce((select total_points from public.ltl_test_points where user_id = auth.uid()), 0)::bigint;
$$;
revoke all on function public.ltl_my_test_points() from public, anon;
grant execute on function public.ltl_my_test_points() to authenticated;

-- 5) Public-to-authenticated leaderboard returns only display name, score and avatar path.
create or replace function public.ltl_test_leaderboard()
returns table(user_id uuid, full_name text, points bigint, avatar_path text, rank bigint)
language sql stable security definer set search_path = '' as $$
  select pt.user_id,
         coalesce(nullif(trim(p.full_name), ''), 'Learner') as full_name,
         pt.total_points as points,
         nullif(u.raw_user_meta_data ->> 'avatar_path', '') as avatar_path,
         dense_rank() over (order by pt.total_points desc) as rank
  from public.ltl_test_points pt
  join public.profiles p on p.id = pt.user_id
  join auth.users u on u.id = pt.user_id
  where auth.uid() is not null
  order by pt.total_points desc, coalesce(nullif(trim(p.full_name), ''), 'Learner') asc
  limit 100;
$$;
revoke all on function public.ltl_test_leaderboard() from public, anon;
grant execute on function public.ltl_test_leaderboard() to authenticated;

-- Existing test attempts completed before this Phase 12 patch are intentionally
-- not backfilled; points begin accruing for new submitted tests after installation.
