-- Migration: consultation_requests and custom_care_requests tables
-- Idempotent: all statements use IF NOT EXISTS / DROP IF EXISTS

-- ─── consultation_requests ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.consultation_requests (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name        text NOT NULL,
  email            text NOT NULL,
  whatsapp_number  text NOT NULL,
  country          text NOT NULL,
  parent_city      text NOT NULL,
  best_time        text NOT NULL,
  note             text,
  status           text NOT NULL DEFAULT 'new',
  created_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.consultation_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin read" ON public.consultation_requests;
CREATE POLICY "admin read"
  ON public.consultation_requests
  FOR SELECT
  USING (public.is_admin());

-- ─── custom_care_requests ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.custom_care_requests (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name        text NOT NULL,
  email            text NOT NULL,
  whatsapp_number  text NOT NULL,
  country          text NOT NULL,
  parent_city      text NOT NULL,
  people_count     integer,
  care_types       text[] NOT NULL DEFAULT '{}',
  situation        text,
  urgency          text,
  budget_range     text,
  status           text NOT NULL DEFAULT 'new',
  created_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.custom_care_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin read" ON public.custom_care_requests;
CREATE POLICY "admin read"
  ON public.custom_care_requests
  FOR SELECT
  USING (public.is_admin());
