-- =====================================================================
-- Doctor assignment & verification for member_queries.
--   member_queries: assignment + doctor-response + verification fields
--   doctors: roster of reviewing doctors (linked to an auth user to log in)
-- Idempotent.
--
-- Role model: a doctor account has profiles.admin_role='doctor' and role <> 'admin'
-- (so public.is_admin() is FALSE) — RLS then restricts them to assigned queries.
-- Super admins (role='admin') keep full access via the existing admin-all policy.
-- =====================================================================

-- ── member_queries: new columns ──────────────────────────────────────
alter table public.member_queries add column if not exists assigned_doctor_id  uuid references auth.users(id) default null;
alter table public.member_queries add column if not exists assigned_at         timestamptz default null;
alter table public.member_queries add column if not exists doctor_response     text default null;
alter table public.member_queries add column if not exists doctor_verified     boolean default false;
alter table public.member_queries add column if not exists verified_at         timestamptz default null;
alter table public.member_queries add column if not exists verification_status text default 'pending';
-- verification_status: pending | assigned | reviewed | verified

create index if not exists member_queries_assigned_doctor_idx on public.member_queries (assigned_doctor_id);
create index if not exists member_queries_verification_status_idx on public.member_queries (verification_status);

-- ── doctors roster ───────────────────────────────────────────────────
create table if not exists public.doctors (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users(id),
  name            text not null,
  specialisation  text,
  hospital        text,
  phone           text,
  whatsapp        text,
  is_active       boolean default true,
  created_at      timestamptz default now()
);

alter table public.doctors enable row level security;

drop policy if exists "doctors: admin all" on public.doctors;
create policy "doctors: admin all"
  on public.doctors for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "doctors: read own" on public.doctors;
create policy "doctors: read own"
  on public.doctors for select using (user_id = auth.uid());

-- ── member_queries RLS: doctors see / update only assigned ────────────
-- (additive to existing own-read / own-insert / own-update / admin-all policies;
--  permissive SELECT/UPDATE policies are OR'd together)
drop policy if exists "doctors_see_assigned" on public.member_queries;
create policy "doctors_see_assigned"
  on public.member_queries for select
  using (assigned_doctor_id = auth.uid() or public.is_admin());

drop policy if exists "doctors_update_assigned" on public.member_queries;
create policy "doctors_update_assigned"
  on public.member_queries for update
  using (assigned_doctor_id = auth.uid())
  with check (assigned_doctor_id = auth.uid());
