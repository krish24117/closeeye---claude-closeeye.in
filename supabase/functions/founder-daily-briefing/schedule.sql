-- founder-daily-briefing — cron schedule (7:00 AM IST = 01:30 UTC, daily).
--
-- NOT a migration (kept out of supabase/migrations/ on purpose) — run it BY HAND once,
-- AFTER the edge function is deployed and you've tested it manually (see README).
-- Scheduling before the function exists would fire failing HTTP calls.
--
-- EASIEST: use the Supabase Dashboard → Database → Cron Jobs → "Create a new cron job":
--   Name:     founder-daily-briefing
--   Schedule: 30 1 * * *
--   Type:     Supabase Edge Function → founder-daily-briefing  (the UI injects auth)
--
-- OR, the raw pg_cron + pg_net equivalent (requires the pg_cron + pg_net extensions,
-- both available on Supabase). Store the service-role key in Vault rather than pasting
-- it inline. verify_jwt=false means any valid apikey passes the gateway.

-- one-time: enable the extensions (no-op if already on)
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- (recommended) put the service-role key in Vault once:
--   select vault.create_secret('<SERVICE_ROLE_KEY>', 'service_role_key');

select cron.schedule(
  'founder-daily-briefing',
  '30 1 * * *',
  $$
  select net.http_post(
    url     := 'https://kghwmiriboavmyswcqnr.supabase.co/functions/v1/founder-daily-briefing',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
    ),
    body    := '{}'::jsonb
  );
  $$
);

-- To change or remove later:
--   select cron.unschedule('founder-daily-briefing');
--   select * from cron.job;                    -- list jobs
--   select * from cron.job_run_details order by start_time desc limit 10;   -- recent runs
