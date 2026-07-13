-- Emergency incident audit + SLA de-dup (CloseEye Connect, Pillar 3 — Emergency
-- Coordination).
--
-- When Ask CloseEye detects a red-flag emergency it alerts the care team in real time,
-- but it never recorded that on the query row. Two consequences:
--   1. No incident audit trail — you can't see, after the fact, that a query escalated,
--      what category, and whether the team was actually reached.
--   2. The sla-escalation cron only skips rows whose admin_alerted_at is set. The
--      red-flag path never set it, so the cron fired a SECOND, redundant "SLA breached"
--      alert ~30 min later (and a confusing "a doctor is reviewing" note to the family
--      that had just been told to call 108).
--
-- These additive, nullable columns let ask-health record the incident and — ONLY when
-- the real-time alert actually delivered — mark it alerted so the cron de-dupes. If the
-- alert did NOT deliver, admin_alerted_at is left null on purpose, so the cron still
-- runs as the backstop. No enum/CHECK changes, so nothing downstream needs to change.
alter table public.member_queries
  add column if not exists escalated_at         timestamptz,
  add column if not exists escalation_category  text,
  add column if not exists escalation_delivered boolean;

-- Fast lookup for an "open incidents" view (the audit trail).
create index if not exists member_queries_escalated_idx
  on public.member_queries (escalated_at desc)
  where escalated_at is not null;
