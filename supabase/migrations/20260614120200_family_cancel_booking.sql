-- =====================================================================
-- Allow a family user to cancel their own pending/confirmed booking.
--
-- Additive to "Bookings: companion update own" — multiple permissive
-- UPDATE policies are combined with OR, so this does not loosen the
-- existing companion/admin update policy.
--
-- Run via the Supabase SQL Editor or `supabase db push`.
-- Safe to re-run: the policy is dropped and recreated before being added.
-- =====================================================================

drop policy if exists "Bookings: family cancel own" on public.bookings;
create policy "Bookings: family cancel own"
  on public.bookings for update
  using (
    status in ('pending','confirmed')
    and exists (
      select 1 from public.loved_ones lo
      where lo.id = bookings.loved_one_id and lo.family_user_id = auth.uid()
    )
  )
  with check (
    status = 'cancelled'
    and exists (
      select 1 from public.loved_ones lo
      where lo.id = bookings.loved_one_id and lo.family_user_id = auth.uid()
    )
  );
