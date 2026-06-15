-- =====================================================================
-- Companion self-service profile (My Profile & Documents page).
--
-- 1. companions.bio - short self-written bio, shown on the companion's
--    own profile page.
-- 2. RLS: companions can update their OWN companions row (id = auth.uid()).
-- 3. Trigger: for non-admins, only photo_url/bio/skills/availability/
--    languages are actually writable - every other column (including
--    status, rating, verified, active) is reverted to its old value.
--    Mirrors prevent_role_self_escalation in 20260614120100_role_hardening.sql.
-- 4. Storage: companions can manage their own folder in
--    companion-photos (upload/replace their profile photo) and read
--    their own folder in companion-documents (view their ID proof).
--
-- Run via the Supabase SQL Editor or `supabase db push`, after
-- 20260614120000_rls_policies.sql (depends on public.is_admin()) and
-- 20260615120100_companion_onboarding_storage.sql.
-- Safe to re-run: column add is idempotent, policies/trigger are
-- dropped and recreated before being added.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. bio column
-- ---------------------------------------------------------------------
alter table public.companions add column if not exists bio text;

-- ---------------------------------------------------------------------
-- 2. Companions can update their own row
-- ---------------------------------------------------------------------
drop policy if exists "Companions: update own profile" on public.companions;
create policy "Companions: update own profile"
  on public.companions for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- ---------------------------------------------------------------------
-- 3. Lock down which columns a non-admin can actually change
-- ---------------------------------------------------------------------
create or replace function public.prevent_companion_self_field_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    new.full_name := old.full_name;
    new.phone := old.phone;
    new.email := old.email;
    new.age := old.age;
    new.gender := old.gender;
    new.city := old.city;
    new.id_proof_url := old.id_proof_url;
    new.status := old.status;
    new.rating := old.rating;
    new.verified := old.verified;
    new.active := old.active;
    new.total_visits := old.total_visits;
    new.created_at := old.created_at;
  end if;
  return new;
end;
$$;

drop trigger if exists prevent_companion_self_field_changes on public.companions;
create trigger prevent_companion_self_field_changes
  before update on public.companions
  for each row execute function public.prevent_companion_self_field_changes();

-- ---------------------------------------------------------------------
-- 4. Storage: self-service profile photo + own ID proof viewing
-- ---------------------------------------------------------------------
drop policy if exists "Companion photos: self manage" on storage.objects;
create policy "Companion photos: self manage"
  on storage.objects for all
  using (bucket_id = 'companion-photos' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'companion-photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Companion documents: self read" on storage.objects;
create policy "Companion documents: self read"
  on storage.objects for select
  using (bucket_id = 'companion-documents' and (storage.foldername(name))[1] = auth.uid()::text);
