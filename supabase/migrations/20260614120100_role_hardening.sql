-- =====================================================================
-- CloseEye role hardening
--
-- 1. Signup always creates profiles with role = 'family', regardless of
--    what the client passes in auth.signUp's `options.data.role`.
-- 2. Once a profile exists, non-admins cannot change their own `role`
--    column (RLS alone only restricts which rows are touched, not which
--    columns, so a self-update to profiles.role='admin' would otherwise
--    succeed).
--
-- Run via the Supabase SQL Editor or `supabase db push`, after
-- 20260614120000_rls_policies.sql (depends on public.is_admin()).
--
-- NOTE: if a "new user" trigger on auth.users already exists under a
-- different name, remove it so profiles aren't inserted twice on signup.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. New users always get role = 'family'
-- ---------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    'family'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- 2. Non-admins cannot change their own profiles.role
-- ---------------------------------------------------------------------

create or replace function public.prevent_role_self_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role and not public.is_admin() then
    new.role := old.role;
  end if;
  return new;
end;
$$;

drop trigger if exists prevent_role_self_escalation on public.profiles;
create trigger prevent_role_self_escalation
  before update on public.profiles
  for each row execute function public.prevent_role_self_escalation();
