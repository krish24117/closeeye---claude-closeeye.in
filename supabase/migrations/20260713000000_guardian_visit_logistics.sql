-- =====================================================================
-- B1 — Guardian visit logistics reach the person performing the visit.
--
-- The family enters per-visit logistics on booking_requests (recipient_address
-- + visit_landmark / visit_contact_* / visit_time_window / visit_access_*
-- / visit_map_link / visit_special_instructions). The materialise trigger
-- (20260709000000) copied only scheduled_at + notes into `bookings`, and
-- lib/db/guardian.ts reads the visit address from the loved_ones PROFILE — so
-- none of the per-visit detail ever reached the Guardian, who was dispatched to
-- the profile city with no street / gate code / on-site contact / map pin.
--
-- The Guardian reads `bookings` under RLS (companion_id = current_companion_id()),
-- NOT the family-owned booking_requests. So the fix materialises the per-visit
-- logistics onto `bookings` (frozen at payment time — after payment the family
-- can no longer edit the request), and lib/db/guardian.ts prefers them over the
-- profile. Additive + idempotent. Run via `supabase db push` / GitHub integration.
-- =====================================================================

-- 1) Per-visit logistics columns on the Guardian-readable bookings table.
alter table public.bookings add column if not exists visit_address              text;
alter table public.bookings add column if not exists visit_landmark             text;
alter table public.bookings add column if not exists visit_contact_name         text;
alter table public.bookings add column if not exists visit_contact_phone        text;
alter table public.bookings add column if not exists visit_time_window          text;
alter table public.bookings add column if not exists visit_access_instructions  text;
alter table public.bookings add column if not exists visit_map_link             text;
alter table public.bookings add column if not exists visit_special_instructions text;

-- 2) Materialise the logistics onto the booking. Same guard/behaviour as
--    20260709000000 — only the INSERT column set is extended (nothing removed),
--    so the existing 'paid' → bookings flow is unchanged.
create or replace function public.materialize_booking_from_request()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking_id uuid;
begin
  if new.status = 'paid'
     and new.booking_id is null
     and new.loved_one_id is not null
     and (old.status is distinct from 'paid')
  then
    insert into public.bookings (
      family_user_id, loved_one_id, service_type, amount_paise,
      status, payment_status, scheduled_at, special_instructions,
      visit_address, visit_landmark, visit_contact_name, visit_contact_phone,
      visit_time_window, visit_access_instructions, visit_map_link,
      visit_special_instructions
    ) values (
      new.user_id,
      new.loved_one_id,
      coalesce(new.service_id, 'companion_visit_single'),
      coalesce(new.amount_paise, 0),
      'confirmed',            -- ready for a companion to be assigned
      'paid',
      new.scheduled_at,
      new.notes,
      new.recipient_address,
      new.visit_landmark,
      new.visit_contact_name,
      new.visit_contact_phone,
      new.visit_time_window,
      new.visit_access_instructions,
      new.visit_map_link,
      new.visit_special_instructions
    )
    returning id into v_booking_id;

    new.booking_id := v_booking_id;
  end if;

  return new;
end
$$;

-- The trigger (trg_materialize_booking) calls the function by name — replacing
-- the function above is sufficient; no drop/recreate of the trigger needed.

-- 3) Backfill bookings already materialised before this migration, from their
--    linked request. coalesce() keeps any existing value, so re-running is safe.
update public.bookings b
set
  visit_address              = coalesce(b.visit_address,              br.recipient_address),
  visit_landmark             = coalesce(b.visit_landmark,             br.visit_landmark),
  visit_contact_name         = coalesce(b.visit_contact_name,         br.visit_contact_name),
  visit_contact_phone        = coalesce(b.visit_contact_phone,        br.visit_contact_phone),
  visit_time_window          = coalesce(b.visit_time_window,          br.visit_time_window),
  visit_access_instructions  = coalesce(b.visit_access_instructions,  br.visit_access_instructions),
  visit_map_link             = coalesce(b.visit_map_link,             br.visit_map_link),
  visit_special_instructions = coalesce(b.visit_special_instructions, br.visit_special_instructions)
from public.booking_requests br
where br.booking_id = b.id;
