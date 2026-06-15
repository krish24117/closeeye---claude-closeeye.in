-- =====================================================================
-- Live location tracking for companions during active visits.
--
-- One row per companion (PK = companion_id), continuously upserted by
-- the companion's device while a booking is "in_progress". Read access
-- is scoped to: the companion themselves, admins, and the family member
-- of the loved one for the *specific in-progress booking* referenced by
-- booking_id (prevents a family from seeing a companion's location from
-- a different family's active visit).
--
-- Realtime is enabled via the supabase_realtime publication so that
-- family/admin map views receive live updates via postgres_changes.
--
-- Run via the Supabase SQL Editor or `supabase db push`.
-- Safe to re-run: idempotent throughout.
-- =====================================================================

create table if not exists public.companion_locations (
  companion_id uuid primary key references public.companions(id) on delete cascade,
  booking_id uuid references public.bookings(id) on delete set null,
  lat double precision not null,
  lng double precision not null,
  updated_at timestamptz not null default now()
);

create index if not exists companion_locations_booking_id_idx on public.companion_locations(booking_id);

alter table public.companion_locations enable row level security;

drop policy if exists "Companion locations: companion upsert own" on public.companion_locations;
create policy "Companion locations: companion upsert own"
  on public.companion_locations for all
  using (companion_id = auth.uid())
  with check (companion_id = auth.uid());

drop policy if exists "Companion locations: read own, admin, or family with active visit" on public.companion_locations;
create policy "Companion locations: read own, admin, or family with active visit"
  on public.companion_locations for select
  using (
    public.is_admin()
    or companion_id = auth.uid()
    or exists (
      select 1 from public.bookings b
      join public.loved_ones lo on lo.id = b.loved_one_id
      where b.id = companion_locations.booking_id
        and b.companion_id = companion_locations.companion_id
        and b.status = 'in_progress'
        and lo.family_user_id = auth.uid()
    )
  );

-- Enable Realtime for this table. If this errors (e.g. publication does
-- not exist by this name on the target project), enable Realtime via
-- Supabase Dashboard -> Database -> Replication -> toggle companion_locations.
do $$
begin
  alter publication supabase_realtime add table public.companion_locations;
exception
  when duplicate_object then null;
end $$;
