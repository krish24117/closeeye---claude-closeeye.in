-- =====================================================================
-- Family Dashboard: two user experiences (NRI family vs society member).
-- Adds profiles.user_type, society_members, member_queries, health_tips.
-- Idempotent.
-- =====================================================================

-- ── profiles.user_type ───────────────────────────────────────────────
alter table public.profiles
  add column if not exists user_type text not null default 'society'
  check (user_type in ('nri', 'society'));

-- Anyone who has registered a loved one is treated as an NRI family.
update public.profiles p
  set user_type = 'nri'
  where p.user_type <> 'nri'
    and exists (select 1 from public.loved_ones lo where lo.family_user_id = p.id);

-- ── society_members ──────────────────────────────────────────────────
create table if not exists public.society_members (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  name              text not null,
  mobile            text,
  society_name      text,
  flat_number       text,
  area              text,
  member_id         text unique,
  membership_status text not null default 'active',
  created_at        timestamptz not null default now()
);
alter table public.society_members enable row level security;

drop policy if exists "society_members: own read" on public.society_members;
create policy "society_members: own read"
  on public.society_members for select using (auth.uid() = user_id);

drop policy if exists "society_members: own upsert" on public.society_members;
create policy "society_members: own upsert"
  on public.society_members for insert with check (auth.uid() = user_id);

drop policy if exists "society_members: own update" on public.society_members;
create policy "society_members: own update"
  on public.society_members for update using (auth.uid() = user_id);

drop policy if exists "society_members: admin all" on public.society_members;
create policy "society_members: admin all"
  on public.society_members for all using (public.is_admin()) with check (public.is_admin());

-- ── member_queries (health questions; AI draft + doctor review) ───────
create table if not exists public.member_queries (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  loved_one_id  uuid references public.loved_ones(id) on delete set null,
  subject_label text,                       -- e.g. elder name, or "My Child"
  question      text not null,
  ai_answer     text,                       -- Claude draft
  answer        text,                       -- final / doctor-edited answer
  status        text not null default 'pending'
                  check (status in ('pending', 'ai_answered', 'doctor_reviewed')),
  reviewed_by   text,
  helpful       boolean,
  created_at    timestamptz not null default now(),
  answered_at   timestamptz
);
alter table public.member_queries enable row level security;

drop policy if exists "member_queries: own read" on public.member_queries;
create policy "member_queries: own read"
  on public.member_queries for select using (auth.uid() = user_id);

drop policy if exists "member_queries: own insert" on public.member_queries;
create policy "member_queries: own insert"
  on public.member_queries for insert with check (auth.uid() = user_id);

drop policy if exists "member_queries: own update" on public.member_queries;
create policy "member_queries: own update"
  on public.member_queries for update using (auth.uid() = user_id);

drop policy if exists "member_queries: admin all" on public.member_queries;
create policy "member_queries: admin all"
  on public.member_queries for all using (public.is_admin()) with check (public.is_admin());

-- ── health_tips (rotated daily on the society home) ──────────────────
create table if not exists public.health_tips (
  id         uuid primary key default gen_random_uuid(),
  day_index  int check (day_index between 0 and 6),
  tip        text not null,
  created_at timestamptz not null default now()
);
alter table public.health_tips enable row level security;

drop policy if exists "health_tips: public read" on public.health_tips;
create policy "health_tips: public read"
  on public.health_tips for select to anon, authenticated using (true);

insert into public.health_tips (day_index, tip)
select * from (values
  (0, 'A 20-minute walk most days helps blood pressure, mood, and sleep for the whole family.'),
  (1, 'Keep a simple medicine chart on the fridge — it cuts missed doses more than any reminder app.'),
  (2, 'Hydration first: many ''dizzy spells'' in elders are simply not enough water through the day.'),
  (3, 'Good light + clear floors prevent most home falls. Tape down loose rugs and add a night light.'),
  (4, 'Annual eye and hearing checks matter — small declines quietly affect balance and confidence.'),
  (5, 'A short daily phone call does real good: connection is one of the strongest protectors of health.'),
  (6, 'Protein at breakfast (eggs, dal, curd) steadies energy and helps older adults keep muscle.')
) as t(day_index, tip)
where not exists (select 1 from public.health_tips);
