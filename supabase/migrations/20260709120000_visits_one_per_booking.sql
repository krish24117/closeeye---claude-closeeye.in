-- =====================================================================
-- Module 4 (Guardian) — one visit report per booking.
--
-- Completion (`submitVisitReport`) inserted a `visits` row with no guard, so a
-- Guardian who re-opened a completed visit and finished again wrote a DUPLICATE
-- report and re-fired the family's WhatsApp + email (findings H-1 / M-1).
--
-- Enforce a single report per booking. A plain unique index on a nullable column
-- treats NULLs as DISTINCT in Postgres, so bridge/legacy rows with
-- booking_id IS NULL are unaffected — only real bookings are constrained.
-- The client then upserts on booking_id, making re-completion idempotent
-- (updates the same row) instead of duplicating.
--
-- Idempotent. Run via the Supabase SQL Editor or `supabase db push`.
-- =====================================================================

-- 1. De-duplicate any existing reports that share a booking_id (keep the newest).
delete from public.visits v
using public.visits w
where v.booking_id is not null
  and v.booking_id = w.booking_id
  and v.created_at < w.created_at;

-- Tie-break for identical created_at (keep the greatest id).
delete from public.visits v
using public.visits w
where v.booking_id is not null
  and v.booking_id = w.booking_id
  and v.created_at = w.created_at
  and v.id < w.id;

-- 2. Enforce one report per booking (NULLs remain distinct → bridge rows are fine).
create unique index if not exists visits_booking_id_key
  on public.visits (booking_id);
