-- Add photo_consent flag to elder_profiles.
-- When false (default), the companion's visit photo must NOT be sent to family
-- over WhatsApp, even if one was taken.
-- Families opt in via the dashboard Profile page.

alter table public.elder_profiles
  add column if not exists photo_consent boolean not null default false;
