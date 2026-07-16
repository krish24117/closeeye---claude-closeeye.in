-- CloseEye — bound the understanding_log write path.
--
-- understanding_log is deliberately WRITE-ONLY for anon (`with check (true)`) — visitors
-- append, only admins read. That openness is correct, but it means the insert never passes
-- through an edge function, so the middleware in supabase/functions/_shared/ratelimit.ts
-- cannot see it. The cap therefore has to live where the write lands: a BEFORE INSERT
-- trigger, reusing the same rate_limit_hit token bucket so there is ONE limiter, not two.
--
-- WHY THIS ONE ENFORCES INSTEAD OF LOGGING FIRST (unlike the edge guards):
-- dropping a telemetry row has no family-visible effect. The client
-- (lib/connect/log.ts) is fire-and-forget and already ignores the outcome, so a dropped
-- row costs us a metric we didn't need — it can never turn a real family away. The caps
-- below sit orders of magnitude above real traffic; the realistic thing they stop is a
-- client bug looping inserts, or someone padding the table we seed regression tests from.
--
-- Drops are NOT silent to us: each raises a warning into the Postgres logs.

create or replace function public.understanding_log_guard()
returns trigger
language plpgsql
security definer          -- so anon's insert may call the SECURITY DEFINER bucket
set search_path = public
as $$
declare
  v_session json;
  v_global  json;
begin
  -- Bound the row itself: the client already truncates, but the client is not the authority.
  new.raw_text   := left(coalesce(new.raw_text, ''), 2000);
  new.session_id := left(coalesce(new.session_id, 'unknown'), 64);

  -- Per-session: stops a runaway loop from one browser. Far above a real conversation.
  v_session := public.rate_limit_hit('ulog:session:' || new.session_id, 40, 3600);
  if not (v_session->>'allowed')::boolean then
    raise warning 'understanding_log: per-session cap hit — event dropped';
    return null;
  end if;

  -- Global: the backstop against a rotating-session flood. Bounds worst-case storage and
  -- keeps our quality metrics from being poisoned by one actor.
  v_global := public.rate_limit_hit('ulog:global', 5000, 3600);
  if not (v_global->>'allowed')::boolean then
    raise warning 'understanding_log: global cap hit — event dropped';
    return null;
  end if;

  return new;
end;
$$;

drop trigger if exists understanding_log_guard_trg on public.understanding_log;
create trigger understanding_log_guard_trg
  before insert on public.understanding_log
  for each row execute function public.understanding_log_guard();
