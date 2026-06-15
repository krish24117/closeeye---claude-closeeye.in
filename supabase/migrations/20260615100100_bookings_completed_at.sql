-- =====================================================================
-- Add bookings.completed_at, auto-stamped when status transitions
-- to/from 'completed'.
--
-- The companion Earnings page selects/orders by completed_at to show
-- when each completed visit happened - the column never existed.
--
-- Run via the Supabase SQL Editor or `supabase db push`.
-- Safe to re-run: "add column if not exists", function uses
-- "create or replace", trigger is dropped and recreated.
-- =====================================================================

alter table public.bookings
  add column if not exists completed_at timestamptz;

create or replace function public.set_booking_completed_at()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'completed' and old.status is distinct from 'completed' then
    new.completed_at := now();
  elsif new.status <> 'completed' and old.status = 'completed' then
    new.completed_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists bookings_set_completed_at on public.bookings;
create trigger bookings_set_completed_at
  before update on public.bookings
  for each row
  when (new.status is distinct from old.status)
  execute function public.set_booking_completed_at();
