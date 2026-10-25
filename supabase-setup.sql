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

-- PHASE 5: allow admins to edit content records (not only upload/delete).
drop policy if exists "Admins can update content" on public.ltl_content;
create policy "Admins can update content" on public.ltl_content for update to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- PHASE 5: chat schema for one-to-one and group conversations.
create table if not exists public.ltl_chat_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 2 and 60),
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create table if not exists public.ltl_chat_members (
  group_id uuid not null references public.ltl_chat_groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);
create table if not exists public.ltl_direct_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (length(trim(body)) between 1 and 4000),
  created_at timestamptz not null default now(),
  check (sender_id <> recipient_id)
);
create table if not exists public.ltl_group_messages (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.ltl_chat_groups(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (length(trim(body)) between 1 and 4000),
  created_at timestamptz not null default now()
);

alter table public.ltl_chat_groups enable row level security;
alter table public.ltl_chat_members enable row level security;
alter table public.ltl_direct_messages enable row level security;
alter table public.ltl_group_messages enable row level security;

-- Users can view registered profiles for the in-app people picker; only own profile fields are returned by UI.
drop policy if exists "Authenticated users can discover learners" on public.profiles;
create policy "Authenticated users can discover learners" on public.profiles for select to authenticated using (true);

-- Group creation is authenticated. Creator is automatically added by the frontend after creating the group.
drop policy if exists "Authenticated users can create groups" on public.ltl_chat_groups;
create policy "Authenticated users can create groups" on public.ltl_chat_groups for insert to authenticated with check (created_by = auth.uid());
drop policy if exists "Members can view their groups" on public.ltl_chat_groups;
create policy "Members can view their groups" on public.ltl_chat_groups for select to authenticated using (
  exists (select 1 from public.ltl_chat_members m where m.group_id = id and m.user_id = auth.uid())
  or created_by = auth.uid()
);
drop policy if exists "Members can add themselves to groups" on public.ltl_chat_members;
create policy "Members can add themselves to groups" on public.ltl_chat_members for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "Members can view group membership" on public.ltl_chat_members;
create policy "Members can view group membership" on public.ltl_chat_members for select to authenticated using (user_id = auth.uid());
drop policy if exists "Members can read group messages" on public.ltl_group_messages;
create policy "Members can read group messages" on public.ltl_group_messages for select to authenticated using (
  exists (select 1 from public.ltl_chat_members m where m.group_id = ltl_group_messages.group_id and m.user_id = auth.uid())
);
drop policy if exists "Members can send group messages" on public.ltl_group_messages;
create policy "Members can send group messages" on public.ltl_group_messages for insert to authenticated with check (
  sender_id = auth.uid() and exists (select 1 from public.ltl_chat_members m where m.group_id = ltl_group_messages.group_id and m.user_id = auth.uid())
);
drop policy if exists "Participants can read direct messages" on public.ltl_direct_messages;
create policy "Participants can read direct messages" on public.ltl_direct_messages for select to authenticated using (sender_id = auth.uid() or recipient_id = auth.uid());
drop policy if exists "Users can send direct messages" on public.ltl_direct_messages;
create policy "Users can send direct messages" on public.ltl_direct_messages for insert to authenticated with check (sender_id = auth.uid() and recipient_id <> auth.uid());

create index if not exists ltl_direct_messages_pair_created_idx on public.ltl_direct_messages (sender_id, recipient_id, created_at);
create index if not exists ltl_group_messages_group_created_idx on public.ltl_group_messages (group_id, created_at);
