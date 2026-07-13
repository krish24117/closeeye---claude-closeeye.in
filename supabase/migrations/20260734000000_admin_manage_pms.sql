-- "Make PM" — Super Admin promotes/demotes Presence Managers from the admin UI,
-- replacing the manual `update profiles set admin_role = 'presence_manager'` seed
-- (permission_architecture 20260708010000:114-119).
--
-- Implemented as security-definer RPCs rather than an edge function: same Super-Admin
-- gate (is_admin()), but they can ONLY ever touch the presence_manager role — a
-- companion/doctor/super_admin admin_role is never clobbered — and they ship on push
-- (no deploy). Granted to `authenticated`; the is_admin() check inside is the real gate.
-- Idempotent.

-- Promote the account with this email to Presence Manager.
create or replace function public.admin_promote_pm(p_email text)
returns table (user_id uuid, full_name text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Only a Super Admin can assign Presence Managers';
  end if;
  select id into v_id from auth.users where lower(email) = lower(trim(p_email)) limit 1;
  if v_id is null then
    raise exception 'No CloseEye account found for %', p_email;
  end if;
  update public.profiles set admin_role = 'presence_manager' where id = v_id;
  return query select p.id, p.full_name from public.profiles p where p.id = v_id;
end;
$$;

-- Demote a Presence Manager. Clears ONLY the presence_manager role, and removes their
-- family_assignments too — otherwise pm_manages_family() (which keys off assignments,
-- not the role) would keep granting them access to those families after demotion.
create or replace function public.admin_demote_pm(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Only a Super Admin can change Presence Managers';
  end if;
  update public.profiles set admin_role = null
    where id = p_user_id and admin_role = 'presence_manager';
  delete from public.family_assignments where presence_manager_id = p_user_id;
end;
$$;

grant execute on function public.admin_promote_pm(text) to authenticated;
grant execute on function public.admin_demote_pm(uuid) to authenticated;
