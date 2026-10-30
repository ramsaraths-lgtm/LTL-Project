-- LTL Phase 10 Cloudflare AI migration: per-user daily request limit.
-- Run this once in Supabase SQL Editor. It is additive and does not remove Phase 6-9 data.

create table if not exists public.ltl_ai_daily_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  usage_date date not null default (now() at time zone 'utc')::date,
  request_count integer not null default 0 check (request_count >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, usage_date)
);

alter table public.ltl_ai_daily_usage enable row level security;

-- No direct client read/write policies are intentionally provided.
-- The authenticated Edge Function calls this SECURITY DEFINER RPC after validating the JWT.
create or replace function public.consume_ltl_ai_request()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_count integer;
  v_today date := (now() at time zone 'utc')::date;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  insert into public.ltl_ai_daily_usage (user_id, usage_date, request_count, updated_at)
  values (v_user_id, v_today, 1, now())
  on conflict (user_id, usage_date)
  do update set request_count = public.ltl_ai_daily_usage.request_count + 1,
                updated_at = now()
  where public.ltl_ai_daily_usage.request_count < 20
  returning request_count into v_count;

  if v_count is null then
    raise exception 'Daily AI request limit reached';
  end if;

  return v_count;
end;
$$;

revoke all on function public.consume_ltl_ai_request() from public;
grant execute on function public.consume_ltl_ai_request() to authenticated;
revoke all on table public.ltl_ai_daily_usage from anon, authenticated;
