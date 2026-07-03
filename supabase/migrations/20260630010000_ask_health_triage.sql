-- Ask Close Eye · Triage schema
-- Adds 4 tables: vitals, questions_log, consult_requests, care_flags.
-- All loved_one_id FKs are nullable — society users (no registered parent) can still ask.
-- The edge function uses service-role key and bypasses RLS; RLS protects direct client reads.

-- Recent vitals/readings surfaced into the parent context (always has a parent)
create table if not exists public.vitals (
  id           uuid primary key default gen_random_uuid(),
  loved_one_id uuid not null references public.loved_ones(id) on delete cascade,
  type         text not null,     -- 'bp' | 'glucose' | 'spo2' | ...
  value        text not null,     -- '165/102'
  unit         text,
  taken_at     timestamptz not null default now()
);
create index if not exists vitals_parent_time_idx on public.vitals (loved_one_id, taken_at desc);

-- Every question logged with its lane + topic (powers cap + intelligence scan)
create table if not exists public.questions_log (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  loved_one_id   uuid references public.loved_ones(id) on delete set null,
  question       text not null,
  lane           text not null,   -- 'inform' | 'connect' | 'escalate'
  topic          text not null,
  requires_human boolean not null default false,
  created_at     timestamptz not null default now()
);
create index if not exists qlog_user_time_idx    on public.questions_log (user_id, lane, created_at desc);
create index if not exists qlog_parent_topic_idx on public.questions_log (loved_one_id, topic, created_at desc);

-- Lane-2 consult requests created when a doctor is offered
create table if not exists public.consult_requests (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  loved_one_id    uuid references public.loved_ones(id) on delete set null,
  source_question text,
  status          text not null default 'requested',  -- requested | scheduled | done | cancelled
  created_at      timestamptz not null default now()
);

-- Care-intelligence flags raised by the daily scan (Flow D)
create table if not exists public.care_flags (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  loved_one_id uuid references public.loved_ones(id) on delete set null,
  topic        text not null,
  window_days  int not null,
  count        int not null,
  status       text not null default 'open',  -- open | actioned | dismissed
  created_at   timestamptz not null default now()
);
create index if not exists care_flags_open_idx on public.care_flags (loved_one_id, topic, status);

-- RLS: users read their own rows; edge function service-role bypasses all policies
alter table public.vitals           enable row level security;
alter table public.questions_log    enable row level security;
alter table public.consult_requests enable row level security;
alter table public.care_flags       enable row level security;

create policy "own vitals" on public.vitals
  for select using (
    exists (select 1 from public.loved_ones l
            where l.id = vitals.loved_one_id and l.family_user_id = auth.uid())
  );
create policy "own questions_log" on public.questions_log
  for select using (auth.uid() = user_id);
create policy "own consult_requests" on public.consult_requests
  for select using (auth.uid() = user_id);
create policy "own care_flags" on public.care_flags
  for select using (auth.uid() = user_id);
