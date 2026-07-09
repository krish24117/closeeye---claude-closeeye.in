-- =====================================================================
-- CloseEye Connect — System Care Updates (Increment 2, part 1)
--
-- Emit sender='system' messages into the family's Connect thread on real care
-- events, so Connect becomes a live feed. NO new tables — the `messages` table
-- already allows sender='system' and renders it as a centered note. Triggers are
-- SECURITY DEFINER (the guardian/companion has no RLS to write a family's thread)
-- and every insert is exception-guarded so a care-update failure can NEVER block
-- the underlying visit/booking write. Idempotent.
-- =====================================================================

-- ── Visit completed → the care report is ready ────────────────────────
-- Fires on the visits INSERT (submitVisitReport). Because that write is an
-- upsert on booking_id, AFTER INSERT fires once per booking (not on re-submit).
create or replace function public.emit_visit_completed_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_family uuid;
  v_loved  uuid;
  v_name   text;
begin
  if new.booking_id is null then return new; end if;
  select b.family_user_id, b.loved_one_id into v_family, v_loved
    from public.bookings b where b.id = new.booking_id;
  if v_family is null or v_loved is null then return new; end if;
  select split_part(coalesce(full_name, ''), ' ', 1) into v_name
    from public.loved_ones where id = v_loved;
  begin
    insert into public.messages (family_user_id, loved_one_id, sender, body)
    values (
      v_family, v_loved, 'system',
      coalesce(nullif(v_name, ''), 'Your family member')
        || '''s visit is complete — the care report is ready to view.'
    );
  exception when others then
    null; -- never block the visit write on a care-update failure
  end;
  return new;
end;
$$;

drop trigger if exists visits_emit_completed_update on public.visits;
create trigger visits_emit_completed_update
  after insert on public.visits
  for each row execute function public.emit_visit_completed_update();

-- ── Guardian arrived → the visit has started (bookings.status → in_progress) ──
create or replace function public.emit_visit_started_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
begin
  if new.status = 'in_progress'
     and old.status is distinct from 'in_progress'
     and new.family_user_id is not null
     and new.loved_one_id is not null then
    select split_part(coalesce(full_name, ''), ' ', 1) into v_name
      from public.loved_ones where id = new.loved_one_id;
    begin
      insert into public.messages (family_user_id, loved_one_id, sender, body)
      values (
        new.family_user_id, new.loved_one_id, 'system',
        coalesce(nullif(v_name, ''), 'Your family member')
          || '''s visit has started — your guardian has arrived.'
      );
    exception when others then
      null;
    end;
  end if;
  return new;
end;
$$;

drop trigger if exists bookings_emit_started_update on public.bookings;
create trigger bookings_emit_started_update
  after update of status on public.bookings
  for each row execute function public.emit_visit_started_update();
