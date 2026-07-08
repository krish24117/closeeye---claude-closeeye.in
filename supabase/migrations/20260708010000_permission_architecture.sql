-- =====================================================================
-- Permission architecture — the four-role foundation.
--
--   1. Super Admin       profiles.role = 'admin'                (public.is_admin())    — everything
--   2. Presence Manager  profiles.admin_role = 'presence_manager'                      — assigned families only
--   3. Guardian          the existing companion model (bookings.companion_id +
--                        public.is_companion_assigned_to_loved_one)                    — assigned visits only
--   4. Family            family_user_id = auth.uid()                                    — own data only
--
-- Authorization is CENTRALISED in one helper, public.can_manage_family(family) =
-- Super Admin OR assigned Presence Manager. Every module routes staff access
-- through it — no hardcoded role checks, no duplicated assignment logic. New
-- Presence Managers and new cities are supported by inserting assignment rows;
-- no schema redesign.
--
-- All RLS changes here are strictly ADDITIVE (they only widen access), so no
-- existing user loses anything: Super Admin still sees all via is_admin(),
-- families still see their own, companions keep their assigned-visit access.
--
-- Run via the Supabase SQL Editor or `supabase db push`. Idempotent throughout.
-- =====================================================================

-- ── 1. Presence Manager sub-role ─────────────────────────────────────────────
alter table public.profiles drop constraint if exists profiles_admin_role_check;
alter table public.profiles
  add constraint profiles_admin_role_check
  check (admin_role is null or admin_role in ('super_admin', 'presence_manager', 'companion', 'doctor'));

-- ── 2. Assignment model: Presence Manager ↔ Family ───────────────────────────
create table if not exists public.family_assignments (
  id                  uuid primary key default gen_random_uuid(),
  presence_manager_id uuid not null references auth.users(id) on delete cascade,
  family_user_id      uuid not null references auth.users(id) on delete cascade,
  assigned_by         uuid references auth.users(id) on delete set null,
  assigned_at         timestamptz not null default now(),
  unique (presence_manager_id, family_user_id)
);
create index if not exists family_assignments_pm_idx on public.family_assignments(presence_manager_id);
create index if not exists family_assignments_family_idx on public.family_assignments(family_user_id);

-- ── 3. Centralised authorization helpers (security definer → no RLS recursion) ─
create or replace function public.is_presence_manager()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and admin_role = 'presence_manager'
  );
$$;

create or replace function public.pm_manages_family(p_family_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.family_assignments
    where presence_manager_id = auth.uid() and family_user_id = p_family_user_id
  );
$$;

-- THE central gate: Super Admin manages everyone; a Presence Manager manages
-- only their assigned families. Every staff-facing policy calls this.
create or replace function public.can_manage_family(p_family_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_admin() or public.pm_manages_family(p_family_user_id);
$$;

grant execute on function public.is_presence_manager() to authenticated, anon;
grant execute on function public.pm_manages_family(uuid) to authenticated, anon;
grant execute on function public.can_manage_family(uuid) to authenticated, anon;

-- ── 4. family_assignments RLS ────────────────────────────────────────────────
alter table public.family_assignments enable row level security;

-- Only Super Admin creates/edits assignments (the assignment UI is a future module).
drop policy if exists "Assignments: super admin manage" on public.family_assignments;
create policy "Assignments: super admin manage"
  on public.family_assignments for all
  using (public.is_admin()) with check (public.is_admin());

-- A Presence Manager can see their own assignments.
drop policy if exists "Assignments: pm read own" on public.family_assignments;
create policy "Assignments: pm read own"
  on public.family_assignments for select
  using (presence_manager_id = auth.uid());

-- ── 5. messages RLS → route staff access through can_manage_family ───────────
-- Replaces the raw is_admin() gates so Presence Managers see/reply to ONLY
-- their assigned families' threads; Super Admin (via is_admin) still sees all.
drop policy if exists "Messages: read own or admin" on public.messages;
create policy "Messages: read own or manager"
  on public.messages for select
  using (family_user_id = auth.uid() or public.can_manage_family(family_user_id));

drop policy if exists "Messages: admin manage" on public.messages;
create policy "Messages: manager manage"
  on public.messages for all
  using (public.can_manage_family(family_user_id))
  with check (public.can_manage_family(family_user_id));

-- ── 6. loved_ones SELECT → add Presence Manager access (preserve all clauses) ─
drop policy if exists "Loved ones: read own, assigned companion, or admin" on public.loved_ones;
create policy "Loved ones: read own, assigned companion, or admin"
  on public.loved_ones for select
  using (
    family_user_id = auth.uid()
    or public.is_admin()
    or public.is_companion_assigned_to_loved_one(loved_ones.id)
    or public.pm_manages_family(loved_ones.family_user_id)
  );

-- ── 7. profiles SELECT → add Presence Manager access (preserve all clauses) ──
drop policy if exists "Profiles: read own or admin" on public.profiles;
create policy "Profiles: read own or admin"
  on public.profiles for select
  using (id = auth.uid() or public.is_admin() or public.pm_manages_family(id));

-- ── Seeding (run manually as needed; no assignment UI yet) ───────────────────
-- Make a user a Presence Manager:
--   update public.profiles set admin_role = 'presence_manager' where id = '<pm_user_id>';
-- Assign a family to that Presence Manager:
--   insert into public.family_assignments (presence_manager_id, family_user_id)
--   values ('<pm_user_id>', '<family_user_id>');
