-- LTL Phase 3 Supabase setup
-- Run in Supabase Dashboard > SQL Editor. Review policies before production.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'user' check (role in ('user','admin')),
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''), 'user')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile" on public.profiles for select to authenticated using (id = auth.uid());
create table if not exists public.ltl_content (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  exam text not null check (exam in ('TNPSC','RRB','SSC')),
  subject text not null,
  type text not null check (type in ('video','note')),
  file_url text not null,
  storage_path text not null,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);
alter table public.ltl_content enable row level security;
drop policy if exists "Published content is readable" on public.ltl_content;
create policy "Published content is readable" on public.ltl_content for select to anon, authenticated using (true);
drop policy if exists "Admins can add content" on public.ltl_content;
create policy "Admins can add content" on public.ltl_content for insert to authenticated with check (created_by = auth.uid() and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
drop policy if exists "Admins can delete content" on public.ltl_content;
create policy "Admins can delete content" on public.ltl_content for delete to authenticated using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

create table if not exists public.ltl_questions (
  id uuid primary key default gen_random_uuid(),
  exam text not null check (exam in ('TNPSC','RRB','SSC')),
  subject text not null,
  mode text not null default 'quiz' check (mode in ('quiz','test')),
  question text not null,
  options jsonb not null check (jsonb_typeof(options) = 'array' and jsonb_array_length(options) = 4),
  correct_option integer not null check (correct_option between 0 and 3),
  explanation text not null default '',
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);
alter table public.ltl_questions enable row level security;
drop policy if exists "Signed in users can read questions" on public.ltl_questions;
create policy "Signed in users can read questions" on public.ltl_questions for select to authenticated using (true);
drop policy if exists "Admins can publish questions" on public.ltl_questions;
create policy "Admins can publish questions" on public.ltl_questions for insert to authenticated with check (created_by = auth.uid() and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
drop policy if exists "Admins can manage questions" on public.ltl_questions;
create policy "Admins can manage questions" on public.ltl_questions for delete to authenticated using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
drop policy if exists "Admins can update questions" on public.ltl_questions;
create policy "Admins can update questions" on public.ltl_questions for update to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- Create two storage buckets: ltl-videos and ltl-notes. This example makes files publicly readable;
-- only admins may upload/delete. For restricted videos, use private buckets + signed URLs instead.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('ltl-videos','ltl-videos',true,524288000,array['video/mp4','video/webm','video/quicktime'])
on conflict (id) do nothing;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('ltl-notes','ltl-notes',true,52428800,array['application/pdf'])
on conflict (id) do nothing;

drop policy if exists "Admins upload LTL files" on storage.objects;
create policy "Admins upload LTL files" on storage.objects for insert to authenticated with check (bucket_id in ('ltl-videos','ltl-notes') and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
drop policy if exists "Admins delete LTL files" on storage.objects;
create policy "Admins delete LTL files" on storage.objects for delete to authenticated using (bucket_id in ('ltl-videos','ltl-notes') and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- IMPORTANT: after signing up your admin account, promote it from the SQL editor:
-- update public.profiles set role = 'admin' where id = (select id from auth.users where email = 'YOUR_ADMIN_EMAIL');
