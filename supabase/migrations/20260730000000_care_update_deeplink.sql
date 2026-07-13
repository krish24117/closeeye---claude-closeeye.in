-- Timeline unification (CloseEye Connect, Pillar 2): make the "care report is ready"
-- system message DEEP-LINK to the Presence Story, so the story finally lives inside
-- Connect instead of a separate Visits route.
--
-- The message already carries a (previously unused, dead) related_booking_id FK ->
-- booking_requests. The visit-completed trigger now resolves the family-facing
-- booking_request that materialised this visit (booking_requests.booking_id = the
-- visit's bookings.id, set by the materialize trigger) and records it, so
-- /family/visits/[id] opens the exact story. Recreates the function only; the trigger
-- (visits_emit_completed_update) is unchanged. Idempotent.
create or replace function public.emit_visit_completed_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_family  uuid;
  v_loved   uuid;
  v_name    text;
  v_request uuid;
begin
  if new.booking_id is null then return new; end if;
  select b.family_user_id, b.loved_one_id into v_family, v_loved
    from public.bookings b where b.id = new.booking_id;
  if v_family is null or v_loved is null then return new; end if;
  select split_part(coalesce(full_name, ''), ' ', 1) into v_name
    from public.loved_ones where id = v_loved;
  -- The family-facing booking_request that materialised this booking — the id
  -- /family/visits/[id] is keyed by, so the care-update can deep-link to the story.
  select id into v_request
    from public.booking_requests
    where booking_id = new.booking_id
    order by created_at desc
    limit 1;
  begin
    insert into public.messages (family_user_id, loved_one_id, sender, body, related_booking_id)
    values (
      v_family, v_loved, 'system',
      coalesce(nullif(v_name, ''), 'Your family member')
        || '''s visit is complete — the care report is ready to view.',
      v_request
    );
  exception when others then
    null; -- never block the visit write on a care-update failure
  end;
  return new;
end;
$$;
