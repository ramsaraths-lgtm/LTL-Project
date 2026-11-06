-- LTL Phase 14 FIX: "new row violates row-level security policy" when setting a group picture.
-- Run once in Supabase SQL Editor (safe to run again). Also re-applies the bucket + owner policies
-- from phase-14-setup.sql in case that script was not fully run.

alter table public.ltl_chat_groups add column if not exists avatar_path text;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('ltl-group-avatars','ltl-group-avatars',true,5242880,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=true,file_size_limit=5242880,allowed_mime_types=array['image/jpeg','image/png','image/webp'];

-- Upload (owner of the group only; first folder = group id)
drop policy if exists "LTL group owner upload avatar" on storage.objects;
create policy "LTL group owner upload avatar" on storage.objects for insert to authenticated
with check(bucket_id='ltl-group-avatars' and exists(select 1 from public.ltl_chat_groups g where g.id::text=(storage.foldername(name))[1] and g.created_by=auth.uid()));

-- Update (owner only)
drop policy if exists "LTL group avatar update owner" on storage.objects;
create policy "LTL group avatar update owner" on storage.objects for update to authenticated
using(bucket_id='ltl-group-avatars' and exists(select 1 from public.ltl_chat_groups g where g.id::text=(storage.foldername(name))[1] and g.created_by=auth.uid()))
with check(bucket_id='ltl-group-avatars' and exists(select 1 from public.ltl_chat_groups g where g.id::text=(storage.foldername(name))[1] and g.created_by=auth.uid()));

-- MISSING BEFORE: read policy. Storage upload needs SELECT access on the object row (upsert / returning),
-- without it Supabase answers "new row violates row-level security policy".
drop policy if exists "LTL group avatar read" on storage.objects;
create policy "LTL group avatar read" on storage.objects for select to authenticated
using(bucket_id='ltl-group-avatars');

-- Delete (owner only, so old pictures can be cleaned up)
drop policy if exists "LTL group avatar delete owner" on storage.objects;
create policy "LTL group avatar delete owner" on storage.objects for delete to authenticated
using(bucket_id='ltl-group-avatars' and exists(select 1 from public.ltl_chat_groups g where g.id::text=(storage.foldername(name))[1] and g.created_by=auth.uid()));

-- Owner may update the group row (avatar_path). Re-assert in case it was dropped.
drop policy if exists "Owner can update group" on public.ltl_chat_groups;
create policy "Owner can update group" on public.ltl_chat_groups for update to authenticated
using(created_by=auth.uid()) with check(created_by=auth.uid());
