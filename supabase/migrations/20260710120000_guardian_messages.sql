-- =====================================================================
-- Module 4 — Guardian ↔ Presence Manager messaging.
--
-- A parallel to the family `messages` table, but keyed by companion_id (= the
-- guardian's auth uid) instead of a loved_one. A Guardian↔PM conversation isn't
-- about any one family, so it gets its own table rather than bending the
-- loved_one-scoped `messages` schema. Mirrors messages 1:1 (sender enum,
-- attachment fields, read_at, realtime, a summaries RPC).
--
-- RLS: a guardian sees ONLY their own thread (companion_id = auth.uid()); staff
-- see guardians serving their assigned families (Super Admin = all) via a new
-- can_manage_guardian() that reuses the exact bookings.companion_id +
-- can_access_loved_one() predicate already proven in "companions: manager read".
--
-- Run via the Supabase SQL Editor or `supabase db push`. Idempotent.
-- =====================================================================

create table if not exists public.guardian_messages (
  id              uuid primary key default gen_random_uuid(),
  companion_id    uuid not null references public.companions(id) on delete cascade, -- the guardian; == auth.uid()
  sender          text not null check (sender in ('guardian', 'closeeye', 'system')),
  body            text,
  attachment_url  text,
  attachment_type text check (attachment_type in ('image', 'pdf', 'audio')),
  read_at         timestamptz,   -- when the GUARDIAN read an inbound (non-guardian) message
  created_at      timestamptz not null default now(),
  constraint guardian_messages_body_or_attachment check (body is not null or attachment_url is not null)
);

create index if not exists guardian_messages_companion_created_idx
  on public.guardian_messages (companion_id, created_at);

-- Staff who manage a family this guardian serves (mirrors can_manage_family, but
-- for a guardian). SECURITY DEFINER so it can read bookings without recursion.
create or replace function public.can_manage_guardian(p_companion_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select public.is_admin() or exists (
    select 1 from public.bookings b
    where b.companion_id = p_companion_id
      and public.can_access_loved_one(b.loved_one_id)   -- composes pm_manages_family
  );
$$;
grant execute on function public.can_manage_guardian(uuid) to authenticated, anon;

alter table public.guardian_messages enable row level security;

-- Guardian sees their own thread; staff see guardians serving their families.
drop policy if exists "Guardian messages: read own or manager" on public.guardian_messages;
create policy "Guardian messages: read own or manager"
  on public.guardian_messages for select
  using (companion_id = auth.uid() or public.can_manage_guardian(companion_id));

-- Guardian sends only into their own thread, tagged sender='guardian'.
drop policy if exists "Guardian messages: guardian send own" on public.guardian_messages;
create policy "Guardian messages: guardian send own"
  on public.guardian_messages for insert
  with check (companion_id = auth.uid() and sender = 'guardian');

-- Guardian stamps read_at on inbound rows; staff may update too.
drop policy if exists "Guardian messages: mark read" on public.guardian_messages;
create policy "Guardian messages: mark read"
  on public.guardian_messages for update
  using (companion_id = auth.uid() or public.can_manage_guardian(companion_id))
  with check (companion_id = auth.uid() or public.can_manage_guardian(companion_id));

-- Staff full manage (their 'closeeye' replies + any 'system' inserts).
drop policy if exists "Guardian messages: manager manage" on public.guardian_messages;
create policy "Guardian messages: manager manage"
  on public.guardian_messages for all
  using (public.can_manage_guardian(companion_id))
  with check (public.can_manage_guardian(companion_id));

-- Realtime (same guarded pattern as messages.sql).
do $$
begin
  alter publication supabase_realtime add table public.guardian_messages;
exception
  when duplicate_object then null;
end $$;

-- One row per guardian thread (latest message + count + guardian name), newest
-- first. SECURITY INVOKER → the SELECT RLS above scopes Super Admin=all /
-- PM=guardians serving their families. Clone of admin_thread_summaries.
create or replace function public.guardian_thread_summaries(p_limit int default 200)
returns table (
  companion_id uuid, guardian_name text, guardian_city text,
  last_message_id uuid, last_sender text, last_body text, last_attachment_type text,
  last_created_at timestamptz, awaiting_reply boolean, message_count bigint
)
language sql stable security invoker set search_path = public
as $$
  with ranked as (
    select m.*,
      row_number() over (partition by m.companion_id order by m.created_at desc) as rn,
      count(*)     over (partition by m.companion_id)                            as cnt
    from public.guardian_messages m
  )
  select
    r.companion_id,
    coalesce(c.full_name, 'Guardian') as guardian_name,
    c.city as guardian_city,
    r.id as last_message_id, r.sender as last_sender, r.body as last_body,
    r.attachment_type as last_attachment_type, r.created_at as last_created_at,
    (r.sender = 'guardian') as awaiting_reply, r.cnt as message_count
  from ranked r
  left join public.companions c on c.id = r.companion_id
  where r.rn = 1
  order by r.created_at desc
  limit greatest(p_limit, 1);
$$;
grant execute on function public.guardian_thread_summaries(int) to authenticated;
