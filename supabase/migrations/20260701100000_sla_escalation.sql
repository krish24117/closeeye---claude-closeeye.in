-- SLA + escalation fields for member_queries
-- urgency is auto-set by trigger on INSERT based on question keywords

ALTER TABLE member_queries
  ADD COLUMN IF NOT EXISTS urgency TEXT DEFAULT 'routine' CHECK (urgency IN ('urgent', 'watch', 'routine')),
  ADD COLUMN IF NOT EXISTS sla_deadline TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS escalation_75_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS interim_msg_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS admin_alerted_at TIMESTAMPTZ;

-- Trigger: auto-classify urgency and compute SLA deadline on new queries
CREATE OR REPLACE FUNCTION set_query_sla()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  q TEXT;
BEGIN
  q := lower(coalesce(NEW.question, '') || ' ' || coalesce(NEW.subject_label, ''));

  -- Urgent (2h): active symptoms, vitals, medication concerns
  IF q ~* '(blood pressure|bp reading|blood sugar|blood glucose|glucose level|sugar level|diabete|insulin|medication|medicine|tablet|pill|dosage|dose|vomit|diarrhea|loose motion|fever|tempe?rature|swollen|swelling|severe pain|chest pain|breathing|wheez|cough|dizzy|dizziness|faint|confusion|weakness|vital sign|pulse rate|heart rate|spo2|oxygen level|wound|bleed|infection|rash|allerg|nausea|headache|constipat|urin|stool|unconscious)' THEN
    NEW.urgency := 'urgent';
    NEW.sla_deadline := coalesce(NEW.created_at, now()) + INTERVAL '2 hours';

  -- Watch (12h): chronic management, test results, diet and lifestyle
  ELSIF q ~* '(blood test|lab report|lab result|test result|ecg|echo|ultrasound|scan|x.?ray|follow.?up|diet|nutrition|weight|exercise|sleep disorder|memory|dementia|alzheimer|parkinson|arthritis|osteopor|kidney|liver|thyroid|cholesterol|monitor|manage|checkup|checkup|appointment|vitamin|supplement|physiotherapy|rehab)' THEN
    NEW.urgency := 'watch';
    NEW.sla_deadline := coalesce(NEW.created_at, now()) + INTERVAL '12 hours';

  -- Routine (24h): general / informational questions
  ELSE
    NEW.urgency := 'routine';
    NEW.sla_deadline := coalesce(NEW.created_at, now()) + INTERVAL '24 hours';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_set_query_sla ON member_queries;
CREATE TRIGGER trigger_set_query_sla
  BEFORE INSERT ON member_queries
  FOR EACH ROW EXECUTE FUNCTION set_query_sla();

-- Backfill existing queries — default to routine/24h
UPDATE member_queries
SET
  urgency = 'routine',
  sla_deadline = created_at + INTERVAL '24 hours'
WHERE sla_deadline IS NULL;

-- Schedule escalation check every 5 minutes (requires pg_cron + pg_net enabled in Supabase dashboard)
-- Replace 'YOUR_PROJECT_REF' and 'YOUR_SERVICE_ROLE_KEY' before enabling.
-- You can also schedule directly from the Supabase dashboard → Edge Functions → Schedule.
--
-- SELECT cron.schedule(
--   'sla-escalation',
--   '*/5 * * * *',
--   $$
--     SELECT net.http_post(
--       url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/sla-escalation',
--       headers := '{"Content-Type":"application/json","Authorization":"Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb,
--       body := '{}'::jsonb
--     )
--   $$
-- );
