-- =====================================================================
-- H2 (QA) — link a visit request to a specific family member.
--
-- booking_requests previously stored only recipient_name/address free-text, so
-- visits could not be tied to a loved_one (blocking per-member visit history and
-- "message about this visit"). Add the FK + supporting indexes. Additive; the
-- column is nullable (existing rows and guest requests keep working).
--
-- Run via the Supabase SQL Editor or `supabase db push`. Idempotent.
-- =====================================================================

alter table public.booking_requests
  add column if not exists loved_one_id uuid references public.loved_ones(id) on delete set null;

create index if not exists booking_requests_loved_one_id_idx on public.booking_requests(loved_one_id);
create index if not exists booking_requests_user_id_idx on public.booking_requests(user_id);
