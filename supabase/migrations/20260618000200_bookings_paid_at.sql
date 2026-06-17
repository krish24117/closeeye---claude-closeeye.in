-- Stamp paid_at when a booking's payment is confirmed
alter table public.bookings
  add column if not exists paid_at timestamptz;
