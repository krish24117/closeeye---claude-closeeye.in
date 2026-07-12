-- =====================================================================
-- Durable wellbeing-data consent log (DPDP).
--
-- The membership pre-payment gate (components/family/membership-prepare.tsx) asks the
-- family to consent to Close Eye holding their loved one's wellbeing / health details
-- before we store them. v1 recorded that consent only in localStorage — not auditable
-- and lost on a device change. This table is the durable, append-only record: who
-- consented, to what, which policy version, and when. A withdrawal is recorded as a
-- new granted=false row (the log is never mutated). Additive + idempotent.
-- =====================================================================

create table if not exists public.consents (
  id             uuid primary key default gen_random_uuid(),
  -- The family member who consented. CASCADE: a deleted account's consents go with it
  -- (the elder data they cover is deleted too).
  user_id        uuid not null references auth.users(id) on delete cascade,
  -- The loved one the consent is about. SET NULL so removing a loved one never blocks,
  -- and the historical record de-links rather than disappearing.
  loved_one_id   uuid references public.loved_ones(id) on delete set null,
  consent_type   text not null,                  -- e.g. 'wellbeing_data'
  policy_version text not null,                   -- e.g. 'v1'
  granted        boolean not null default true,   -- false = a recorded withdrawal
  created_at     timestamptz not null default now()
);

alter table public.consents enable row level security;

-- A family may record and read their OWN consents. The log is append-only from the
-- client — no update/delete policy — so a withdrawal is a new granted=false row, never
-- an edit of history.
drop policy if exists "consents: insert own" on public.consents;
create policy "consents: insert own"
  on public.consents for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "consents: select own" on public.consents;
create policy "consents: select own"
  on public.consents for select to authenticated
  using (user_id = auth.uid());

-- Care Team (admins) can read all consents for compliance / audit.
drop policy if exists "consents: admin read" on public.consents;
create policy "consents: admin read"
  on public.consents for select using (public.is_admin());

create index if not exists consents_user_type_idx on public.consents (user_id, consent_type, created_at desc);
create index if not exists consents_loved_one_idx on public.consents (loved_one_id);
