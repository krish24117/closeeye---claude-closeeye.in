-- Add payment + companion-confirmation columns to booking_requests.
-- Extends the status constraint with companion_confirmed and paid.

alter table public.booking_requests
  add column if not exists companion_name      text,
  add column if not exists confirmed_at        timestamptz,
  add column if not exists razorpay_order_id   text,
  add column if not exists razorpay_payment_id text,
  add column if not exists payment_status      text not null default 'unpaid',
  add column if not exists paid_at             timestamptz;

-- Extend status constraint (keep existing values for backward-compat)
alter table public.booking_requests
  drop constraint if exists booking_requests_status_check;

alter table public.booking_requests
  add constraint booking_requests_status_check
  check (status in (
    'requested',
    'needs_details',
    'confirmed',
    'scheduled',
    'companion_confirmed',
    'paid',
    'cancelled'
  ));
