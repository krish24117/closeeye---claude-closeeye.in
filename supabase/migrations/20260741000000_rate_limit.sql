-- CloseEye — Layer-1 rate limiting + Layer-2 AI budget (abuse prevention).
--
-- An atomic Postgres token bucket per identifier, and a global daily AI-call counter.
-- The edge middleware (supabase/functions/_shared/ratelimit.ts) FAILS OPEN on any
-- error here, so a problem with these tables can never lock a real family out — the
-- worst case is temporarily un-throttled, which the global budget still caps.
--
-- Tables are RLS-enabled with NO policies: only the SECURITY DEFINER RPCs below can
-- touch them, so the public anon key can rate-limit-check without table access.

create table if not exists public.rate_limit (
  bucket       text primary key,               -- "endpoint:identifier"
  tokens       int  not null,
  window_start timestamptz not null default now()
);
create index if not exists rate_limit_window_idx on public.rate_limit (window_start);

alter table public.rate_limit enable row level security; -- no policies → RPC-only

-- Atomic token bucket: refill by elapsed time, consume one, return the decision.
create or replace function public.rate_limit_hit(p_key text, p_limit int, p_window int)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tokens int;
  v_start  timestamptz;
  v_now    timestamptz := now();
  v_refill int;
begin
  if p_limit <= 0 or p_window <= 0 then
    return json_build_object('allowed', true, 'remaining', p_limit, 'retry_after', 0);
  end if;

  select tokens, window_start into v_tokens, v_start
    from public.rate_limit where bucket = p_key for update;

  if not found then
    insert into public.rate_limit(bucket, tokens, window_start) values (p_key, p_limit - 1, v_now);
    return json_build_object('allowed', true, 'remaining', p_limit - 1, 'retry_after', 0);
  end if;

  -- token-bucket refill proportional to elapsed time
  v_refill := floor(extract(epoch from (v_now - v_start)) * p_limit / p_window)::int;
  if v_refill > 0 then
    v_tokens := least(p_limit, v_tokens + v_refill);
    v_start  := v_now;
  end if;

  if v_tokens <= 0 then
    update public.rate_limit set tokens = v_tokens, window_start = v_start where bucket = p_key;
    return json_build_object('allowed', false, 'remaining', 0,
                             'retry_after', ceil(p_window::numeric / p_limit)::int);
  end if;

  v_tokens := v_tokens - 1;
  update public.rate_limit set tokens = v_tokens, window_start = v_start where bucket = p_key;
  return json_build_object('allowed', true, 'remaining', v_tokens, 'retry_after', 0);
end;
$$;

revoke all on function public.rate_limit_hit(text, int, int) from public;
grant execute on function public.rate_limit_hit(text, int, int) to anon, authenticated, service_role;

-- ── Layer 2: global daily AI-call budget (the cost backstop) ──
create table if not exists public.ai_budget (
  day   date primary key,
  calls int  not null default 0
);
alter table public.ai_budget enable row level security; -- no policies → RPC-only

create or replace function public.ai_budget_hit(p_limit int)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare v_calls int; v_today date := (now() at time zone 'utc')::date;
begin
  insert into public.ai_budget(day, calls) values (v_today, 1)
    on conflict (day) do update set calls = public.ai_budget.calls + 1
    returning calls into v_calls;
  return json_build_object('within_budget', v_calls <= p_limit, 'calls', v_calls);
end;
$$;

revoke all on function public.ai_budget_hit(int) from public;
grant execute on function public.ai_budget_hit(int) to anon, authenticated, service_role;

-- Housekeeping: prune stale rate-limit rows (optional; run from a cron if desired).
create or replace function public.rate_limit_prune()
returns void language sql security definer set search_path = public as $$
  delete from public.rate_limit where window_start < now() - interval '1 day';
$$;
revoke all on function public.rate_limit_prune() from public;
grant execute on function public.rate_limit_prune() to service_role;
