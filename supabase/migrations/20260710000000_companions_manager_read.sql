-- =====================================================================
-- Module 5 (Presence Manager Console) — Care Team visibility for PMs.
--
-- `companions` RLS is admin/own-only, so a Presence Manager could not read the
-- Guardians assigned to their families' visits: Guardian NAMES were blank on the
-- console schedule / calendar, and the Care Team directory was empty for a PM.
--
-- ADDITIVE SELECT policy (Postgres OR-combines permissive policies — no existing
-- user loses access; Super Admins already read all via admin_all_*): a staff
-- member may read a companion IF that companion has a booking with a loved one
-- they can access. can_access_loved_one() already composes is_admin / family
-- owner / assigned companion / assigned PM, so this scopes a PM to exactly the
-- Guardians who serve their assigned families.
--
-- Run via the Supabase SQL Editor or `supabase db push`. Idempotent.
-- =====================================================================

drop policy if exists "companions: manager read" on public.companions;
create policy "companions: manager read"
  on public.companions for select
  using (
    exists (
      select 1 from public.bookings b
      where b.companion_id = companions.id
        and public.can_access_loved_one(b.loved_one_id)
    )
  );
