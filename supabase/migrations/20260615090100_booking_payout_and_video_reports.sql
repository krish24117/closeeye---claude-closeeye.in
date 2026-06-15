-- =====================================================================
-- Add columns for the admin/companion dashboard expansion:
--  - bookings.companion_payout_paise: nullable, set manually by an admin
--    on the Admin Bookings page (no auto-calculation). Used by the
--    companion Earnings page to total completed-visit payouts.
--  - visit_reports.video_urls: storage paths for visit videos, parallel
--    to the existing photo_urls (text[] of private "visit-videos" bucket
--    object paths).
--
-- Both additions are nullable, so existing rows are unaffected.
--
-- Run via the Supabase SQL Editor or `supabase db push`.
-- Safe to re-run: uses "add column if not exists".
-- =====================================================================

alter table public.bookings
  add column if not exists companion_payout_paise integer;

alter table public.visit_reports
  add column if not exists video_urls text[];
