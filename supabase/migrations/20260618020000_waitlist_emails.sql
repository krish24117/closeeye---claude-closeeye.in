-- Migration: waitlist_emails table for lead-magnet email captures
-- (e.g. "Get the Free NRI Family Care Checklist" homepage form)
-- Distinct from the `waitlist` table, which captures full signup leads with
-- name/country/city/urgency. This table is a lightweight email-only capture.
-- Idempotent: all statements use IF NOT EXISTS / DROP IF EXISTS

CREATE TABLE IF NOT EXISTS public.waitlist_emails (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email       text NOT NULL UNIQUE,
  source      text NOT NULL DEFAULT 'nri_checklist',
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.waitlist_emails ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Waitlist emails: public insert" ON public.waitlist_emails;
CREATE POLICY "Waitlist emails: public insert"
  ON public.waitlist_emails FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Waitlist emails: admin read" ON public.waitlist_emails;
CREATE POLICY "Waitlist emails: admin read"
  ON public.waitlist_emails FOR SELECT
  USING (public.is_admin());
