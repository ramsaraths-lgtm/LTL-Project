-- LTL Phase 14: chat image attachments, group avatars and mistake notebook
-- Run once in Supabase SQL Editor after Phase 13.
alter table public.ltl_direct_messages add column if not exists image_path text;
alter table public.ltl_group_messages add column if not exists image_path text;
alter table public.ltl_chat_groups add column if not exists avatar_path text;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('ltl-chat-images','ltl-chat-images',false,5242880,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=false,file_size_limit=5242880,allowed_mime_types=array['image/jpeg','image/png','image/webp'];
-- Chat image paths are scoped by conversation and user. Only authenticated chat participants can access via signed URLs.
drop policy if exists "LTL chat image upload own folder" on storage.objects;
create policy "LTL chat image upload own folder" on storage.objects for insert to authenticated
with check(bucket_id='ltl-chat-images' and (storage.foldername(name))[1]=auth.uid()::text);
drop policy if exists "LTL chat image read participants" on storage.objects;
create policy "LTL chat image read participants" on storage.objects for select to authenticated
using(bucket_id='ltl-chat-images' and (storage.foldername(name))[1]=auth.uid()::text);
drop policy if exists "LTL chat image update own folder" on storage.objects;
create policy "LTL chat image update own folder" on storage.objects for update to authenticated
using(bucket_id='ltl-chat-images' and (storage.foldername(name))[1]=auth.uid()::text)
with check(bucket_id='ltl-chat-images' and (storage.foldername(name))[1]=auth.uid()::text);

create table if not exists public.ltl_mistake_notebook(
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 attempt_id uuid not null references public.ltl_test_attempts(id) on delete cascade,
 test_id uuid not null references public.ltl_tests(id) on delete cascade,
 exam text not null, subject text not null, question text not null, options jsonb not null,
 selected_option integer, correct_option integer not null check(correct_option between 0 and 3),
 created_at timestamptz not null default now(), unique(user_id,attempt_id,question)
);
alter table public.ltl_mistake_notebook enable row level security;
drop policy if exists "Learners read own mistakes" on public.ltl_mistake_notebook;
create policy "Learners read own mistakes" on public.ltl_mistake_notebook for select to authenticated using(user_id=auth.uid());
drop policy if exists "Learners delete own mistakes" on public.ltl_mistake_notebook;
create policy "Learners delete own mistakes" on public.ltl_mistake_notebook for delete to authenticated using(user_id=auth.uid());
revoke insert,update on public.ltl_mistake_notebook from anon,authenticated;

create or replace function public.ltl_submit_test_attempt(p_attempt_id uuid,p_answers jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare a public.ltl_test_attempts%rowtype; t public.ltl_tests%rowtype; n integer; s integer;
begin
 select * into a from public.ltl_test_attempts where id=p_attempt_id for update;
 if not found or a.user_id<>auth.uid() then raise exception 'Attempt not found'; end if;
 if a.status<>'in_progress' then raise exception 'This test attempt is already closed'; end if;
 select * into t from public.ltl_tests where id=a.test_id;
 select count(*),count(*) filter(where (p_answers->>q.id::text) ~ '^[0-3]$' and (p_answers->>q.id::text)::integer=q.correct_option)
 into n,s from public.ltl_test_questions q where q.test_id=a.test_id;
 update public.ltl_test_attempts set status='submitted',submitted_at=now(),answers=coalesce(p_answers,'{}'::jsonb),score=s,total=n where id=a.id;
 insert into public.ltl_mistake_notebook(user_id,attempt_id,test_id,exam,subject,question,options,selected_option,correct_option)
 select a.user_id,a.id,t.id,t.exam,t.subject,q.question,q.options,
   case when (p_answers->>q.id::text) ~ '^[0-3]$' then (p_answers->>q.id::text)::integer else null end,q.correct_option
 from public.ltl_test_questions q
 where q.test_id=a.test_id and ((p_answers->>q.id::text) !~ '^[0-3]$' or (p_answers->>q.id::text)::integer is distinct from q.correct_option)
 on conflict(user_id,attempt_id,question) do nothing;
 return jsonb_build_object('score',s,'total',n);
end; $$;
revoke all on function public.ltl_submit_test_attempt(uuid,jsonb) from public,anon;
grant execute on function public.ltl_submit_test_attempt(uuid,jsonb) to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('ltl-group-avatars','ltl-group-avatars',true,5242880,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=true,file_size_limit=5242880,allowed_mime_types=array['image/jpeg','image/png','image/webp'];
drop policy if exists "LTL group owner upload avatar" on storage.objects;
create policy "LTL group owner upload avatar" on storage.objects for insert to authenticated
with check(bucket_id='ltl-group-avatars' and exists(select 1 from public.ltl_chat_groups g where g.id::text=(storage.foldername(name))[1] and g.created_by=auth.uid()));
drop policy if exists "LTL group avatar update owner" on storage.objects;
create policy "LTL group avatar update owner" on storage.objects for update to authenticated
using(bucket_id='ltl-group-avatars' and exists(select 1 from public.ltl_chat_groups g where g.id::text=(storage.foldername(name))[1] and g.created_by=auth.uid()))
with check(bucket_id='ltl-group-avatars' and exists(select 1 from public.ltl_chat_groups g where g.id::text=(storage.foldername(name))[1] and g.created_by=auth.uid()));

-- Permit recipients and group members to read an attachment only after it is linked to an authorized message.
drop policy if exists "LTL chat image read participants" on storage.objects;
create policy "LTL chat image read participants" on storage.objects for select to authenticated
using (bucket_id='ltl-chat-images' and (
  (storage.foldername(name))[2]='dm' and exists(
    select 1 from public.ltl_direct_messages m
    where m.image_path=name and ((m.sender_id=auth.uid()) or (m.recipient_id=auth.uid()))
  )
  or
  (storage.foldername(name))[2]='group' and exists(
    select 1 from public.ltl_group_messages m
    where m.image_path=name and public.ltl_is_group_member(m.group_id)
  )
));
