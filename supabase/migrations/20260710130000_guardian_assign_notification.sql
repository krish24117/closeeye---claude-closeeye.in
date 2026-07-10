-- =====================================================================
-- Guardian notifications — alert a Guardian when they're assigned a visit.
--
-- Reuses the existing notifications table (user_id-scoped; a guardian's auth uid
-- == companions.id, and the existing "read own" / "mark read own" policies
-- already cover guardians — NO RLS change). A SECURITY DEFINER AFTER-UPDATE
-- trigger on bookings.companion_id fires on EVERY assign path (the console
-- assignGuardian client update, update-booking-status, the legacy Vite admin),
-- mirroring the existing bookings_set_completed_at precedent.
--
-- EXCEPTION-GUARDED: a failed notification insert must never roll back the
-- assignment itself (e.g. if notifications.type has an untracked CHECK that
-- rejects the value — 'companion_assigned' is an existing vocabulary value, but
-- the guard keeps assignment safe regardless).
--
-- Run via the Supabase SQL Editor or `supabase db push`. Idempotent.
-- =====================================================================

create or replace function public.notify_guardian_on_assign()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.companion_id is not null
     and new.companion_id is distinct from old.companion_id then
    begin
      insert into public.notifications (user_id, type, title, message, read)
      values (
        new.companion_id,                 -- = the guardian's auth uid
        'companion_assigned',
        'New visit assigned',
        'You have a new Close Eye visit. Open Today to see the details.',
        false
      );
    exception when others then
      null;  -- never let a notification failure roll back the assignment
    end;
  end if;
  return new;
end;
$$;

drop trigger if exists bookings_notify_guardian_assign on public.bookings;
create trigger bookings_notify_guardian_assign
  after update of companion_id on public.bookings
  for each row
  when (new.companion_id is distinct from old.companion_id)
  execute function public.notify_guardian_on_assign();
