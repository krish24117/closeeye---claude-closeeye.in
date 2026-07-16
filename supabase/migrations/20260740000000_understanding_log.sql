-- CloseEye Connect — the understanding learning loop.
--
-- Every clarification, human handoff, and user "not right" flag from the /connect
-- experience is appended here, so we can measure understanding quality and turn real
-- failures into regression tests. It is WRITE-ONLY for visitors (append their own
-- events, never read) and admin-only to read + triage.
--
-- Privacy: raw_text can contain family details. It is readable only by admins
-- (public.is_admin()) and exists to improve understanding + seed regression tests.

create table if not exists public.understanding_log (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  session_id  text not null,
  event       text not null check (event in ('first','clarify','handoff','flag')),
  raw_text    text not null,
  understood  jsonb not null default '{}'::jsonb,  -- {subjectKind, subjectKnown, need, forLoved, city}
  again_count int  not null default 0,
  reviewed    boolean not null default false,      -- an admin has triaged this row
  expected    text                                 -- what it SHOULD have understood → seeds a regression test
);

create index if not exists understanding_log_created_idx on public.understanding_log (created_at desc);
create index if not exists understanding_log_session_idx on public.understanding_log (session_id);
create index if not exists understanding_log_event_idx   on public.understanding_log (event);

alter table public.understanding_log enable row level security;

-- Visitors (anon + signed-in) may only APPEND — never read. A single write-only log.
grant insert on public.understanding_log to anon, authenticated;
drop policy if exists understanding_log_insert on public.understanding_log;
create policy understanding_log_insert on public.understanding_log
  for insert to anon, authenticated with check (true);

-- Only admins read + triage (mark reviewed, note the expected understanding).
grant select, update on public.understanding_log to authenticated;
drop policy if exists understanding_log_admin_read on public.understanding_log;
create policy understanding_log_admin_read on public.understanding_log
  for select to authenticated using (public.is_admin());
drop policy if exists understanding_log_admin_update on public.understanding_log;
create policy understanding_log_admin_update on public.understanding_log
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- A tidy weekly-metrics view for review (last 12 weeks). first-try understood %,
-- resolved-after-clarify %, handoff %, and user-flagged-wrong count — per ISO week.
create or replace view public.understanding_weekly with (security_invoker = true) as
with sessions as (
  select
    session_id,
    date_trunc('week', min(created_at))                            as week,
    bool_or(event = 'first'  and (understood->>'subjectKnown')::boolean) as first_understood,
    bool_or(event = 'clarify')                                     as clarified,
    bool_or(event = 'handoff')                                     as handed_off,
    bool_or((understood->>'subjectKnown')::boolean)                as ever_understood,
    count(*) filter (where event = 'flag')                         as flags
  from public.understanding_log
  group by session_id
)
select
  week,
  count(*)                                                                        as sessions,
  round(100.0 * count(*) filter (where first_understood) / nullif(count(*),0), 1) as first_try_pct,
  round(100.0 * count(*) filter (where clarified and ever_understood)
        / nullif(count(*) filter (where clarified), 0), 1)                        as resolved_after_clarify_pct,
  round(100.0 * count(*) filter (where handed_off) / nullif(count(*),0), 1)       as handoff_pct,
  sum(flags)                                                                      as flagged_wrong
from sessions
where week >= date_trunc('week', now()) - interval '12 weeks'
group by week
order by week desc;

grant select on public.understanding_weekly to authenticated;
