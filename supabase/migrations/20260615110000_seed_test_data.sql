-- =====================================================================
-- SEED DATA — NEUTRALISED FOR PRODUCTION
--
-- This migration was converted to a no-op on 2026-07-03.
-- The original script created two test auth users:
--   seed-family@closeeye.test
--   seed-companion@closeeye.test
--
-- ACTION REQUIRED (one-time, manual):
--   If this migration was applied before 2026-07-03, those test users
--   may still exist in auth.users. Delete them via:
--   Supabase Dashboard → Authentication → Users → search "closeeye.test"
--
-- The original script has been moved to:
--   scripts/seed_test_data_local_only.sql
--   (safe to run against local Supabase only; never run against production)
-- =====================================================================

-- intentional no-op
select 1;
