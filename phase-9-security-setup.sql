-- LTL PHASE 9: SECURITY, DM REQUESTS, PRIVATE STORAGE & AUDIT LOG
-- Run AFTER supabase-setup.sql, phase-6-chat-setup.sql, phase-7-setup.sql and phase-8-tests-setup.sql.
-- Additive migration. Back up the database before production use.

-- 1) Replace broad learner profile discovery: only expose id/name/role through a safe view.
drop policy if exists "Authenticated users can discover learners" on public.profiles;
drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile" on public.profiles for select to authenticated using (id = auth.uid() or public.ltl_is_admin());
create or replace view public.ltl_learner_directory with (security_invoker = false) as
  select id, coalesce(nullif(trim(full_name), ''), 'Learner') as full_name, role from public.profiles;
grant select on public.ltl_learner_directory to authenticated;

-- 2) Direct-message requests: no direct messages until recipient accepts.
create table if not exists public.ltl_dm_requests (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','declined','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (sender_id <> recipient_id)
);
create unique index if not exists ltl_dm_requests_one_pending_pair
  on public.ltl_dm_requests(sender_id, recipient_id) where status = 'pending';
create index if not exists ltl_dm_requests_recipient_status_idx on public.ltl_dm_requests(recipient_id,status,created_at desc);
alter table public.ltl_dm_requests enable row level security;
drop policy if exists "Participants read own DM requests" on public.ltl_dm_requests;
create policy "Participants read own DM requests" on public.ltl_dm_requests for select to authenticated
  using (sender_id = auth.uid() or recipient_id = auth.uid());
-- No direct insert/update/delete policies. Only verified RPCs can change request state.

