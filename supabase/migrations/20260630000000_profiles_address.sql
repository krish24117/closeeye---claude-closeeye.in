-- Add address column to profiles (NRI's home-country address, captured at onboarding).
-- Idempotent.

alter table public.profiles
  add column if not exists address text;
