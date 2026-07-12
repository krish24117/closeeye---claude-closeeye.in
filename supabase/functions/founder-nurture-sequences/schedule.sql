-- founder-nurture-sequences — cron schedule (10:00 AM IST = 04:30 UTC, daily).
--
-- NOT a migration (kept out of supabase/migrations/) — run BY HAND once, AFTER the
-- edge function is deployed AND at least one FOUNDER_NURTURE_n_SID secret is set.
-- Runs after the 7am briefing so the founder works hot leads first; auto-nurture then
-- picks up the ones they didn't reach.
--
-- EASIEST: Supabase Dashboard → Database → Cron Jobs → Create:
--   Name:     founder-nurture-sequences
--   Schedule: 30 4 * * *
--   Type:     Supabase Edge Function → founder-nurture-sequences
--
-- OR raw pg_cron + pg_net (service-role key from Vault, as in the briefing schedule):
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'founder-nurture-sequences',
  '30 4 * * *',
  $$
  select net.http_post(
    url     := 'https://kghwmiriboavmyswcqnr.supabase.co/functions/v1/founder-nurture-sequences',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
    ),
    body    := '{}'::jsonb
  );
  $$
);

-- select cron.unschedule('founder-nurture-sequences');
-- select * from cron.job_run_details order by start_time desc limit 10;
