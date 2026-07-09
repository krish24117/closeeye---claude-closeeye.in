-- =====================================================================
-- Module 5 (Presence Manager Console) — finish the PM read gates.
--
-- 20260708050000_pm_scope_family_tables wired can_manage_family/
-- can_access_loved_one into booking_requests / subscriptions / memberships /
-- notifications / family_members / bookings / visit_reports. The Presence
-- Console also needs to read the completed-visit REPORTS (`visits`), the care
-- brief (`elder_profiles`) and urgent Ask CloseEye questions (`member_queries`)
-- for an assigned family — today those are Super-Admin-only.
--
-- These are ADDITIVE, brand-new SELECT policies (Postgres OR-combines permissive
-- policies), so NO existing user loses access: families still match their own
-- policies, Super Admins still match is_admin(), companions still match theirs,
-- and a Presence Manager now also matches for their assigned families. This is
-- what lights up completed reports + red emergencies in the console for real
-- Presence Manager accounts (Super Admins already see them via is_admin()).
--
-- Run via the Supabase SQL Editor or `supabase db push`. Idempotent.
-- =====================================================================

-- loved_one-scoped: elder_profiles has loved_one_id directly.
drop policy if exists "elder_profiles: manager read" on public.elder_profiles;
create policy "elder_profiles: manager read"
  on public.elder_profiles for select
  using (public.can_access_loved_one(loved_one_id));

-- visits reference elder_profiles(id) via elder_id → resolve to the loved one.
drop policy if exists "visits: manager read" on public.visits;
create policy "visits: manager read"
  on public.visits for select
  using (
    exists (
      select 1 from public.elder_profiles ep
      where ep.id = visits.elder_id
        and public.can_access_loved_one(ep.loved_one_id)
    )
  );

-- user_id-scoped: member_queries (Ask CloseEye history) → the family account.
drop policy if exists "member_queries: manager read" on public.member_queries;
create policy "member_queries: manager read"
  on public.member_queries for select
  using (public.can_manage_family(user_id));
