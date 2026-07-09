-- =====================================================================
-- M9 (QA) — finish applying the Presence-Manager gate to family-owned tables.
--
-- The permission model added can_manage_family()/can_access_loved_one() but only
-- wired them into messages/loved_ones/profiles. A PM could not read an assigned
-- family's bookings/visits/billing — which the Presence Manager App needs.
--
-- These are ADDITIVE, brand-new SELECT policies (Postgres OR-combines permissive
-- policies), so NO existing user loses access: family users still match their
-- own-read policies, Super Admins still match is_admin(), and a PM now also
-- matches for their assigned families. can_manage_family already includes
-- is_admin(), and can_access_loved_one composes family owner / admin / assigned
-- companion / assigned PM — this is where that primitive becomes live.
--
-- Run via the Supabase SQL Editor or `supabase db push`. Idempotent.
-- =====================================================================

-- user_id-scoped tables → can_manage_family(user_id)
drop policy if exists "booking_requests: manager read" on public.booking_requests;
create policy "booking_requests: manager read"
  on public.booking_requests for select using (public.can_manage_family(user_id));

drop policy if exists "subscriptions: manager read" on public.subscriptions;
create policy "subscriptions: manager read"
  on public.subscriptions for select using (public.can_manage_family(user_id));

drop policy if exists "memberships: manager read" on public.memberships;
create policy "memberships: manager read"
  on public.memberships for select using (public.can_manage_family(user_id));

drop policy if exists "notifications: manager read" on public.notifications;
create policy "notifications: manager read"
  on public.notifications for select using (public.can_manage_family(user_id));

drop policy if exists "family_members: manager read" on public.family_members;
create policy "family_members: manager read"
  on public.family_members for select using (public.can_manage_family(family_user_id));

-- loved_one-scoped tables → can_access_loved_one(loved_one_id)
drop policy if exists "bookings: manager read" on public.bookings;
create policy "bookings: manager read"
  on public.bookings for select using (public.can_access_loved_one(loved_one_id));

drop policy if exists "visit_reports: manager read" on public.visit_reports;
create policy "visit_reports: manager read"
  on public.visit_reports for select using (public.can_access_loved_one(loved_one_id));
