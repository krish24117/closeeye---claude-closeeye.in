-- Founder Program — pre-launch registration marker (Phase 3).
--
-- The DURABLE authority for the Founder Funnel gate (Mandatory Change #1): a
-- family who registered before launch via /f/<ref> → /founder/*. Unlike the
-- fragile localStorage session hint, this survives a cleared browser, private
-- mode and a device switch, and is queryable for the Founder Activation
-- Dashboard (Phase 4: total registrations, Connect vs Care, etc.).
--
-- Intentionally NOT `is_founding_member` (migration 20260628) — that flag means
-- "paid the legacy ₹100 founding membership" and carries `founding_number` /
-- `founding_date`. Overloading it would conflate a PAID legacy cohort with the
-- new no-payment pre-launch cohort. A dedicated column keeps both truthful.
--
-- Setting founder_prelaunch = true only ever WITHHOLDS payment/booking during
-- pre-launch (the family cannot pay yet) — it grants nothing — so the existing
-- "Profiles: update own" RLS is a safe write path (no new policy needed).
-- Idempotent: IF NOT EXISTS throughout.

alter table public.profiles
  add column if not exists founder_prelaunch      boolean not null default false,
  add column if not exists founder_ref            text,
  add column if not exists founder_registered_at  timestamptz,
  add column if not exists founder_service_area    text;

comment on column public.profiles.founder_prelaunch is
  'True = registered via the Founder Program before launch (no payment taken). Durable authority for the pre-launch funnel gate; distinct from is_founding_member (paid ₹100 legacy cohort).';
comment on column public.profiles.founder_ref is
  'Attribution id from the founder landing /f/<ref> that led to this registration.';
comment on column public.profiles.founder_registered_at is
  'When the family completed pre-launch Founder registration.';
comment on column public.profiles.founder_service_area is
  'Service area confirmed at registration (currently always Hyderabad — outside-area families go to the waitlist instead).';
