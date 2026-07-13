-- Emergency backstop for the AI queue (CloseEye Connect, Pillar 3).
--
-- A deterministically red-flagged query must NEVER sit in the 24h "routine" SLA queue
-- if the real-time WhatsApp alert fails. The urgency trigger classified "collapsed" /
-- "stroke" / "seizure" / "overdose" / "passed out" as ROUTINE (24h) because those words
-- weren't in its keyword list. This adds an EMERGENCY branch (checked FIRST) that gives
-- the deterministic red-flag phrases a 30-minute SLA — the fastest DB backstop.
--
-- Stays within the existing urgency enum ('urgent') so no UI, and no downstream
-- (sla-escalation cron, which escalates on sla_deadline), needs any change. Recreates
-- the function only; the BEFORE INSERT trigger is unchanged. Idempotent.
CREATE OR REPLACE FUNCTION set_query_sla()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  q TEXT;
BEGIN
  q := lower(coalesce(NEW.question, '') || ' ' || coalesce(NEW.subject_label, ''));

  -- Emergency (30min): the deterministic red-flag set — kept in sync with the safety
  -- floor in functions/ask-health/redflags.ts. Checked first; fastest backstop.
  IF q ~* '(not breathing|stopped breathing|no longer breathing|can.?t breathe|cannot breathe|chest pain|heart attack|collaps|passed out|unconscious|unresponsive|not responding|won.?t wake|stroke|seizure|convuls|choking|suffocat|overdose|took too many|suicid|self.?harm|anaphylax|severe allergic|had a fall|fell down|slipped on|hit .{0,20}head|bleeding from|won.?t stop bleeding|vomiting blood)' THEN
    NEW.urgency := 'urgent';
    NEW.sla_deadline := coalesce(NEW.created_at, now()) + INTERVAL '30 minutes';

  -- Urgent (2h): active symptoms, vitals, medication concerns
  ELSIF q ~* '(blood pressure|bp reading|blood sugar|blood glucose|glucose level|sugar level|diabete|insulin|medication|medicine|tablet|pill|dosage|dose|vomit|diarrhea|loose motion|fever|tempe?rature|swollen|swelling|severe pain|chest pain|breathing|wheez|cough|dizzy|dizziness|faint|confusion|weakness|vital sign|pulse rate|heart rate|spo2|oxygen level|wound|bleed|infection|rash|allerg|nausea|headache|constipat|urin|stool|unconscious)' THEN
    NEW.urgency := 'urgent';
    NEW.sla_deadline := coalesce(NEW.created_at, now()) + INTERVAL '2 hours';

  -- Watch (12h): chronic management, test results, diet and lifestyle
  ELSIF q ~* '(blood test|lab report|lab result|test result|ecg|echo|ultrasound|scan|x.?ray|follow.?up|diet|nutrition|weight|exercise|sleep disorder|memory|dementia|alzheimer|parkinson|arthritis|osteopor|kidney|liver|thyroid|cholesterol|monitor|manage|checkup|appointment|vitamin|supplement|physiotherapy|rehab)' THEN
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
