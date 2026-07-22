-- sla-escalation — cron schedule (every 5 minutes).
--
-- ⚠️ LAUNCH-READINESS FINDING (2026-07-20): this job was NOT scheduled in production.
--    Only `check-overdue-bookings` was running. `sla-escalation` is the safety BACKSTOP that,
--    for a member_query:
--      • at 75% of its SLA (escalation_75_sent_at IS NULL) → re-notifies the assigned doctor (or admin)
--      • on breach, or urgent+unassigned >30min (admin_alerted_at IS NULL) → alerts admin AND sends the
--        family an interim "a doctor is reviewing — if urgent call 108" message
--    The IMMEDIATE crisis alert still fires synchronously inside `ask-health` (verified: 3/3 escalations
--    delivered in prod). This backstop catches the cases that alert didn't: a `pending` answer the model
--    failed to produce, or a crisis alert that didn't deliver. At verification time there were 2 queries
--    stuck in `pending` with no backstop follow-up.
--
-- NOT a migration (kept out of supabase/migrations/ on purpose) — schedule it ONCE after deploy.
--
-- EASIEST (recommended): Supabase Dashboard → Database → Cron Jobs → "Create a new cron job":
--   Name:     sla-escalation
--   Schedule: */5 * * * *
--   Type:     Supabase Edge Function → sla-escalation   (the UI injects the service-role auth)
--
-- OR the raw pg_cron + pg_net equivalent below. Requires the service-role key in Vault first
-- (the Vault had no `service_role_key` secret at verification time — add it once):
--   select vault.create_secret('<SERVICE_ROLE_KEY>', 'service_role_key');

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'sla-escalation',
  '*/5 * * * *',
  $$
  select net.http_post(
    url     := 'https://kghwmiriboavmyswcqnr.supabase.co/functions/v1/sla-escalation',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
    ),
    body    := '{}'::jsonb
  );
  $$
);

-- Verify after scheduling:
--   select jobname, schedule, active from cron.job order by jobid;
--   select jobid, status, start_time from cron.job_run_details order by start_time desc limit 10;
-- To change or remove:
--   select cron.unschedule('sla-escalation');
