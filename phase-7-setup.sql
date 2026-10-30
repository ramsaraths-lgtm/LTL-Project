-- LTL Phase 7 setup
-- Run once in Supabase Dashboard > SQL Editor after the Phase 6 SQL.

-- 1) Allow each signed-in user to update their own profile name.
-- The trigger below prevents non-admin users from changing their role.
drop policy if exists "Users can update own profile name" on public.profiles;
create policy "Users can update own profile name"
on public.profiles for update to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create or replace function public.protect_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role
     and auth.uid() is not null
     and not exists (
       select 1 from public.profiles p
       where p.id = auth.uid() and p.role = 'admin'
     ) then
    raise exception 'Only an administrator can change profile roles';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_role_before_update on public.profiles;
create trigger protect_profile_role_before_update
before update on public.profiles
for each row execute function public.protect_profile_role();

-- 2) Admin-only new-user notification inbox.
create table if not exists public.ltl_admin_notifications (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid references auth.users(id) on delete set null,
  user_email text,
  user_name text,
  created_at timestamptz not null default now(),
  is_read boolean not null default false
);

alter table public.ltl_admin_notifications enable row level security;
drop policy if exists "Admins can read LTL user notifications" on public.ltl_admin_notifications;
create policy "Admins can read LTL user notifications"
on public.ltl_admin_notifications for select to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
drop policy if exists "Admins can update LTL user notifications" on public.ltl_admin_notifications;
create policy "Admins can update LTL user notifications"
on public.ltl_admin_notifications for update to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- This trigger writes notifications server-side whenever a new Auth account is created.
create or replace function public.notify_ltl_admins_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.ltl_admin_notifications (auth_user_id, user_email, user_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', '')
  );
  return new;
end;
$$;

drop trigger if exists on_ltl_auth_user_created_notify_admins on auth.users;
create trigger on_ltl_auth_user_created_notify_admins
after insert on auth.users
for each row execute function public.notify_ltl_admins_new_user();

-- Enable Supabase Realtime for the notification table (safe if already added).
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'ltl_admin_notifications'
  ) then
    alter publication supabase_realtime add table public.ltl_admin_notifications;
  end if;
end $$;

-- Existing users can receive a notification for new registrations from now on.
-- No existing account roles or chat data are changed by this migration.
