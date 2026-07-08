-- =====================================================================
-- Module 4 (Guardian) — the family→visit bridge.
--
-- closeeye-next family bookings live in `booking_requests` (no companion_id).
-- Guardian assignment, check-in and visit reports live on the separate,
-- pre-existing `bookings` table. There was no link between them, so a paid
-- family booking never became a visit a Guardian could see or execute.
--
-- This trigger MATERIALISES a real `bookings` row the moment a booking_request
-- becomes 'paid' (and has a linked family member), then records the new
-- bookings.id back on the request. The insert mirrors `razorpay-create-order`'s
-- proven column set exactly, so it satisfies the same NOT NULL constraints.
-- Idempotent: fires once per request (guarded on booking_id IS NULL).
--
-- SECURITY DEFINER: bookings has no client INSERT policy; the trigger inserts
-- as the definer (the same way the service-role booking flow does).
--
-- Run via the Supabase SQL Editor or `supabase db push`. Idempotent.
-- =====================================================================

alter table public.booking_requests
  add column if not exists booking_id uuid references public.bookings(id) on delete set null;
create index if not exists booking_requests_booking_id_idx on public.booking_requests(booking_id);

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
      status, payment_status, scheduled_at, special_instructions
    ) values (
      new.user_id,
      new.loved_one_id,
      coalesce(new.service_id, 'companion_visit_single'),
      coalesce(new.amount_paise, 0),
      'confirmed',            -- ready for a companion to be assigned
      'paid',
      new.scheduled_at,
      new.notes
    )
    returning id into v_booking_id;

    new.booking_id := v_booking_id;
  end if;

  return new;
end
$$;

drop trigger if exists trg_materialize_booking on public.booking_requests;
create trigger trg_materialize_booking
  before update on public.booking_requests
  for each row
  execute function public.materialize_booking_from_request();

-- Note: membership-included visits (no per-visit payment) are NOT materialised
-- by this trigger yet — extend to fire on 'companion_confirmed' when that flow
-- is designed. Phase 1 covers funded (paid) visits only.
