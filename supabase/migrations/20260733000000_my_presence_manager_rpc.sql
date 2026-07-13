-- Family-facing Presence Manager identity (CloseEye Connect, Human Network pillar).
--
-- A family should see the NAME of the human looking after them, not a faceless
-- "Close Eye team". But profiles RLS (rightly) does NOT let a family read a staff
-- member's profile. This security-definer RPC threads that needle: it returns ONLY
-- the FIRST NAME of the caller's OWN assigned Presence Manager (scoped by
-- auth.uid()) — minimal exposure, no broadening of profiles RLS.
--
-- Returns 0 rows when the family has no PM assigned (Connect falls back to
-- "Close Eye team"). Idempotent.
create or replace function public.get_my_presence_manager()
returns table (manager_id uuid, first_name text)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, nullif(split_part(coalesce(p.full_name, ''), ' ', 1), '')
  from public.family_assignments fa
  join public.profiles p on p.id = fa.presence_manager_id
  where fa.family_user_id = auth.uid()
  order by fa.assigned_at desc
  limit 1;
$$;

grant execute on function public.get_my_presence_manager() to authenticated;
