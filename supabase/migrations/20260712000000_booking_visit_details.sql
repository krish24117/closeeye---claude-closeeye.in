-- ─────────────────────────────────────────────────────────────────────────────
-- Visit details captured at booking time.
--
-- Trust-first correction: a family must review + provide the logistics for THIS
-- specific visit (address, on-site contact, timing, access) before a booking is
-- confirmed. These live WITH the booking record (booking_requests) and are kept
-- SEPARATE from the loved one's durable profile — the profile is only updated if
-- the family explicitly opts in on the client.
--
-- Reuses existing per-booking columns for address / date / booker contact
-- (recipient_address, scheduled_at, requester_whatsapp) and adds the rest.
-- Additive + idempotent — no change to existing bookings or the current flow.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.booking_requests
  add column if not exists visit_landmark             text,
  add column if not exists visit_contact_name         text,
  add column if not exists visit_contact_phone        text,
  add column if not exists visit_time_window          text,
  add column if not exists visit_special_instructions text,
  add column if not exists visit_access_instructions  text,
  add column if not exists visit_team_notes           text;
