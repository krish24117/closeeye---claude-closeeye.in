-- =====================================================================
-- Module 4/5 — Guardian assignment from the Presence Console.
--
-- Staff assign a Guardian to a paid, unassigned visit (bookings.companion_id +
-- status → 'companion_assigned'). Two additive/idempotent policies make this
-- work for BOTH console roles:
--
-- (1) bookings UPDATE for Presence Managers. Super Admins can already update
--     via the existing "Bookings: companion update own" policy (is_admin());
--     PMs had NO update policy at all. can_manage_family() already includes
--     is_admin(), and composes the assigned-PM path, so this scopes a PM to
--     exactly their assigned families. (Postgres OR-combines permissive
--     policies — no existing user loses access.)
--
-- (2) companions SELECT of the APPROVED roster for console staff. The existing
--     "companions: manager read" only exposes Guardians who ALREADY serve a
--     PM's families — a chicken-and-egg that hides every Guardian a PM might
--     newly assign. This opens the assignable pool (approved only) to admins
--     and Presence Managers. Reads only the caller's own profile row (no
--     recursion: profiles policies never reference companions).
--
-- Run via the Supabase SQL Editor or `supabase db push`. Idempotent.
-- =====================================================================

drop policy if exists "bookings: manager assign" on public.bookings;
create policy "bookings: manager assign"
  on public.bookings for update
  using (public.can_manage_family(family_user_id))
  with check (public.can_manage_family(family_user_id));

drop policy if exists "companions: console read approved roster" on public.companions;
create policy "companions: console read approved roster"
  on public.companions for select
  using (
    status = 'approved'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and (p.role = 'admin' or p.admin_role = 'presence_manager')
    )
  );
