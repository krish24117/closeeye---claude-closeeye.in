-- Escalation Matrix, Phase 1 — incident lifecycle + ownership (CloseEye Connect,
-- Emergency Coordination pillar).
--
-- A red-flag emergency alerts the care team but is never explicitly OWNED — no human
-- acknowledges it, and nothing knows when it's handled. These fields give an escalated
-- query a lifecycle: open -> acknowledged (a human owns it) -> resolved.
--
-- Extends the incident fields already on member_queries (escalated_at,
-- escalation_category, escalation_delivered). No new table. Reads are already allowed
-- for the assigned PM (20260709160000) + admin; the WRITES go through gated RPCs below
-- so we don't broaden member_queries UPDATE RLS. Idempotent.
alter table public.member_queries
  add column if not exists acknowledged_at timestamptz,
  add column if not exists acknowledged_by uuid references auth.users(id) on delete set null,
  add column if not exists resolved_at     timestamptz,
  add column if not exists resolved_by     uuid references auth.users(id) on delete set null;

-- Fast lookup of OPEN incidents (escalated, not yet resolved) for the Escalations view.
create index if not exists member_queries_open_incident_idx
  on public.member_queries (escalated_at desc)
  where escalated_at is not null and resolved_at is null;

-- Acknowledge an incident: "I've got this." Security-definer + can_manage_family() gate,
-- so only the assigned Presence Manager (or a Super Admin) can own a family's incident.
-- auth.uid() inside a security-definer function is still the CALLER, so the gate is real.
create or replace function public.acknowledge_incident(p_query_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_family uuid;
begin
  select user_id into v_family from public.member_queries where id = p_query_id;
  if v_family is null then
    raise exception 'Incident not found';
  end if;
  if not public.can_manage_family(v_family) then
    raise exception 'Not authorized to manage this family';
  end if;
  update public.member_queries
    set acknowledged_at = coalesce(acknowledged_at, now()),
        acknowledged_by = coalesce(acknowledged_by, auth.uid())
    where id = p_query_id;
end;
$$;

-- Resolve an incident: it's handled and can leave the active queue. Resolving implies
-- acknowledgement, so it back-fills ack if the owner skipped that step.
create or replace function public.resolve_incident(p_query_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_family uuid;
begin
  select user_id into v_family from public.member_queries where id = p_query_id;
  if v_family is null then
    raise exception 'Incident not found';
  end if;
  if not public.can_manage_family(v_family) then
    raise exception 'Not authorized to manage this family';
  end if;
  update public.member_queries
    set resolved_at      = now(),
        resolved_by      = auth.uid(),
        acknowledged_at  = coalesce(acknowledged_at, now()),
        acknowledged_by  = coalesce(acknowledged_by, auth.uid())
    where id = p_query_id;
end;
$$;

grant execute on function public.acknowledge_incident(uuid) to authenticated;
grant execute on function public.resolve_incident(uuid) to authenticated;
