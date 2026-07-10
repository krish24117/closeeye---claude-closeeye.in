-- =====================================================================
-- Guardian provisioning — let the service-role edge function set role='companion'.
--
-- prevent_role_self_escalation (20260614120100) reverts ANY profiles.role change
-- unless is_admin(). The provision-companion edge function connects with the
-- service-role key, so auth.uid() is null → is_admin() is false → the role flip
-- to 'companion' was silently reverted. Allow the service_role JWT through.
--
-- This grants NO new capability: the service_role key already bypasses RLS
-- wholesale (it can ALTER TABLE, read/write anything). We are only removing an
-- artificial block that exists to stop self-service users escalating themselves.
-- auth.role() reads the request JWT's role claim and is unaffected by this
-- function's SECURITY DEFINER context. `is distinct from` keeps the safe default:
-- a null role (no JWT) still reverts, only an explicit 'service_role' passes.
--
-- Real users stay fully protected: an 'authenticated' caller returns
-- auth.role()='authenticated' → the revert still fires.
--
-- Idempotent (create or replace); the existing trigger binding is preserved.
-- =====================================================================

create or replace function public.prevent_role_self_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role
     and not public.is_admin()
     and auth.role() is distinct from 'service_role' then
    new.role := old.role;
  end if;
  return new;
end;
$$;
