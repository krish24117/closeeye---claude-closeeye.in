-- Switch the platform admin: hello@closeeye.in → hello.closeeye@gmail.com.
--
-- The custom-domain address made sign-in painful (the email sign-in link was
-- slow / not working). A Gmail address signs in cleanly via "Continue with
-- Google" — no email link or code required. This SUPERSEDES 20260717000000 and
-- 20260718000000 and is forward-only, so it establishes the correct final state
-- whether or not those earlier migrations were already applied.
--
-- Admin = profiles.role='admin' (public.is_admin() / lib/roles isSuperAdmin);
-- there is no email allowlist. So:
--   1. On signup, ONLY hello.closeeye@gmail.com is auto-assigned role='admin'
--      (hello@closeeye.in no longer is).
--   2. Promote hello.closeeye@gmail.com now if the account already exists.
--   3. Make it the SOLE admin — demote every other admin (including
--      hello@closeeye.in and krish24117@gmail.com) to 'family', GUARDED so the
--      platform can never end up with zero admins.
-- Idempotent.

-- 1. Auto-assign admin to the Gmail address on signup (replaces the old address).
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
    case when lower(new.email) = 'hello.closeeye@gmail.com' then 'admin' else 'family' end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- 2 + 3. Promote the Gmail admin, then make it the sole admin.
do $$
begin
  alter table public.profiles disable trigger prevent_role_self_escalation;

  -- Promote hello.closeeye@gmail.com if the account already exists.
  update public.profiles p
     set role = 'admin'
    from auth.users u
   where p.id = u.id
     and lower(u.email) = 'hello.closeeye@gmail.com'
     and p.role is distinct from 'admin';

  -- Sole admin: demote every OTHER admin — but only once the Gmail account is a
  -- confirmed admin, so this never leaves the platform with zero admins.
  if exists (
    select 1
      from public.profiles p
      join auth.users u on u.id = p.id
     where p.role = 'admin'
       and lower(coalesce(u.email, '')) = 'hello.closeeye@gmail.com'
  ) then
    update public.profiles p
       set role = 'family'
      from auth.users u
     where p.id = u.id
       and p.role = 'admin'
       and lower(coalesce(u.email, '')) <> 'hello.closeeye@gmail.com';
  end if;

  alter table public.profiles enable trigger prevent_role_self_escalation;
end $$;
