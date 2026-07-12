-- =====================================================================
-- Founder nurture — auto WhatsApp follow-ups for un-converted registrants.
--
-- A scheduled edge function (founder-nurture-sequences) sends a warm 4-touch sequence
-- (Day 1/3/5/7) to founder registrants who registered but haven't paid, unless the
-- founder has personally reached them recently or paused them. This table records each
-- send so a step never repeats; the paused flag lets the founder opt a lead out.
-- Additive + idempotent. No pricing / payment / positioning logic touched.
-- =====================================================================

create table if not exists public.founder_nurture_log (
  id            uuid primary key default gen_random_uuid(),
  registrant_id uuid not null references auth.users(id) on delete cascade,
  step          integer not null,                 -- 1..4
  template      text,                              -- the template tag/SID used
  status        text not null default 'sent',      -- sent | failed | template_pending
  created_at    timestamptz not null default now()
);

alter table public.founder_nurture_log enable row level security;

-- Admin read for visibility; the edge function inserts with the service role (bypasses RLS).
drop policy if exists "founder_nurture_log: admin read" on public.founder_nurture_log;
create policy "founder_nurture_log: admin read"
  on public.founder_nurture_log for select using (public.is_admin());

create index if not exists founder_nurture_log_reg_idx on public.founder_nurture_log (registrant_id, step);

-- Founder can pause auto-nurture for a specific lead (e.g. they're handling it personally).
alter table public.profiles add column if not exists founder_nurture_paused boolean not null default false;
