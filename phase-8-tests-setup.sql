-- LTL Phase 8: scheduled, one-attempt tests. Run once in Supabase SQL Editor.
create table if not exists public.ltl_tests (
 id uuid primary key default gen_random_uuid(), title text not null,
 exam text not null, subject text not null, starts_at timestamptz not null,
 duration_minutes integer not null check (duration_minutes > 0),
 total_marks integer not null default 0, status text not null default 'published' check(status in ('draft','published','cancelled')),
 created_by uuid not null references auth.users(id), created_at timestamptz not null default now()
);
create table if not exists public.ltl_test_questions (
 id uuid primary key default gen_random_uuid(), test_id uuid not null references public.ltl_tests(id) on delete cascade,
 position integer not null, question text not null, options jsonb not null,
 correct_option integer not null check(correct_option between 0 and 3), unique(test_id,position)
);
create table if not exists public.ltl_test_attempts (
 id uuid primary key default gen_random_uuid(), test_id uuid not null references public.ltl_tests(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade, started_at timestamptz not null default now(),
 submitted_at timestamptz, status text not null default 'in_progress' check(status in ('in_progress','submitted','expired')),
 score integer, total integer, answers jsonb, unique(test_id,user_id)
);
create index if not exists ltl_tests_subject_schedule_idx on public.ltl_tests(exam,subject,starts_at);
create index if not exists ltl_test_attempts_user_idx on public.ltl_test_attempts(user_id,test_id);
alter table public.ltl_tests enable row level security;
alter table public.ltl_test_questions enable row level security;
alter table public.ltl_test_attempts enable row level security;

drop policy if exists "published tests visible to signed in users" on public.ltl_tests;
create policy "published tests visible to signed in users" on public.ltl_tests for select to authenticated using(status='published');
drop policy if exists "admins manage tests" on public.ltl_tests;
create policy "admins manage tests" on public.ltl_tests for all to authenticated using(exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin')) with check(exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin'));
drop policy if exists "admins manage test questions" on public.ltl_test_questions;
create policy "admins manage test questions" on public.ltl_test_questions for all to authenticated using(exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin')) with check(exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin'));
drop policy if exists "attempt owners see questions after starting" on public.ltl_test_questions;
create policy "attempt owners see questions after starting" on public.ltl_test_questions for select to authenticated using(exists(select 1 from public.ltl_test_attempts a where a.test_id=ltl_test_questions.test_id and a.user_id=auth.uid() and a.status='in_progress'));
drop policy if exists "users see own attempts" on public.ltl_test_attempts;
create policy "users see own attempts" on public.ltl_test_attempts for select to authenticated using(user_id=auth.uid());
drop policy if exists "users create own attempts" on public.ltl_test_attempts;
create policy "users create own attempts" on public.ltl_test_attempts for insert to authenticated with check(user_id=auth.uid() and status='in_progress' and exists(select 1 from public.ltl_tests t where t.id=test_id and t.status='published' and now()>=t.starts_at));
create or replace view public.ltl_test_questions_public with (security_invoker=true) as
 select id,test_id,position,question,options from public.ltl_test_questions;
grant select on public.ltl_test_questions_public to authenticated;

create or replace function public.ltl_submit_test_attempt(p_attempt_id uuid,p_answers jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare a public.ltl_test_attempts%rowtype; t public.ltl_tests%rowtype; n integer; s integer; deadline timestamptz;
begin
 select * into a from public.ltl_test_attempts where id=p_attempt_id for update;
 if not found or a.user_id<>auth.uid() then raise exception 'Attempt not found'; end if;
 if a.status<>'in_progress' then raise exception 'This test attempt is already closed'; end if;
 select * into t from public.ltl_tests where id=a.test_id;
 deadline:=a.started_at + make_interval(mins=>t.duration_minutes);
 -- The client auto-submits at the deadline; this RPC closes the attempt and scores its final saved answers.
 select count(*),count(*) filter(where (p_answers->>q.id::text) ~ '^[0-3]$' and (p_answers->>q.id::text)::integer=q.correct_option)
 into n,s from public.ltl_test_questions q where q.test_id=a.test_id;
 update public.ltl_test_attempts set status='submitted',submitted_at=now(),answers=coalesce(p_answers,'{}'::jsonb),score=s,total=n where id=a.id;
 return jsonb_build_object('score',s,'total',n);
end; $$;
grant execute on function public.ltl_submit_test_attempt(uuid,jsonb) to authenticated;
