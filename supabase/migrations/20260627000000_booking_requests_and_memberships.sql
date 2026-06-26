-- =====================================================================
-- /services rebuild: one-off booking REQUESTS (request -> confirm -> pay)
-- and founding MEMBERSHIPS (one-time ₹100). All writes happen via edge
-- functions using the service role, so RLS only needs read policies.
-- Idempotent.
-- =====================================================================

-- ── booking_requests ─────────────────────────────────────────────────
-- An unpaid request captured by the BookingDrawer. Ops confirm a companion
-- is available, then send a payment link. No charge is taken at request time.
create table if not exists public.booking_requests (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid references auth.users(id) on delete set null,
  service_id          text not null,
  service_name        text not null,
  variant_id          text,
  amount_paise        int,
  scheduled_at        timestamptz,
  recipient_name      text not null,
  recipient_address   text not null,
  requester_whatsapp  text not null,
  notes               text,
  status              text not null default 'requested'
                        check (status in ('requested','confirmed','scheduled','cancelled')),
  created_at          timestamptz not null default now()
);

alter table public.booking_requests enable row level security;

drop policy if exists "booking_requests: admin read" on public.booking_requests;
create policy "booking_requests: admin read"
  on public.booking_requests for select using (public.is_admin());

drop policy if exists "booking_requests: own read" on public.booking_requests;
create policy "booking_requests: own read"
  on public.booking_requests for select using (auth.uid() = user_id);

-- ── memberships ──────────────────────────────────────────────────────
-- One-time ₹100 founding membership. Marked 'active' ONLY after server-side
-- Razorpay signature verification (see razorpay-verify-membership).
create table if not exists public.memberships (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  amount_paise        int not null,
  status              text not null default 'pending'
                        check (status in ('pending','active','failed')),
  razorpay_order_id   text,
  razorpay_payment_id text,
  created_at          timestamptz not null default now(),
  activated_at        timestamptz
);

alter table public.memberships enable row level security;

drop policy if exists "memberships: own read" on public.memberships;
create policy "memberships: own read"
  on public.memberships for select using (auth.uid() = user_id);

drop policy if exists "memberships: admin read" on public.memberships;
create policy "memberships: admin read"
  on public.memberships for select using (public.is_admin());
