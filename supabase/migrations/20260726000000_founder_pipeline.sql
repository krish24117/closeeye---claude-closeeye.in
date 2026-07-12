-- =====================================================================
-- Founder CRM — persisted pipeline stage + lead source.
--
-- The founder pipeline (admin_founder_registrants, powering /admin/founder) had a
-- DERIVED status only (founding/activated/waiting/new/follow_up) and no way to record
-- the SALES stage a lead is actually in, nor WHERE it came from. This adds two
-- founder-settable columns on profiles (mirroring founder_followed_up/founder_notes)
-- and widens the RPC to return them. The lead SCORE stays computed in code (always
-- fresh, no stored drift). Additive + idempotent. No pricing / payment / positioning
-- logic touched — display + attribution only.
-- =====================================================================

alter table public.profiles add column if not exists founder_stage  text;  -- new|qualified|conversation|offer|referred ('won' is derived from a live subscription)
alter table public.profiles add column if not exists founder_source text;  -- referral|rwa|hospital|nri_group|linkedin|temple|corporate|organic|other

-- Widen the registrant RPC to return the two new columns. `create or replace` cannot
-- change a function's return type, so drop first (per the 20260724 pattern). The body
-- is otherwise identical to 20260724.
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
  founding_number    integer,
  founder_stage      text,
  founder_source     text
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
    coalesce(nullif(btrim(p.founder_service_area), ''), nullif(btrim(p.address), '')),
    p.founder_relationship,
    s.plan_id,
    s.status,
    p.founder_ref,
    coalesce(p.founder_registered_at, p.founding_date, p.created_at),
    p.founder_followed_up,
    p.founder_followed_up_at,
    p.founder_notes,
    coalesce(p.is_founding_member, false),
    p.founding_number,
    p.founder_stage,
    p.founder_source
  from public.profiles p
  join auth.users u on u.id = p.id
  left join public.subscriptions s on s.user_id = p.id
  where (p.founder_prelaunch = true or p.is_founding_member = true)
    and public.is_admin()
  order by
    coalesce(p.is_founding_member, false) desc,
    p.founding_number asc nulls last,
    coalesce(p.founder_registered_at, p.founding_date, p.created_at) desc nulls last;
$$;

revoke all on function public.admin_founder_registrants() from public, anon;
grant execute on function public.admin_founder_registrants() to authenticated;
