-- =====================================================================
-- Visit history, family reports, and minimum-duration support
--
--   1. report_text        — the WhatsApp report text generated at visit
--                            completion, persisted so it can be shown in
--                            companion history and family reports.
--   2. short_visit_reason — reason logged when a visit is completed under
--                            the recommended 30-minute minimum.
--   3. RLS so the family can read visits for their loved one even when no
--      elder_profile is linked (joins through the booking), and so an
--      assigned companion can read prior visits for the same elder (by any
--      companion) to power "Previous visits with <Name>".
--
-- Idempotent: column adds use IF NOT EXISTS, policies are dropped first.
-- Multiple permissive SELECT policies OR together, so these are additive.
-- =====================================================================

alter table public.visits add column if not exists report_text text;
alter table public.visits add column if not exists short_visit_reason text;

-- Family can read visits for their loved one through the booking link
drop policy if exists "family_read_visits_via_booking" on public.visits;
create policy "family_read_visits_via_booking"
  on public.visits for select
  using (
    exists (
      select 1 from public.bookings b
      join public.loved_ones lo on lo.id = b.loved_one_id
      where b.id = visits.booking_id
        and lo.family_user_id = auth.uid()
    )
  );

-- An assigned companion can read all prior visits for the same elder
-- (powers the "Previous visits with <Name>" list in the visit briefing)
drop policy if exists "companion_read_assigned_elder_visits" on public.visits;
create policy "companion_read_assigned_elder_visits"
  on public.visits for select
  using (
    exists (
      select 1 from public.elder_profiles ep
      join public.bookings b on b.loved_one_id = ep.loved_one_id
      where ep.id = visits.elder_id
        and b.companion_id = auth.uid()
    )
  );
