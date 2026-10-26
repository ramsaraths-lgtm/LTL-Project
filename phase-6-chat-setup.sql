
-- =========================================================
-- PHASE 6 CHAT UPGRADE (run after the existing supabase-setup.sql)
-- =========================================================
alter table public.ltl_chat_groups
  add column if not exists visibility text not null default 'private' check (visibility in ('public','private')),
  add column if not exists invite_code text;
create index if not exists ltl_chat_groups_visibility_created_idx on public.ltl_chat_groups(visibility, created_at desc);
create index if not exists ltl_chat_members_user_idx on public.ltl_chat_members(user_id);
create index if not exists ltl_group_messages_created_idx on public.ltl_group_messages(group_id, created_at);

-- Keep direct-message and group history restricted to participants.
drop policy if exists "Members can view their groups" on public.ltl_chat_groups;
create policy "Members can view their groups" on public.ltl_chat_groups for select to authenticated using (
  visibility = 'public'
  or created_by = auth.uid()
  or exists (select 1 from public.ltl_chat_members m where m.group_id = id and m.user_id = auth.uid())
);
drop policy if exists "Members can add themselves to groups" on public.ltl_chat_members;
create policy "Only owner can manage group members" on public.ltl_chat_members for insert to authenticated with check (
  user_id = auth.uid()
  or exists (select 1 from public.ltl_chat_groups g where g.id = group_id and g.created_by = auth.uid())
);
drop policy if exists "Members can view group membership" on public.ltl_chat_members;
create policy "Members and owners can view membership" on public.ltl_chat_members for select to authenticated using (
  user_id = auth.uid()
  or exists (select 1 from public.ltl_chat_members mine where mine.group_id = group_id and mine.user_id = auth.uid())
  or exists (select 1 from public.ltl_chat_groups g where g.id = group_id and g.created_by = auth.uid())
);
drop policy if exists "Authenticated users can create groups" on public.ltl_chat_groups;
create policy "Authenticated users can create groups" on public.ltl_chat_groups for insert to authenticated with check (
  created_by = auth.uid() and ((visibility = 'public' and invite_code is null) or (visibility = 'private' and invite_code is not null))
);

-- Joining is performed through this function so private groups require a matching invite code.
create or replace function public.ltl_join_chat_group(p_group_id uuid, p_invite_code text default null)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare g public.ltl_chat_groups%rowtype;
begin
  if auth.uid() is null then raise exception 'Sign in is required'; end if;
  select * into g from public.ltl_chat_groups where id = p_group_id;
  if not found then raise exception 'Group not found'; end if;
  if g.visibility = 'private' and (p_invite_code is null or p_invite_code <> g.invite_code) then
    raise exception 'Invalid private group invite code';
  end if;
  insert into public.ltl_chat_members(group_id, user_id) values (p_group_id, auth.uid()) on conflict do nothing;
  return true;
end;
$$;
revoke all on function public.ltl_join_chat_group(uuid,text) from public;
grant execute on function public.ltl_join_chat_group(uuid,text) to authenticated;

-- Only authenticated users can discover the basic profile fields used in the people picker.
drop policy if exists "Authenticated users can discover learners" on public.profiles;
create policy "Authenticated users can discover learners" on public.profiles for select to authenticated using (true);

-- Realtime delivery is enabled for new chat messages (safe to run repeatedly).
do $$ begin
  alter publication supabase_realtime add table public.ltl_direct_messages;
exception when duplicate_object then null;
when undefined_object then null;
end $$;
do $$ begin
  alter publication supabase_realtime add table public.ltl_group_messages;
exception when duplicate_object then null;
when undefined_object then null;
end $$;

-- Admin user listing uses the profiles table; role changes must be done by a trusted admin
-- in Supabase, never by allowing a client to update its own role.
