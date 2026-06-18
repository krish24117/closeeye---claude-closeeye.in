-- Migration: add relationship column to loved_ones
-- Used by the inline "Add a new family member" form on the Book a Visit page
-- (Mother / Father / Grandmother / Grandfather / Other). Nullable since
-- existing rows predate this field.

ALTER TABLE public.loved_ones ADD COLUMN IF NOT EXISTS relationship text;
