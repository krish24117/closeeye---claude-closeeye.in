-- =====================================================================
-- M7 (QA) — idempotency key for subscription.charged.
--
-- The webhook increments invoice_count / total_paid_paise on subscription.charged.
-- Razorpay redelivers webhooks (at-least-once), so without a guard a redelivery
-- double-counts. Store the last applied charge's Razorpay payment id and skip if
-- it repeats. Additive, nullable — no impact on existing rows.
--
-- Run via the Supabase SQL Editor or `supabase db push`. Idempotent.
-- =====================================================================

alter table public.subscriptions
  add column if not exists last_charge_payment_id text;
