-- =====================================================================
-- Add companion-onboarding fields to public.companions so an admin can
-- add a companion directly (recruitment/application roster entry)
-- without first creating an auth.users/profiles account.
--
-- New columns: email, age, gender, languages, skills, availability,
-- id_proof_url, photo_url, status (pending/approved/rejected).
--
-- Run via the Supabase SQL Editor or `supabase db push`.
-- Safe to re-run: columns use "add column if not exists", constraints
-- are dropped and recreated.
-- =====================================================================

do $$
declare
  v_status_existed boolean;
begin
  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'companions' and column_name = 'status'
  ) into v_status_existed;

  alter table public.companions
    add column if not exists email text,
    add column if not exists age integer,
    add column if not exists gender text,
    add column if not exists languages text[] not null default '{}',
    add column if not exists skills text[] not null default '{}',
    add column if not exists availability text,
    add column if not exists id_proof_url text,
    add column if not exists photo_url text,
    add column if not exists status text not null default 'pending';

  -- Companions that existed before this migration were added by
  -- promoting a family account — the admin already vetted them, so
  -- treat them as approved rather than leaving them stuck as pending.
  if not v_status_existed then
    update public.companions set status = 'approved';
  end if;
end $$;

alter table public.companions drop constraint if exists companions_status_check;
alter table public.companions add constraint companions_status_check
  check (status in ('pending', 'approved', 'rejected'));

alter table public.companions drop constraint if exists companions_availability_check;
alter table public.companions add constraint companions_availability_check
  check (availability is null or availability in ('full_time', 'part_time', 'weekends'));

alter table public.companions drop constraint if exists companions_gender_check;
alter table public.companions add constraint companions_gender_check
  check (gender is null or gender in ('male', 'female', 'other'));
