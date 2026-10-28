-- =========================================================
-- PHASE 6 CHAT SYSTEM v2
-- Run AFTER supabase-setup.sql, in Supabase Dashboard > SQL Editor.
-- Safe to run again (idempotent). If you ran the older phase-6 file, run this one too:
-- it replaces the old policies (the old ones let anyone self-join a private group).
-- =========================================================

-- ---------- 0. Remove old policies that this version replaces ----------
drop policy if exists "Authenticated users can create groups" on public.ltl_chat_groups;
drop policy if exists "Members can view their groups" on public.ltl_chat_groups;
drop policy if exists "Only owner can manage group members" on public.ltl_chat_members;
drop policy if exists "Members and owners can view membership" on public.ltl_chat_members;
drop policy if exists "Members can add themselves to groups" on public.ltl_chat_members;
drop policy if exists "Members can view group membership" on public.ltl_chat_members;
drop policy if exists "Members can read group messages" on public.ltl_group_messages;
drop policy if exists "Members can send group messages" on public.ltl_group_messages;
drop policy if exists "Participants can read direct messages" on public.ltl_direct_messages;
drop policy if exists "Users can send direct messages" on public.ltl_direct_messages;
drop function if exists public.ltl_join_chat_group(uuid, text);

-- ---------- 1. Columns ----------
alter table public.ltl_chat_groups
  add column if not exists description text not null default '',
  add column if not exists visibility text not null default 'private';
do $$ begin
  alter table public.ltl_chat_groups add constraint ltl_chat_groups_visibility_chk check (visibility in ('public','private'));
exception when duplicate_object then null; end $$;

alter table public.ltl_chat_members
  add column if not exists role text not null default 'member',
  add column if not exists last_read_at timestamptz not null default now();
do $$ begin
  alter table public.ltl_chat_members add constraint ltl_chat_members_role_chk check (role in ('owner','member'));
exception when duplicate_object then null; end $$;
update public.ltl_chat_members m set role = 'owner'
  from public.ltl_chat_groups g where g.id = m.group_id and g.created_by = m.user_id and m.role <> 'owner';

alter table public.ltl_direct_messages add column if not exists read_at timestamptz;

-- ---------- 2. New tables ----------
-- Invite codes live in their own table so ordinary members can never read them.
create table if not exists public.ltl_chat_group_codes (
  group_id uuid primary key references public.ltl_chat_groups(id) on delete cascade,
  invite_code text not null unique,
  updated_at timestamptz not null default now()
);
-- Move codes from the old column (older phase-6 file) and remove that column.
do $$ begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'ltl_chat_groups' and column_name = 'invite_code') then
    execute 'insert into public.ltl_chat_group_codes(group_id, invite_code)
             select id, upper(invite_code) from public.ltl_chat_groups
             where invite_code is not null and visibility = ''private'' on conflict do nothing';
    alter table public.ltl_chat_groups drop column invite_code;
  end if;
end $$;

