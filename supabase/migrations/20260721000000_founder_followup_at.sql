-- Founder ops — record WHEN a registrant was followed up (powers the
-- "Last follow-up" column + the family timeline). Extends the registrant
-- function to return it. Idempotent.

alter table public.profiles
  add column if not exists founder_followed_up_at timestamptz;

comment on column public.profiles.founder_followed_up_at is 'Founder ops: when this registrant was last marked followed up.';

create or replace function public.admin_founder_registrants()
returns table (
  id              uuid,
  full_name       text,
  email           text,
  phone           text,
  service_area    text,
  relationship    text,
  plan_id         text,
  sub_status      text,
  ref             text,
  registered_at   timestamptz,
  followed_up     boolean,
  followed_up_at  timestamptz,
  notes           text
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
    p.founder_service_area,
    p.founder_relationship,
    s.plan_id,
    s.status,
    p.founder_ref,
    p.founder_registered_at,
    p.founder_followed_up,
    p.founder_followed_up_at,
    p.founder_notes
  from public.profiles p
  join auth.users u on u.id = p.id
  left join public.subscriptions s on s.user_id = p.id
  where p.founder_prelaunch = true
    and public.is_admin()
  order by p.founder_registered_at desc nulls last;
$$;

revoke all on function public.admin_founder_registrants() from public, anon;
grant execute on function public.admin_founder_registrants() to authenticated;
