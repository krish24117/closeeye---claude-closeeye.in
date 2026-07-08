-- ───────────────────────────────────────────────────────────────────────
-- Ask Close Eye · Triage schema
-- Adjust to fit your existing tables. The edge function uses the service-role
-- key and bypasses RLS, but RLS still protects any direct client access.
-- ───────────────────────────────────────────────────────────────────────

-- Parent care profiles (the context that powers personalised answers).
-- If you already have an equivalent table, keep yours and skip this block.
create table if not exists public.care_profiles (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  parent_name  text not null,
  age          int,
  conditions   text[]  not null default '{}',
  medications  text[]  not null default '{}',
  city         text,
  lat          double precision,
  lng          double precision,
  tier         text not null default 'free',  -- 'free' | 'founding' | 'care'
  created_at   timestamptz not null default now()
);

-- Recent vitals/readings, surfaced into the prompt context.
create table if not exists public.vitals (
  id         uuid primary key default gen_random_uuid(),
  parent_id  uuid not null references public.care_profiles (id) on delete cascade,
  type       text not null,          -- 'bp' | 'glucose' | 'spo2' | ...
  value      text not null,          -- '165/102'
  unit       text,
  taken_at   timestamptz not null default now()
);
create index if not exists vitals_parent_time_idx on public.vitals (parent_id, taken_at desc);

-- Every question logged with its lane + topic. Powers the cap and the scan.
create table if not exists public.questions_log (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete cascade,
  parent_id      uuid not null references public.care_profiles (id) on delete cascade,
  question       text not null,
  lane           text not null,      -- 'inform' | 'connect' | 'escalate'
  topic          text not null,
  requires_human boolean not null default false,
  created_at     timestamptz not null default now()
);
create index if not exists qlog_user_time_idx   on public.questions_log (user_id, lane, created_at desc);
create index if not exists qlog_parent_topic_idx on public.questions_log (parent_id, topic, created_at desc);

-- Lane-2 consult requests created when a doctor is offered.
create table if not exists public.consult_requests (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  parent_id       uuid not null references public.care_profiles (id) on delete cascade,
  source_question text,
  status          text not null default 'requested',  -- requested | scheduled | done | cancelled
  created_at      timestamptz not null default now()
);

-- Care-intelligence flags raised by the scan (Flow D).
create table if not exists public.care_flags (
  id          uuid primary key default gen_random_uuid(),
  parent_id   uuid not null references public.care_profiles (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  topic       text not null,
  window_days int not null,
  count       int not null,
  status      text not null default 'open',  -- open | actioned | dismissed
  created_at  timestamptz not null default now()
);
create index if not exists care_flags_open_idx on public.care_flags (parent_id, topic, status);

-- ── Row Level Security ──────────────────────────────────────────────────
alter table public.care_profiles   enable row level security;
alter table public.vitals          enable row level security;
alter table public.questions_log   enable row level security;
alter table public.consult_requests enable row level security;
alter table public.care_flags      enable row level security;

-- Users can read their own rows. (Service role bypasses RLS for the function.)
create policy "own care_profiles" on public.care_profiles
  for select using (auth.uid() = user_id);
create policy "own questions" on public.questions_log
  for select using (auth.uid() = user_id);
create policy "own consults" on public.consult_requests
  for select using (auth.uid() = user_id);
create policy "own flags" on public.care_flags
  for select using (auth.uid() = user_id);
create policy "own vitals" on public.vitals
  for select using (
    exists (select 1 from public.care_profiles p
            where p.id = vitals.parent_id and p.user_id = auth.uid())
  );
