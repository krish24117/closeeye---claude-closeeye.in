-- Add status + admin_notes to waitlist, consultation_requests, survey_responses
-- and ensure admin can read + update all three.

-- ── waitlist ─────────────────────────────────────────────────────────────────

ALTER TABLE public.waitlist ADD COLUMN IF NOT EXISTS status       text NOT NULL DEFAULT 'new';
ALTER TABLE public.waitlist ADD COLUMN IF NOT EXISTS admin_notes  text;

-- admin read (in case no policy exists yet)
DROP POLICY IF EXISTS "admin_read_waitlist"   ON public.waitlist;
CREATE POLICY "admin_read_waitlist"
  ON public.waitlist FOR SELECT
  USING (exists (
    select 1 from public.profiles
    where profiles.id = auth.uid() and profiles.role = 'admin'
  ));

DROP POLICY IF EXISTS "admin_update_waitlist" ON public.waitlist;
CREATE POLICY "admin_update_waitlist"
  ON public.waitlist FOR UPDATE
  USING (exists (
    select 1 from public.profiles
    where profiles.id = auth.uid() and profiles.role = 'admin'
  ));

-- ── consultation_requests ─────────────────────────────────────────────────────
-- status column already exists; just add admin_notes

ALTER TABLE public.consultation_requests ADD COLUMN IF NOT EXISTS admin_notes text;

DROP POLICY IF EXISTS "admin_update_consultation_requests" ON public.consultation_requests;
CREATE POLICY "admin_update_consultation_requests"
  ON public.consultation_requests FOR UPDATE
  USING (public.is_admin());

-- ── survey_responses ──────────────────────────────────────────────────────────

ALTER TABLE public.survey_responses ADD COLUMN IF NOT EXISTS status      text NOT NULL DEFAULT 'new';
ALTER TABLE public.survey_responses ADD COLUMN IF NOT EXISTS admin_notes text;

DROP POLICY IF EXISTS "admin_update_survey_responses" ON public.survey_responses;
CREATE POLICY "admin_update_survey_responses"
  ON public.survey_responses FOR UPDATE
  USING (exists (
    select 1 from public.profiles
    where profiles.id = auth.uid() and profiles.role = 'admin'
  ));
