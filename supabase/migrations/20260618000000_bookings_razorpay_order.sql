-- Add Razorpay order/payment IDs to bookings for Standard Checkout tracking
alter table public.bookings
  add column if not exists razorpay_order_id   text,
  add column if not exists razorpay_payment_id text;
