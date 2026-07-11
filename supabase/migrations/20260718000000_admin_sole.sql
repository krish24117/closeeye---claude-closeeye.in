-- Make hello@closeeye.in the SOLE platform admin.
--
-- Demote every other account currently holding role='admin' (e.g. the original
-- krish24117@gmail.com bootstrap admin) down to 'family'. hello@closeeye.in is
-- designated admin in 20260717000000 (on signup, or promoted if it exists).
--
-- GUARDED: the demotion runs ONLY when hello@closeeye.in is itself a confirmed
-- admin, so this can never leave the platform with zero admins / lock everyone
-- out. If hello@closeeye.in isn't an admin yet at apply time, this is a safe
-- no-op — it takes effect once that account exists as admin (re-apply / after its
-- first sign-in). Idempotent.

do $$
begin
  if exists (
    select 1
      from public.profiles p
      join auth.users u on u.id = p.id
     where p.role = 'admin'
       and lower(coalesce(u.email, '')) = 'hello@closeeye.in'
  ) then
    -- prevent_role_self_escalation reverts a role change made without an admin
    -- auth.uid() (true in this server-side migration), so disable it just here.
    alter table public.profiles disable trigger prevent_role_self_escalation;

    update public.profiles p
       set role = 'family'
      from auth.users u
     where p.id = u.id
       and p.role = 'admin'
       and lower(coalesce(u.email, '')) <> 'hello@closeeye.in';

    alter table public.profiles enable trigger prevent_role_self_escalation;
  end if;
end $$;