create or replace function public.ltl_send_dm_request(p_recipient uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Sign in required'; end if;
  if p_recipient is null or p_recipient = v_uid then raise exception 'Invalid recipient'; end if;
  if public.ltl_is_banned(v_uid) then raise exception 'Chat access is suspended'; end if;
  if public.ltl_is_blocked_between(v_uid,p_recipient) then raise exception 'Messaging is unavailable'; end if;
  if not exists(select 1 from public.profiles where id=p_recipient) then raise exception 'User not found'; end if;
  if exists(select 1 from public.ltl_dm_requests r where r.sender_id=v_uid and r.recipient_id=p_recipient and r.status='accepted')
     or exists(select 1 from public.ltl_dm_requests r where r.sender_id=p_recipient and r.recipient_id=v_uid and r.status='accepted') then
    raise exception 'A chat connection already exists';
  end if;
  insert into public.ltl_dm_requests(sender_id,recipient_id) values(v_uid,p_recipient)
    on conflict (sender_id,recipient_id) where status='pending' do update set updated_at=now()
    returning id into v_id;
  return v_id;
end; $$;

create or replace function public.ltl_respond_dm_request(p_request uuid,p_accept boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Sign in required'; end if;
  update public.ltl_dm_requests set status=case when p_accept then 'accepted' else 'declined' end, updated_at=now()
   where id=p_request and recipient_id=v_uid and status='pending';
  if not found then raise exception 'Request not found or already handled'; end if;
end; $$;

create or replace function public.ltl_dm_pair_accepted(p_a uuid,p_b uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.ltl_dm_requests r where r.status='accepted' and
    ((r.sender_id=p_a and r.recipient_id=p_b) or (r.sender_id=p_b and r.recipient_id=p_a)));
$$;
revoke all on function public.ltl_dm_pair_accepted(uuid,uuid) from public, anon;
grant execute on function public.ltl_dm_pair_accepted(uuid,uuid) to authenticated;

-- Direct message RLS: read only with accepted request; inserts require accepted request.
drop policy if exists "Participants can read direct messages" on public.ltl_direct_messages;
drop policy if exists "Users can send direct messages" on public.ltl_direct_messages;
create policy "Accepted contacts read direct messages" on public.ltl_direct_messages for select to authenticated using (
  (sender_id=auth.uid() or recipient_id=auth.uid()) and public.ltl_dm_pair_accepted(sender_id,recipient_id)
);
create policy "Accepted contacts send direct messages" on public.ltl_direct_messages for insert to authenticated with check (
  sender_id=auth.uid() and recipient_id<>auth.uid() and not public.ltl_is_banned(auth.uid())
  and not public.ltl_is_blocked_between(sender_id,recipient_id)
  and public.ltl_dm_pair_accepted(sender_id,recipient_id)
);

-- 3) Private file buckets. Public URLs stop working after this migration.
update storage.buckets set public=false where id in ('ltl-videos','ltl-notes');
drop policy if exists "Admins upload LTL files" on storage.objects;
drop policy if exists "Admins delete LTL files" on storage.objects;
drop policy if exists "LTL authenticated users can view learning files" on storage.objects;
drop policy if exists "LTL admins upload learning files" on storage.objects;
drop policy if exists "LTL admins update learning files" on storage.objects;
drop policy if exists "LTL admins delete learning files" on storage.objects;
create policy "LTL authenticated users can view learning files" on storage.objects for select to authenticated
  using (bucket_id in ('ltl-videos','ltl-notes'));
create policy "LTL admins upload learning files" on storage.objects for insert to authenticated
  with check (bucket_id in ('ltl-videos','ltl-notes') and public.ltl_is_admin());
create policy "LTL admins update learning files" on storage.objects for update to authenticated
  using (bucket_id in ('ltl-videos','ltl-notes') and public.ltl_is_admin())
  with check (bucket_id in ('ltl-videos','ltl-notes') and public.ltl_is_admin());
create policy "LTL admins delete learning files" on storage.objects for delete to authenticated
  using (bucket_id in ('ltl-videos','ltl-notes') and public.ltl_is_admin());

-- 4) Security audit trail. Captures high-value actions without storing message bodies/passwords.
create table if not exists public.ltl_security_audit (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  target_type text not null,
  target_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists ltl_security_audit_created_idx on public.ltl_security_audit(created_at desc);
create index if not exists ltl_security_audit_actor_idx on public.ltl_security_audit(actor_id,created_at desc);
alter table public.ltl_security_audit enable row level security;
drop policy if exists "Only admins read security audit" on public.ltl_security_audit;
create policy "Only admins read security audit" on public.ltl_security_audit for select to authenticated using (public.ltl_is_admin());
revoke insert, update, delete on public.ltl_security_audit from anon, authenticated;

create or replace function public.ltl_audit_event(p_action text,p_target_type text,p_target_id text default null,p_metadata jsonb default '{}'::jsonb)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  insert into public.ltl_security_audit(actor_id,action,target_type,target_id,metadata)
  values(auth.uid(),left(p_action,80),left(p_target_type,80),left(p_target_id,200),coalesce(p_metadata,'{}'::jsonb));
end; $$;

-- Preserve existing one-to-one conversations by marking old participant pairs accepted.
insert into public.ltl_dm_requests(sender_id,recipient_id,status)
select distinct m.sender_id,m.recipient_id,'accepted' from public.ltl_direct_messages m
where not exists (select 1 from public.ltl_dm_requests r where r.status='accepted' and
 ((r.sender_id=m.sender_id and r.recipient_id=m.recipient_id) or (r.sender_id=m.recipient_id and r.recipient_id=m.sender_id)))
on conflict do nothing;

-- Automatic audit events for key chat actions (never logs message contents).
create or replace function public.ltl_audit_chat_change() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_table_name='ltl_dm_requests' then
    insert into public.ltl_security_audit(actor_id,action,target_type,target_id,metadata)
    values(auth.uid(),case when tg_op='INSERT' then 'dm_request_created' else 'dm_request_status_changed' end,'dm_request',new.id::text,jsonb_build_object('status',new.status));
  elsif tg_table_name='ltl_direct_messages' then
    insert into public.ltl_security_audit(actor_id,action,target_type,target_id,metadata)
    values(auth.uid(),'direct_message_sent','direct_message',new.id::text,jsonb_build_object('recipient_id',new.recipient_id));
  elsif tg_table_name='ltl_group_messages' then
    insert into public.ltl_security_audit(actor_id,action,target_type,target_id,metadata)
    values(auth.uid(),'group_message_sent','group_message',new.id::text,jsonb_build_object('group_id',new.group_id));
  end if;
  return new;
end; $$;
drop trigger if exists ltl_audit_dm_request_change on public.ltl_dm_requests;
create trigger ltl_audit_dm_request_change after insert or update of status on public.ltl_dm_requests for each row execute function public.ltl_audit_chat_change();
drop trigger if exists ltl_audit_direct_message on public.ltl_direct_messages;
create trigger ltl_audit_direct_message after insert on public.ltl_direct_messages for each row execute function public.ltl_audit_chat_change();
drop trigger if exists ltl_audit_group_message on public.ltl_group_messages;
create trigger ltl_audit_group_message after insert on public.ltl_group_messages for each row execute function public.ltl_audit_chat_change();

-- Explicit API grants for the new objects/functions.
grant select on public.ltl_dm_requests to authenticated;
grant select on public.ltl_security_audit to authenticated;
grant select on public.ltl_learner_directory to authenticated;
revoke all on function public.ltl_send_dm_request(uuid) from public, anon;
revoke all on function public.ltl_respond_dm_request(uuid,boolean) from public, anon;
grant execute on function public.ltl_send_dm_request(uuid) to authenticated;
grant execute on function public.ltl_respond_dm_request(uuid,boolean) to authenticated;
