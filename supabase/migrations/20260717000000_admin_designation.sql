-- Designate hello@closeeye.in as the platform administrator (Super Admin).
--
-- Admin access is decided entirely by profiles.role = 'admin' (see public.is_admin()
-- and lib/roles.ts isSuperAdmin). There is no email allowlist, so we make the
-- designation durable in two ways:
--   1. When hello@closeeye.in signs up, its profile is created with role='admin'
--      (everyone else still defaults to 'family').
--   2. If that account already exists, promote it now.
--
-- Only this one address is affected, and it's a domain address the owner controls
-- (only they can receive its sign-in code), so it can't be claimed by anyone else.
-- Idempotent — safe to re-run.

-- 1. Auto-assign the admin role to the designated address on signup.
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
    case when lower(new.email) = 'hello@closeeye.in' then 'admin' else 'family' end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- 2. Promote the account if it already signed up. prevent_role_self_escalation
--    reverts a role change made without an admin auth.uid() (true in a server-side
--    migration), so disable it for just this one designated update.
alter table public.profiles disable trigger prevent_role_self_escalation;

update public.profiles p
   set role = 'admin'
  from auth.users u
 where p.id = u.id
   and lower(u.email) = 'hello@closeeye.in'
   and p.role is distinct from 'admin';

alter table public.profiles enable trigger prevent_role_self_escalation;
