-- =====================================================================
-- CloseEye row-level security policies
--
-- Run via the Supabase SQL Editor or `supabase db push`.
-- Safe to re-run: policies are dropped and recreated before being added;
-- enabling RLS on a table that already has it enabled is a no-op.
--
-- Roles:
--   family    - profiles.role = 'family'    (default at signup)
--   companion - profiles.role = 'companion'
--   admin     - profiles.role = 'admin'
-- =====================================================================

-- ---------------------------------------------------------------------
-- Helper functions (security definer so they can read profiles/companions
-- without recursing into the RLS policies defined below)
-- ---------------------------------------------------------------------

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.current_companion_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.companions where user_id = auth.uid();
$$;

grant execute on function public.is_admin() to authenticated, anon;
grant execute on function public.current_companion_id() to authenticated, anon;

-- ---------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------
alter table public.profiles enable row level security;

drop policy if exists "Profiles: read own or admin" on public.profiles;
create policy "Profiles: read own or admin"
  on public.profiles for select
  using (id = auth.uid() or public.is_admin());

drop policy if exists "Profiles: insert own" on public.profiles;
create policy "Profiles: insert own"
  on public.profiles for insert
  with check (id = auth.uid());

drop policy if exists "Profiles: update own or admin" on public.profiles;
create policy "Profiles: update own or admin"
  on public.profiles for update
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- ---------------------------------------------------------------------
-- companions
-- ---------------------------------------------------------------------
alter table public.companions enable row level security;

drop policy if exists "Companions: read own, assigned family, or admin" on public.companions;
create policy "Companions: read own, assigned family, or admin"
  on public.companions for select
  using (
    user_id = auth.uid()
    or public.is_admin()
    or exists (
      select 1 from public.bookings b
      join public.loved_ones lo on lo.id = b.loved_one_id
      where b.companion_id = companions.id
        and lo.family_user_id = auth.uid()
    )
  );

drop policy if exists "Companions: admin manage" on public.companions;
create policy "Companions: admin manage"
  on public.companions for all
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------
-- loved_ones
-- ---------------------------------------------------------------------
alter table public.loved_ones enable row level security;

drop policy if exists "Loved ones: read own, assigned companion, or admin" on public.loved_ones;
create policy "Loved ones: read own, assigned companion, or admin"
  on public.loved_ones for select
  using (
    family_user_id = auth.uid()
    or public.is_admin()
    or exists (
      select 1 from public.bookings b
      where b.loved_one_id = loved_ones.id
        and b.companion_id = public.current_companion_id()
    )
  );

drop policy if exists "Loved ones: insert own" on public.loved_ones;
create policy "Loved ones: insert own"
  on public.loved_ones for insert
  with check (family_user_id = auth.uid());

drop policy if exists "Loved ones: update own or admin" on public.loved_ones;
create policy "Loved ones: update own or admin"
  on public.loved_ones for update
  using (family_user_id = auth.uid() or public.is_admin())
  with check (family_user_id = auth.uid() or public.is_admin());

drop policy if exists "Loved ones: delete own or admin" on public.loved_ones;
create policy "Loved ones: delete own or admin"
  on public.loved_ones for delete
  using (family_user_id = auth.uid() or public.is_admin());

-- ---------------------------------------------------------------------
-- bookings
-- ---------------------------------------------------------------------
alter table public.bookings enable row level security;

drop policy if exists "Bookings: read own family, assigned companion, or admin" on public.bookings;
create policy "Bookings: read own family, assigned companion, or admin"
  on public.bookings for select
  using (
    public.is_admin()
    or companion_id = public.current_companion_id()
    or exists (
      select 1 from public.loved_ones lo
      where lo.id = bookings.loved_one_id
        and lo.family_user_id = auth.uid()
    )
  );

drop policy if exists "Bookings: companion update own" on public.bookings;
create policy "Bookings: companion update own"
  on public.bookings for update
  using (companion_id = public.current_companion_id() or public.is_admin())
  with check (companion_id = public.current_companion_id() or public.is_admin());

-- No client-facing insert policy: bookings are created by the payment/booking
-- flow via the service role, which bypasses RLS.

-- ---------------------------------------------------------------------
-- visit_reports
-- ---------------------------------------------------------------------
alter table public.visit_reports enable row level security;

drop policy if exists "Visit reports: read own family, own companion, or admin" on public.visit_reports;
create policy "Visit reports: read own family, own companion, or admin"
  on public.visit_reports for select
  using (
    public.is_admin()
    or companion_id = public.current_companion_id()
    or exists (
      select 1 from public.loved_ones lo
      where lo.id = visit_reports.loved_one_id
        and lo.family_user_id = auth.uid()
    )
  );

drop policy if exists "Visit reports: companion insert own" on public.visit_reports;
create policy "Visit reports: companion insert own"
  on public.visit_reports for insert
  with check (
    companion_id = public.current_companion_id()
    and exists (
      select 1 from public.bookings b
      where b.id = visit_reports.booking_id
        and b.companion_id = public.current_companion_id()
    )
  );

-- No update/delete policies: reports are immutable once submitted.

-- ---------------------------------------------------------------------
-- notifications
-- ---------------------------------------------------------------------
alter table public.notifications enable row level security;

drop policy if exists "Notifications: read own or admin" on public.notifications;
create policy "Notifications: read own or admin"
  on public.notifications for select
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists "Notifications: update own (mark read)" on public.notifications;
create policy "Notifications: update own (mark read)"
  on public.notifications for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- No client insert/delete policies: notifications are created server-side
-- (service role / triggers).

-- ---------------------------------------------------------------------
-- waitlist
-- ---------------------------------------------------------------------
alter table public.waitlist enable row level security;

drop policy if exists "Waitlist: public insert" on public.waitlist;
create policy "Waitlist: public insert"
  on public.waitlist for insert
  to anon, authenticated
  with check (true);

drop policy if exists "Waitlist: admin read" on public.waitlist;
create policy "Waitlist: admin read"
  on public.waitlist for select
  using (public.is_admin());
