-- Founder Program — operational workspace (dashboard Phase 1).
--
-- Adds the fields the Founder ops view needs (who-is-for, follow-up flag, notes;
-- mobile reuses the existing profiles.phone), plus a SECURE admin-only function
-- that returns the founder registrants joined to their email + membership —
-- auth.users isn't readable from the browser, so a security-definer function is
-- the safe way to surface emails to the admin. Idempotent.

alter table public.profiles
  add column if not exists founder_relationship text,
  add column if not exists founder_followed_up  boolean not null default false,
  add column if not exists founder_notes         text;

comment on column public.profiles.founder_relationship is 'Who the family is registering for (optional, captured at registration).';
comment on column public.profiles.founder_followed_up is 'Founder ops: has this registrant been followed up with.';
comment on column public.profiles.founder_notes is 'Founder ops: private notes about this registrant.';

-- Admin-only registrant list (with email + plan). security definer so it can read
-- auth.users + all profiles; the is_admin() guard means a non-admin caller gets
-- zero rows. Execute granted to authenticated only.
create or replace function public.admin_founder_registrants()
returns table (
  id            uuid,
  full_name     text,
  email         text,
  phone         text,
  service_area  text,
  relationship  text,
  plan_id       text,
  sub_status    text,
  ref           text,
  registered_at timestamptz,
  followed_up   boolean,
  notes         text
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
