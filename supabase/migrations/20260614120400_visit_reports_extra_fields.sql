-- =====================================================================
-- Add columns to visit_reports that the visit report form already
-- collects but the table is missing:
--  - loved_one_id: needed for the "loved_ones(full_name)" embed used by
--    the family-facing Reports page (PostgREST requires a real FK for
--    embedding)
--  - home_safety_score / medication_notes / home_safety_notes /
--    activity_during_visit / follow_up_needed / follow_up_notes: fields
--    already in the companion's visit report form
--
-- All additions are nullable, so existing rows are unaffected.
--
-- Run via the Supabase SQL Editor or `supabase db push`.
-- Safe to re-run: uses "add column if not exists".
-- =====================================================================

alter table public.visit_reports
  add column if not exists loved_one_id uuid references public.loved_ones(id),
  add column if not exists home_safety_score integer,
  add column if not exists medication_notes text,
  add column if not exists home_safety_notes text,
  add column if not exists activity_during_visit text,
  add column if not exists follow_up_needed boolean,
  add column if not exists follow_up_notes text;

create index if not exists visit_reports_loved_one_id_idx on public.visit_reports(loved_one_id);
