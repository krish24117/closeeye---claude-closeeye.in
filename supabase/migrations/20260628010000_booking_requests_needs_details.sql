-- =====================================================================
-- Add 'needs_details' to booking_requests.status.
-- Used when a booking is saved but recipient_address or
-- requester_whatsapp was blank — ops must not dispatch a companion
-- until those fields are populated.
-- Idempotent.
-- =====================================================================

alter table public.booking_requests
  drop constraint if exists booking_requests_status_check;

alter table public.booking_requests
  add constraint booking_requests_status_check
  check (status in ('requested', 'needs_details', 'confirmed', 'scheduled', 'cancelled'));
