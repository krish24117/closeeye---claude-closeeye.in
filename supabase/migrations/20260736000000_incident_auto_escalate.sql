-- Escalation Matrix, Phase 3 — auto-escalation of UNACKNOWLEDGED emergencies.
--
-- A red-flag incident can be delivered to the care team yet still sit un-owned. The
-- sla-escalation cron now watches for open incidents (escalated, not resolved) that
-- nobody has acknowledged within a short window, and WIDENS the alert to an escalation
-- contact — so a life-safety alert is never silently dropped.
--
-- This column records that we widened, so the cron fires the widen exactly ONCE per
-- incident rather than every 5-minute pass. Idempotent.
alter table public.member_queries
  add column if not exists escalation_widened_at timestamptz;
