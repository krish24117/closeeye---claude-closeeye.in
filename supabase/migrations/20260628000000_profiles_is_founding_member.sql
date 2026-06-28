-- =====================================================================
-- Add is_founding_member flag to profiles.
-- Boolean, not null, default false.
-- Existing rows automatically get false (safe for all user types).
-- Idempotent.
-- =====================================================================

alter table public.profiles
  add column if not exists is_founding_member boolean not null default false;
