-- =====================================================================
-- GPS check-in / check-out for companion visits.
--
-- check_in_* is captured when a companion checks in on arrival
-- (booking moves to 'in_progress'); check_out_* is captured when they
-- check out on departure (status stays 'in_progress' until the visit
-- report is submitted, which sets status='completed').
--
-- Run via the Supabase SQL Editor or `supabase db push`.
-- Safe to re-run: all columns use "add column if not exists".
-- =====================================================================

alter table public.bookings
  add column if not exists checked_in_at timestamptz,
  add column if not exists check_in_lat double precision,
  add column if not exists check_in_lng double precision,
  add column if not exists checked_out_at timestamptz,
  add column if not exists check_out_lat double precision,
  add column if not exists check_out_lng double precision;
