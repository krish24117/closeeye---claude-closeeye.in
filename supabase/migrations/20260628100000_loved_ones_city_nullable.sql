-- loved_ones.city was created NOT NULL with no default.
-- The onboarding form captures a full address (street + city) in the `address`
-- column and has no separate city field, so every new insert was failing with:
--   ERROR: null value in column "city" violates not-null constraint
-- City is used by ops for companion matching; making it nullable lets the insert
-- succeed — ops can fill it in from the address before the first visit.

ALTER TABLE public.loved_ones ALTER COLUMN city DROP NOT NULL;
