-- CloseEye — the record of what the abuse guards would have turned away.
--
-- This table exists to answer ONE question before we ever flip RATE_LIMIT_ENFORCE on:
-- "would these limits have turned away a real family?" console.log can't answer that from
-- inside /admin, so the guards append here — but ONLY when a request would be blocked.
-- Allowed traffic writes nothing, so this table stays small and cheap by construction.
--
-- Privacy: no IP, no email, no phone, no question text, no address. A row records a
-- DECISION (endpoint, tier, reason), never a person. The identifier is the same truncated
-- hash the buckets use — enough to see "one actor, 300 times" without knowing who.

create table if not exists public.rate_limit_events (
  id         bigserial primary key,
  created_at timestamptz not null default now(),
  endpoint   text not null,
  tier       text,                       -- 'guest' | 'signed_in' | null
  reason     text not null,              -- 'rate_limited' | 'bot' | 'ai_budget'
  actor      text,                       -- hashed bucket id, never raw PII
  enforced   boolean not null default false  -- false = log-only (we allowed it anyway)
);

create index if not exists rate_limit_events_created_idx on public.rate_limit_events (created_at desc);
create index if not exists rate_limit_events_endpoint_idx on public.rate_limit_events (endpoint);

alter table public.rate_limit_events enable row level security;

-- Written only by the edge guards (service role bypasses RLS). Read only by admins.
grant select on public.rate_limit_events to authenticated;
drop policy if exists rate_limit_events_admin_read on public.rate_limit_events;
create policy rate_limit_events_admin_read on public.rate_limit_events
  for select to authenticated using (public.is_admin());

-- Housekeeping: these are tuning signal, not records worth keeping. Prune at 90 days.
create or replace function public.rate_limit_events_prune()
returns void language sql security definer set search_path = public as $$
  delete from public.rate_limit_events where created_at < now() - interval '90 days';
$$;
revoke all on function public.rate_limit_events_prune() from public;
grant execute on function public.rate_limit_events_prune() to service_role;
