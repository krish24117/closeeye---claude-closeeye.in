-- =====================================================================
-- Fix infinite recursion in RLS between public.bookings and
-- public.loved_ones.
--
-- "Bookings: read own family, assigned companion, or admin" checks
-- public.loved_ones (for family ownership of the booking's loved one),
-- and "Loved ones: read own, assigned companion, or admin" checks
-- public.bookings (for companion assignment to the loved one). Each
-- subquery is RLS-checked, so evaluating one policy re-triggers the
-- other forever - Postgres reports "infinite recursion detected in
-- policy for relation ...". This breaks every read of bookings or
-- loved_ones (directly, or via the companions/visit_reports/
-- companion_locations policies that join through them).
--
-- Fix: move each cross-table check into a `security definer` helper
-- (same bypass-RLS pattern as is_admin()/current_companion_id()), so
-- the check runs without re-entering the other table's RLS.
--
-- Run via the Supabase SQL Editor or `supabase db push`.
-- Safe to re-run: functions use `create or replace`, policies are
-- dropped and recreated before being added.
-- =====================================================================

create or replace function public.is_my_loved_one(p_loved_one_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.loved_ones
    where id = p_loved_one_id and family_user_id = auth.uid()
  );
$$;

create or replace function public.is_companion_assigned_to_loved_one(p_loved_one_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.bookings
    where loved_one_id = p_loved_one_id and companion_id = public.current_companion_id()
  );
$$;

grant execute on function public.is_my_loved_one(uuid) to authenticated, anon;
grant execute on function public.is_companion_assigned_to_loved_one(uuid) to authenticated, anon;

-- ---------------------------------------------------------------------
-- bookings: replace inline loved_ones subquery with helper
-- ---------------------------------------------------------------------
drop policy if exists "Bookings: read own family, assigned companion, or admin" on public.bookings;
create policy "Bookings: read own family, assigned companion, or admin"
  on public.bookings for select
  using (
    public.is_admin()
    or companion_id = public.current_companion_id()
    or public.is_my_loved_one(bookings.loved_one_id)
  );

-- ---------------------------------------------------------------------
-- loved_ones: replace inline bookings subquery with helper
-- ---------------------------------------------------------------------
drop policy if exists "Loved ones: read own, assigned companion, or admin" on public.loved_ones;
create policy "Loved ones: read own, assigned companion, or admin"
  on public.loved_ones for select
  using (
    family_user_id = auth.uid()
    or public.is_admin()
    or public.is_companion_assigned_to_loved_one(loved_ones.id)
  );
