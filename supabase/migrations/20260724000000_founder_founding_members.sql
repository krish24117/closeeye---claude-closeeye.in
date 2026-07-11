-- Founder ops — surface the ORIGINAL founding members on the Founder dashboard.
--
-- Two disjoint "founding" concepts live on `profiles`: (1) the pre-launch funnel
-- flag `founder_prelaunch`, and (2) the older paid/reserved founding members
-- (`is_founding_member` + `founding_number`, from the founding-member checkout).
-- The registrant function only ever returned (1), so the real founding families
-- (numbered 1..N) appeared on NO dashboard. This widens it to return BOTH and
-- exposes `is_founding_member` + `founding_number` so the UI can badge them.
--
-- `create or replace` cannot change a function's return type (we're adding two
-- columns), so drop the 20260721 definition first, then recreate. Idempotent.
drop function if exists public.admin_founder_registrants();

create or replace function public.admin_founder_registrants()
returns table (
  id                 uuid,
  full_name          text,
  email              text,
  phone              text,
  service_area       text,
  relationship       text,
  plan_id            text,
  sub_status         text,
  ref                text,
  registered_at      timestamptz,
  followed_up        boolean,
  followed_up_at     timestamptz,
  notes              text,
  is_founding_member boolean,
  founding_number    integer
)
language sql
security definer
set search_path = public
as $$
  select
    p.id,
    p.full_name,
    u.email::text,
    coalesce(nullif(btrim(p.phone), ''), nullif(btrim(p.whatsapp_number), '')),
    -- founder registrants store a service area; founding members store a location
    -- in `address` — fall back to it so their city still shows.
    coalesce(nullif(btrim(p.founder_service_area), ''), nullif(btrim(p.address), '')),
    p.founder_relationship,
    s.plan_id,
    s.status,
    p.founder_ref,
    -- founding members predate `founder_registered_at`; use their founding date.
    coalesce(p.founder_registered_at, p.founding_date, p.created_at),
    p.founder_followed_up,
    p.founder_followed_up_at,
    p.founder_notes,
    coalesce(p.is_founding_member, false),
    p.founding_number
  from public.profiles p
  join auth.users u on u.id = p.id
  left join public.subscriptions s on s.user_id = p.id
  where (p.founder_prelaunch = true or p.is_founding_member = true)
    and public.is_admin()
  -- founding members first (by their number 1..N), then funnel registrants newest-first.
  order by
    coalesce(p.is_founding_member, false) desc,
    p.founding_number asc nulls last,
    coalesce(p.founder_registered_at, p.founding_date, p.created_at) desc nulls last;
$$;

revoke all on function public.admin_founder_registrants() from public, anon;
grant execute on function public.admin_founder_registrants() to authenticated;
