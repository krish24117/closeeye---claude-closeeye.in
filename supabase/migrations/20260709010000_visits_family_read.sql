-- =====================================================================
-- Module 4 (Guardian) — let families read the visit report for their own visit.
--
-- A Guardian's completed-visit report is a `visits` row (booking_id, one_moment,
-- mood_score, photo_urls, report_text). The existing family read on `visits` is
-- via elder_profiles (elder_id), but the Guardian app writes elder_id = null.
-- So families couldn't see reports for closeeye-next bookings.
--
-- Add a family SELECT policy keyed on the BOOKING → loved_one ownership instead,
-- via a security-definer helper (no RLS recursion). Additive — existing
-- companion/admin policies are unchanged. Visit photos are already family-
-- readable (the visit-photos "read own family" storage policy).
--
-- Run via the Supabase SQL Editor or `supabase db push`. Idempotent.
-- =====================================================================

create or replace function public.is_my_booking(p_booking_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.bookings b
    where b.id = p_booking_id and public.is_my_loved_one(b.loved_one_id)
  );
$$;

grant execute on function public.is_my_booking(uuid) to authenticated, anon;

drop policy if exists "visits: family read via booking" on public.visits;
create policy "visits: family read via booking"
  on public.visits for select
  using (public.is_my_booking(booking_id));
