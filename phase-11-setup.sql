-- LTL PHASE 11 DATABASE PATCH
-- Run in Supabase SQL Editor after the Phase 10 setup.
-- Exposes only the minimal learner directory fields needed by the Chat > People list.
-- This avoids relying on a SECURITY INVOKER view over profiles with restrictive self-only RLS.

create or replace function public.ltl_chat_people_directory()
returns table(id uuid, full_name text, role text)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id,
         coalesce(nullif(trim(p.full_name), ''), 'Learner') as full_name,
         p.role
  from public.profiles p
  where auth.uid() is not null
  order by coalesce(nullif(trim(p.full_name), ''), 'Learner');
$$;

revoke all on function public.ltl_chat_people_directory() from public, anon;
grant execute on function public.ltl_chat_people_directory() to authenticated;

-- Ensure the avatar bucket is private. The existing Phase 10 signed-URL flow remains in use.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('ltl-avatars', 'ltl-avatars', false, 8388608, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update
set public = false, file_size_limit = 8388608,
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
