-- =====================================================================
-- Authorization primitives — the complete, symmetric gate/identity API that
-- the four upcoming modules (Guardian App, Presence Manager App, Admin
-- Dashboard, Medical Concierge) build against WITHOUT redesigning the model.
--
-- This migration adds ONLY new security-definer functions. It touches no table
-- and no existing policy, so it cannot affect the customer app or any existing
-- workflow. Each future module applies these gates to its OWN tables (that is
-- the modular boundary) — the model itself never changes.
--
-- ── Identity (which role is the caller?) ─────────────────────────────────────
--   public.is_admin()            Super Admin      → profiles.role='admin'          (existing)
--   public.is_presence_manager() Presence Manager → admin_role='presence_manager'  (existing)
--   public.is_companion()        Guardian         → has a companions row           (added below)
--   public.is_doctor()           Medical Concierge→ admin_role='doctor'            (added below)
--
-- ── Access gates (may the caller touch this record?) ─────────────────────────
--   public.can_manage_family(family_user_id)   family-level : Super Admin OR assigned PM   (existing)
--   public.can_access_loved_one(loved_one_id)  recipient-level: family owner OR Super Admin
--                                               OR assigned PM OR assigned Guardian         (added below)
--
-- Assignment axes: PM↔family = family_assignments; Guardian↔visit = bookings.companion_id;
-- Doctor↔query = member_queries.assigned_doctor_id. All pre-existing except family_assignments.
--
-- Run via the Supabase SQL Editor or `supabase db push`. Idempotent (create or replace).
-- =====================================================================

-- ── Identity helpers (round out the set; is_admin/is_presence_manager exist) ──
create or replace function public.is_companion()
returns boolean language sql stable security definer set search_path = public as $$
  select public.current_companion_id() is not null;
$$;

create or replace function public.is_doctor()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and admin_role = 'doctor'
  );
$$;

-- ── Care-recipient access gate ───────────────────────────────────────────────
-- The single answer to "may the caller see/act on this loved_one's data?",
-- composing every role. Modules for visits, reports, care notes, health, etc.
-- gate their loved_one-scoped tables with this one function.
create or replace function public.can_access_loved_one(p_loved_one_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select
    public.is_admin()
    or public.is_companion_assigned_to_loved_one(p_loved_one_id)
    or exists (
      select 1 from public.loved_ones lo
      where lo.id = p_loved_one_id
        and (lo.family_user_id = auth.uid() or public.pm_manages_family(lo.family_user_id))
    );
$$;

grant execute on function public.is_companion() to authenticated, anon;
grant execute on function public.is_doctor() to authenticated, anon;
grant execute on function public.can_access_loved_one(uuid) to authenticated, anon;
