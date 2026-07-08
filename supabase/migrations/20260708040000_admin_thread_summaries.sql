-- =====================================================================
-- C2 (QA) — server-side admin thread summaries.
--
-- fetchAdminThreads previously pulled EVERY message on the platform into the
-- admin browser and grouped in JS (unbounded, O(all messages)). This RPC does
-- the "one row per thread + latest message + counts" aggregation server-side and
-- returns at most p_limit thread rows.
--
-- SECURITY INVOKER (not definer) so the messages RLS still applies: a Super
-- Admin sees all threads, a Presence Manager only assigned families' threads,
-- and any non-staff caller only their own — exactly like the table policy.
--
-- Run via the Supabase SQL Editor or `supabase db push`. Idempotent.
-- =====================================================================

create or replace function public.admin_thread_summaries(p_limit int default 200)
returns table (
  loved_one_id        uuid,
  loved_one_name      text,
  family_user_id      uuid,
  family_name         text,
  last_message_id     uuid,
  last_sender         text,
  last_body           text,
  last_attachment_type text,
  last_created_at     timestamptz,
  awaiting_reply      boolean,
  message_count       bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  with ranked as (
    select
      m.*,
      row_number() over (partition by m.loved_one_id order by m.created_at desc) as rn,
      count(*)     over (partition by m.loved_one_id)                            as cnt
    from public.messages m
  )
  select
    r.loved_one_id,
    lo.full_name                       as loved_one_name,
    r.family_user_id,
    coalesce(p.full_name, 'Family')    as family_name,
    r.id                               as last_message_id,
    r.sender                           as last_sender,
    r.body                             as last_body,
    r.attachment_type                  as last_attachment_type,
    r.created_at                       as last_created_at,
    (r.sender = 'family')              as awaiting_reply,
    r.cnt                              as message_count
  from ranked r
  left join public.loved_ones lo on lo.id = r.loved_one_id
  left join public.profiles   p  on p.id  = r.family_user_id
  where r.rn = 1
  order by r.created_at desc
  limit greatest(p_limit, 1);
$$;

grant execute on function public.admin_thread_summaries(int) to authenticated;
