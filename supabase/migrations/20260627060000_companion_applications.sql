-- =====================================================================
-- Companion recruitment: public application form + companion profile fields.
--   companion_applications — submissions from /join-as-companion (public insert)
--   companions             — new public-profile / certification columns
--   storage bucket         — companion-applications (private; anon may upload)
-- Idempotent.
-- =====================================================================

-- ── companion_applications ───────────────────────────────────────────
create table if not exists public.companion_applications (
  id                     uuid primary key default gen_random_uuid(),
  full_name              text not null,
  age                    integer,
  gender                 text,
  phone                  text not null,
  email                  text,
  area                   text,
  languages              text[],
  current_occupation     text,
  caregiving_experience  text,
  motivation             text not null,
  has_elderly_family     boolean,
  elderly_family_details text,
  availability_type      text,
  days_available         text[],
  hours_per_day          text,
  can_travel             boolean default true,
  ref1_name              text,
  ref1_phone             text,
  ref1_relation          text,
  ref2_name              text,
  ref2_phone             text,
  ref2_relation          text,
  aadhaar_url            text,
  photo_url              text,
  police_clearance_url   text,
  status                 text default 'applied',
  admin_notes            text,
  applied_at             timestamptz default now(),
  updated_at             timestamptz default now()
);

alter table public.companion_applications enable row level security;

-- Anyone (logged in or not) may submit an application.
drop policy if exists "companion_applications: public insert" on public.companion_applications;
create policy "companion_applications: public insert"
  on public.companion_applications for insert to anon, authenticated with check (true);

drop policy if exists "companion_applications: admin read" on public.companion_applications;
create policy "companion_applications: admin read"
  on public.companion_applications for select using (public.is_admin());

drop policy if exists "companion_applications: admin update" on public.companion_applications;
create policy "companion_applications: admin update"
  on public.companion_applications for update using (public.is_admin()) with check (public.is_admin());

create index if not exists companion_applications_status_idx on public.companion_applications (status, applied_at desc);

-- ── companions: public-profile / certification fields ────────────────
alter table public.companions add column if not exists is_certified        boolean default false;
alter table public.companions add column if not exists certification_date   timestamptz;
alter table public.companions add column if not exists total_visits         integer default 0;
alter table public.companions add column if not exists avg_rating           decimal(3,2) default 0;
alter table public.companions add column if not exists training_completed   boolean default false;
alter table public.companions add column if not exists bio                  text;
alter table public.companions add column if not exists languages            text[];
alter table public.companions add column if not exists area                 text;

-- ── storage bucket for application documents (private) ────────────────
insert into storage.buckets (id, name, public)
values ('companion-applications', 'companion-applications', false)
on conflict (id) do nothing;

drop policy if exists "companion-applications: anon upload" on storage.objects;
create policy "companion-applications: anon upload"
  on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'companion-applications');

drop policy if exists "companion-applications: admin read" on storage.objects;
create policy "companion-applications: admin read"
  on storage.objects for select
  using (bucket_id = 'companion-applications' and public.is_admin());
