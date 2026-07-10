-- Optional map/pin link for a visit — the most reliable way for a Guardian to
-- find the exact spot without a paid address-autocomplete integration. The family
-- can paste a Google Maps location link; stored WITH the booking. Additive + idempotent.

alter table public.booking_requests
  add column if not exists visit_map_link text;
