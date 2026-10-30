-- LTL Phase 10: subject-scoped quiz bookmarks and private profile photo storage.
-- Run this AFTER the existing Phase 6, 7, 8 and 9 SQL setup files.

create table if not exists public.ltl_quiz_bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  question_id uuid not null references public.ltl_questions(id) on delete cascade,
  exam text not null check (exam in ('TNPSC','RRB','SSC')),
  subject text not null,
  created_at timestamptz not null default now(),
  constraint ltl_quiz_bookmarks_user_question_unique unique (user_id, question_id)
);

create index if not exists ltl_quiz_bookmarks_subject_idx
  on public.ltl_quiz_bookmarks (user_id, exam, subject);

alter table public.ltl_quiz_bookmarks enable row level security;

drop policy if exists "Users can view their own quiz bookmarks" on public.ltl_quiz_bookmarks;
create policy "Users can view their own quiz bookmarks"
  on public.ltl_quiz_bookmarks for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "Users can add their own quiz bookmarks" on public.ltl_quiz_bookmarks;
create policy "Users can add their own quiz bookmarks"
  on public.ltl_quiz_bookmarks for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.ltl_questions q
      where q.id = ltl_quiz_bookmarks.question_id and q.mode = 'quiz'
        and q.exam = ltl_quiz_bookmarks.exam and q.subject = ltl_quiz_bookmarks.subject
    )
  );

drop policy if exists "Users can remove their own quiz bookmarks" on public.ltl_quiz_bookmarks;
create policy "Users can remove their own quiz bookmarks"
  on public.ltl_quiz_bookmarks for delete to authenticated
  using (user_id = auth.uid());

-- Private bucket for user avatars. Signed URLs are generated only after ownership checks.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('ltl-avatars', 'ltl-avatars', false, 5242880, array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do update set public = false, file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg','image/png','image/webp','image/gif'];

drop policy if exists "Users can view own LTL avatar files" on storage.objects;
create policy "Users can view own LTL avatar files"
  on storage.objects for select to authenticated
  using (bucket_id = 'ltl-avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users can upload own LTL avatar files" on storage.objects;
create policy "Users can upload own LTL avatar files"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'ltl-avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users can update own LTL avatar files" on storage.objects;
create policy "Users can update own LTL avatar files"
  on storage.objects for update to authenticated
  using (bucket_id = 'ltl-avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'ltl-avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users can delete own LTL avatar files" on storage.objects;
create policy "Users can delete own LTL avatar files"
  on storage.objects for delete to authenticated
  using (bucket_id = 'ltl-avatars' and (storage.foldername(name))[1] = auth.uid()::text);
