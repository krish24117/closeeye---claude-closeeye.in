-- =====================================================================
-- Elder Living Profiles + Smart Visit Checklist records
-- =====================================================================

-- ── elder_profiles ────────────────────────────────────────────────────

create table if not exists public.elder_profiles (
  id                    uuid primary key default gen_random_uuid(),
  loved_one_id          uuid references public.loved_ones(id) on delete cascade unique,
  name                  text,
  age                   int,
  photo_url             text,
  address               text,
  nearest_hospital      text,
  medical_conditions    text,
  current_medications   jsonb not null default '[]'::jsonb,
  allergies             text,
  doctor_name           text,
  doctor_phone          text,
  emergency_contacts    jsonb not null default '[]'::jsonb,
  food_preferences      text,
  conversation_interests text,
  things_to_avoid       text,
  daily_routine         text,
  special_dates         jsonb not null default '[]'::jsonb,
  continuity_notes      text,
  pinned_note           text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

alter table public.elder_profiles enable row level security;

-- Companions can read profiles for their assigned bookings
create policy "companion_read_elder_profiles"
  on public.elder_profiles for select
  using (
    exists (
      select 1 from public.bookings b
      where b.loved_one_id = elder_profiles.loved_one_id
        and b.companion_id = auth.uid()
    )
  );

-- Family can read their own elder profiles
create policy "family_read_elder_profiles"
  on public.elder_profiles for select
  using (
    exists (
      select 1 from public.loved_ones lo
      where lo.id = elder_profiles.loved_one_id
        and lo.family_user_id = auth.uid()
    )
  );

-- Admin full access
create policy "admin_all_elder_profiles"
  on public.elder_profiles for all
  using (public.is_admin())
  with check (public.is_admin());

-- Companions can append to continuity_notes (update only that column)
create policy "companion_update_continuity_notes"
  on public.elder_profiles for update
  using (
    exists (
      select 1 from public.bookings b
      where b.loved_one_id = elder_profiles.loved_one_id
        and b.companion_id = auth.uid()
    )
  );

-- ── visits ────────────────────────────────────────────────────────────
-- New checklist-based visit record (separate from legacy visit_reports)

create table if not exists public.visits (
  id              uuid primary key default gen_random_uuid(),
  booking_id      uuid references public.bookings(id) on delete set null,
  elder_id        uuid references public.elder_profiles(id) on delete set null,
  companion_id    uuid references auth.users(id) on delete set null,
  start_time      timestamptz,
  end_time        timestamptz,
  tier_completed  int check (tier_completed in (1, 2, 3)),
  checklist_data  jsonb not null default '{}'::jsonb,
  flags           text not null default 'none' check (flags in ('none', 'monitor', 'urgent')),
  flag_notes      text,
  one_moment      text,
  photo_urls      text[] not null default '{}',
  mood_score      int check (mood_score between 1 and 5),
  report_sent     boolean not null default false,
  report_sent_at  timestamptz,
  created_at      timestamptz not null default now()
);

alter table public.visits enable row level security;

-- Companions can insert + read their own visits
create policy "companion_insert_visits"
  on public.visits for insert
  with check (companion_id = auth.uid());

create policy "companion_read_own_visits"
  on public.visits for select
  using (companion_id = auth.uid());

create policy "companion_update_own_visits"
  on public.visits for update
  using (companion_id = auth.uid());

-- Family can read visits for their loved ones
create policy "family_read_visits"
  on public.visits for select
  using (
    exists (
      select 1 from public.elder_profiles ep
      join public.loved_ones lo on lo.id = ep.loved_one_id
      where ep.id = visits.elder_id
        and lo.family_user_id = auth.uid()
    )
  );

-- Admin full access
create policy "admin_all_visits"
  on public.visits for all
  using (public.is_admin())
  with check (public.is_admin());

-- Updated_at trigger for elder_profiles
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists elder_profiles_updated_at on public.elder_profiles;
create trigger elder_profiles_updated_at
  before update on public.elder_profiles
  for each row execute function public.set_updated_at();