create table if not exists public.ltl_user_blocks (
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
create table if not exists public.ltl_chat_bans (
  user_id uuid primary key references auth.users(id) on delete cascade,
  banned_by uuid references auth.users(id) on delete set null,
  reason text,
  created_at timestamptz not null default now()
);
alter table public.ltl_chat_group_codes enable row level security;
alter table public.ltl_user_blocks enable row level security;
alter table public.ltl_chat_bans enable row level security;

create index if not exists ltl_chat_groups_visibility_created_idx on public.ltl_chat_groups(visibility, created_at desc);
create index if not exists ltl_chat_members_user_idx on public.ltl_chat_members(user_id);
create index if not exists ltl_group_messages_created_idx on public.ltl_group_messages(group_id, created_at);
create index if not exists ltl_direct_messages_recipient_idx on public.ltl_direct_messages(recipient_id, sender_id, created_at);

-- ---------- 3. Helper functions (security definer = no RLS recursion) ----------
create or replace function public.ltl_is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin');
$$;
create or replace function public.ltl_is_banned(p_user uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.ltl_chat_bans b where b.user_id = p_user);
$$;
create or replace function public.ltl_is_group_member(p_group uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.ltl_chat_members m where m.group_id = p_group and m.user_id = auth.uid());
$$;
create or replace function public.ltl_is_group_owner(p_group uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.ltl_chat_groups g where g.id = p_group and g.created_by = auth.uid());
$$;
create or replace function public.ltl_is_blocked_between(p_a uuid, p_b uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.ltl_user_blocks b
                 where (b.blocker_id = p_a and b.blocked_id = p_b) or (b.blocker_id = p_b and b.blocked_id = p_a));
$$;
create or replace function public.ltl_new_invite_code() returns text
language plpgsql volatile security definer set search_path = '' as $$
declare c text;
begin
  loop
    c := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    exit when not exists (select 1 from public.ltl_chat_group_codes x where x.invite_code = c);
  end loop;
  return c;
end;
$$;

-- ---------- 4. Row level security policies ----------
-- Groups: public ones are discoverable; private ones only for members/owner; admin sees all.
create policy "Members can view their groups" on public.ltl_chat_groups for select to authenticated using (
  visibility = 'public' or created_by = auth.uid() or public.ltl_is_group_member(id) or public.ltl_is_admin()
);
drop policy if exists "Owner can update group" on public.ltl_chat_groups;
create policy "Owner can update group" on public.ltl_chat_groups for update to authenticated
  using (created_by = auth.uid()) with check (created_by = auth.uid());
drop policy if exists "Owner or admin can delete group" on public.ltl_chat_groups;
create policy "Owner or admin can delete group" on public.ltl_chat_groups for delete to authenticated
  using (created_by = auth.uid() or public.ltl_is_admin());
-- (No INSERT policy on purpose: groups are created only through ltl_create_chat_group.)

-- Members: nobody can insert rows directly. Joining/adding happens only in verified functions below.
create policy "Members and owners can view membership" on public.ltl_chat_members for select to authenticated using (
  user_id = auth.uid() or public.ltl_is_group_member(group_id) or public.ltl_is_group_owner(group_id) or public.ltl_is_admin()
);
drop policy if exists "Owner removes members or member leaves" on public.ltl_chat_members;
create policy "Owner removes members or member leaves" on public.ltl_chat_members for delete to authenticated using (
  (public.ltl_is_group_owner(group_id) and user_id <> auth.uid())
  or (user_id = auth.uid() and role <> 'owner')
  or public.ltl_is_admin()
);

-- Group messages: only members can read; only non-suspended members can send.
create policy "Members can read group messages" on public.ltl_group_messages for select to authenticated using (
  public.ltl_is_group_member(group_id)
);
create policy "Members can send group messages" on public.ltl_group_messages for insert to authenticated with check (
  sender_id = auth.uid() and public.ltl_is_group_member(group_id) and not public.ltl_is_banned(auth.uid())
);
drop policy if exists "Sender owner or admin can delete group messages" on public.ltl_group_messages;
create policy "Sender owner or admin can delete group messages" on public.ltl_group_messages for delete to authenticated using (
  sender_id = auth.uid() or public.ltl_is_group_owner(group_id) or public.ltl_is_admin()
);

-- Direct messages: participants only; blocked or suspended users cannot send.
create policy "Participants can read direct messages" on public.ltl_direct_messages for select to authenticated using (
  sender_id = auth.uid() or recipient_id = auth.uid()
);
create policy "Users can send direct messages" on public.ltl_direct_messages for insert to authenticated with check (
  sender_id = auth.uid() and recipient_id <> auth.uid()
  and not public.ltl_is_blocked_between(sender_id, recipient_id)
  and not public.ltl_is_banned(auth.uid())
);

-- Invite codes: only the group owner (or an admin) can read them.
drop policy if exists "Owner reads invite code" on public.ltl_chat_group_codes;
create policy "Owner reads invite code" on public.ltl_chat_group_codes for select to authenticated using (
  public.ltl_is_group_owner(group_id) or public.ltl_is_admin()
);

-- Blocks: each user manages only their own block list.
drop policy if exists "Manage own blocks" on public.ltl_user_blocks;
create policy "Manage own blocks" on public.ltl_user_blocks for select to authenticated using (blocker_id = auth.uid());
drop policy if exists "Add own blocks" on public.ltl_user_blocks;
create policy "Add own blocks" on public.ltl_user_blocks for insert to authenticated with check (blocker_id = auth.uid());
drop policy if exists "Remove own blocks" on public.ltl_user_blocks;
create policy "Remove own blocks" on public.ltl_user_blocks for delete to authenticated using (blocker_id = auth.uid());

-- Chat suspensions: a user can see their own row; only admins manage them.
drop policy if exists "See own ban or admin sees all" on public.ltl_chat_bans;
create policy "See own ban or admin sees all" on public.ltl_chat_bans for select to authenticated using (user_id = auth.uid() or public.ltl_is_admin());
drop policy if exists "Admin adds bans" on public.ltl_chat_bans;
create policy "Admin adds bans" on public.ltl_chat_bans for insert to authenticated with check (public.ltl_is_admin());
drop policy if exists "Admin removes bans" on public.ltl_chat_bans;
create policy "Admin removes bans" on public.ltl_chat_bans for delete to authenticated using (public.ltl_is_admin());

-- Profiles used by the people picker (already created in supabase-setup.sql; repeated here for safety).
drop policy if exists "Authenticated users can discover learners" on public.profiles;
create policy "Authenticated users can discover learners" on public.profiles for select to authenticated using (true);

-- ---------- 5. Server-side actions ----------
create or replace function public.ltl_create_chat_group(p_name text, p_description text, p_visibility text, p_member_ids uuid[] default '{}')
returns uuid language plpgsql security definer set search_path = '' as $$
declare gid uuid; uid uuid := auth.uid(); mid uuid;
begin
  if uid is null then raise exception 'Sign in is required'; end if;
  if public.ltl_is_banned(uid) then raise exception 'Your chat access is suspended by an admin'; end if;
  if p_visibility not in ('public','private') then raise exception 'Invalid group type'; end if;
  if length(trim(coalesce(p_name, ''))) < 2 then raise exception 'Group name must contain at least 2 characters'; end if;
  insert into public.ltl_chat_groups(name, description, visibility, created_by)
    values (left(trim(p_name), 60), left(coalesce(p_description, ''), 300), p_visibility, uid) returning id into gid;
  insert into public.ltl_chat_members(group_id, user_id, role) values (gid, uid, 'owner');
  if p_member_ids is not null then
    foreach mid in array p_member_ids loop
      if mid <> uid and exists (select 1 from public.profiles pr where pr.id = mid) then
        insert into public.ltl_chat_members(group_id, user_id) values (gid, mid) on conflict do nothing;
      end if;
    end loop;
  end if;
  if p_visibility = 'private' then
    insert into public.ltl_chat_group_codes(group_id, invite_code) values (gid, public.ltl_new_invite_code());
  end if;
  return gid;
end;
$$;

create or replace function public.ltl_join_public_group(p_group_id uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'Sign in is required'; end if;
  if public.ltl_is_banned(uid) then raise exception 'Your chat access is suspended by an admin'; end if;
  if not exists (select 1 from public.ltl_chat_groups g where g.id = p_group_id and g.visibility = 'public') then
    raise exception 'Public group not found';
  end if;
  insert into public.ltl_chat_members(group_id, user_id) values (p_group_id, uid) on conflict do nothing;
  return p_group_id;
end;
$$;

-- Private groups: the code is verified here on the server. The code alone never exposes messages,
-- because messages are still protected by membership (RLS), and membership is only created here.
create or replace function public.ltl_join_group_by_code(p_code text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); gid uuid;
begin
  if uid is null then raise exception 'Sign in is required'; end if;
  if public.ltl_is_banned(uid) then raise exception 'Your chat access is suspended by an admin'; end if;
  select c.group_id into gid from public.ltl_chat_group_codes c where c.invite_code = upper(trim(coalesce(p_code, '')));
  if gid is null then raise exception 'Invalid invite code'; end if;
  insert into public.ltl_chat_members(group_id, user_id) values (gid, uid) on conflict do nothing;
  return gid;
end;
$$;

create or replace function public.ltl_regenerate_invite_code(p_group_id uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare c text;
begin
  if not exists (select 1 from public.ltl_chat_groups g where g.id = p_group_id and g.created_by = auth.uid() and g.visibility = 'private') then
    raise exception 'Only the owner of a private group can regenerate its invite code';
  end if;
  c := public.ltl_new_invite_code();
  insert into public.ltl_chat_group_codes(group_id, invite_code) values (p_group_id, c)
    on conflict (group_id) do update set invite_code = excluded.invite_code, updated_at = now();
  return c;
end;
$$;

create or replace function public.ltl_add_chat_member(p_group_id uuid, p_user_id uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.ltl_chat_groups g where g.id = p_group_id and g.created_by = auth.uid()) then
    raise exception 'Only the group owner can add members';
  end if;
  if not exists (select 1 from public.profiles pr where pr.id = p_user_id) then raise exception 'User not found'; end if;
  insert into public.ltl_chat_members(group_id, user_id) values (p_group_id, p_user_id) on conflict do nothing;
  return true;
end;
$$;

create or replace function public.ltl_mark_dm_read(p_other uuid) returns void
language sql security definer set search_path = '' as $$
  update public.ltl_direct_messages set read_at = now()
  where recipient_id = auth.uid() and sender_id = p_other and read_at is null;
$$;
create or replace function public.ltl_mark_group_read(p_group uuid) returns void
language sql security definer set search_path = '' as $$
  update public.ltl_chat_members set last_read_at = now() where group_id = p_group and user_id = auth.uid();
$$;

-- ---------- 6. Read helpers used by the UI ----------
create or replace function public.ltl_my_chat_groups()
returns table(id uuid, name text, description text, visibility text, created_by uuid, created_at timestamptz,
              role text, member_count bigint, unread bigint, last_message_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select g.id, g.name, g.description, g.visibility, g.created_by, g.created_at, m.role,
    (select count(*) from public.ltl_chat_members x where x.group_id = g.id),
    (select count(*) from public.ltl_group_messages gm where gm.group_id = g.id and gm.created_at > m.last_read_at and gm.sender_id <> auth.uid()),
    (select max(gm2.created_at) from public.ltl_group_messages gm2 where gm2.group_id = g.id)
  from public.ltl_chat_groups g
  join public.ltl_chat_members m on m.group_id = g.id and m.user_id = auth.uid()
  order by g.created_at desc;
$$;

create or replace function public.ltl_discover_public_groups(p_query text default '')
returns table(id uuid, name text, description text, member_count bigint, is_member boolean, created_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select g.id, g.name, g.description,
    (select count(*) from public.ltl_chat_members x where x.group_id = g.id),
    exists (select 1 from public.ltl_chat_members y where y.group_id = g.id and y.user_id = auth.uid()),
    g.created_at
  from public.ltl_chat_groups g
  where g.visibility = 'public' and (coalesce(p_query, '') = '' or g.name ilike '%' || p_query || '%')
  order by g.created_at desc limit 50;
$$;

create or replace function public.ltl_dm_overview()
returns table(other_id uuid, last_body text, last_at timestamptz, unread bigint)
language sql stable security definer set search_path = '' as $$
  select o.other_id,
    (select d.body from public.ltl_direct_messages d
      where (d.sender_id = auth.uid() and d.recipient_id = o.other_id) or (d.sender_id = o.other_id and d.recipient_id = auth.uid())
      order by d.created_at desc limit 1),
    (select max(d.created_at) from public.ltl_direct_messages d
      where (d.sender_id = auth.uid() and d.recipient_id = o.other_id) or (d.sender_id = o.other_id and d.recipient_id = auth.uid())),
    (select count(*) from public.ltl_direct_messages d
      where d.sender_id = o.other_id and d.recipient_id = auth.uid() and d.read_at is null)
  from (select distinct case when sender_id = auth.uid() then recipient_id else sender_id end as other_id
        from public.ltl_direct_messages where sender_id = auth.uid() or recipient_id = auth.uid()) o;
$$;

-- Admin-only overview for the "Users & Chat" tab (returns nothing for non-admins).
create or replace function public.ltl_admin_chat_overview()
returns table(id uuid, name text, visibility text, owner_id uuid, owner_name text,
              member_count bigint, message_count bigint, created_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select g.id, g.name, g.visibility, g.created_by, p.full_name,
    (select count(*) from public.ltl_chat_members x where x.group_id = g.id),
    (select count(*) from public.ltl_group_messages gm where gm.group_id = g.id),
    g.created_at
  from public.ltl_chat_groups g left join public.profiles p on p.id = g.created_by
  where public.ltl_is_admin()
  order by g.created_at desc;
$$;

-- ---------- 7. Function permissions ----------
do $$
declare f text;
begin
  foreach f in array array[
    'ltl_is_admin()', 'ltl_is_banned(uuid)', 'ltl_is_group_member(uuid)', 'ltl_is_group_owner(uuid)',
    'ltl_is_blocked_between(uuid,uuid)', 'ltl_new_invite_code()',
    'ltl_create_chat_group(text,text,text,uuid[])', 'ltl_join_public_group(uuid)', 'ltl_join_group_by_code(text)',
    'ltl_regenerate_invite_code(uuid)', 'ltl_add_chat_member(uuid,uuid)', 'ltl_mark_dm_read(uuid)',
    'ltl_mark_group_read(uuid)', 'ltl_my_chat_groups()', 'ltl_discover_public_groups(text)',
    'ltl_dm_overview()', 'ltl_admin_chat_overview()'
  ] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;
-- ltl_new_invite_code is internal only.
revoke execute on function public.ltl_new_invite_code() from authenticated;

-- ---------- 8. Realtime ----------
do $$ begin alter publication supabase_realtime add table public.ltl_direct_messages;
exception when duplicate_object then null; when undefined_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.ltl_group_messages;
exception when duplicate_object then null; when undefined_object then null; end $$;
