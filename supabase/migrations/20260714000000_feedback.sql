-- =====================================================================
-- B3 — persist feedback submissions.
--
-- The public /feedback page (footer-linked on every page) previously only fired
-- a haptic + a success screen — no insert, no edge call — so every submission,
-- including a care/safety complaint, was silently discarded while the family was
-- told "your feedback goes straight to the team".
--
-- This table stores each submission (public insert, admin read), mirroring the
-- proven companion_applications pattern. Additive + idempotent.
-- =====================================================================

create table if not exists public.feedback (
  id          uuid primary key default gen_random_uuid(),
  -- Best-effort attribution: set to the signed-in user when present, else null.
  -- SET NULL on delete so it never blocks account deletion and de-identifies on it.
  user_id     uuid references auth.users(id) on delete set null,
  rating      integer,        -- 1..5 stars, null if not given
  nps         integer,        -- 0..10 recommend score, null if not given
  category    text,           -- what it's about (Overall / A visit / A Guardian / …)
  kind        text,           -- 'praise' | 'bug' | 'idea'
  message     text,
  created_at  timestamptz default now()
);

alter table public.feedback enable row level security;

-- Anyone (logged in or not) may submit feedback — but may only attribute it to
-- themselves: an anon caller (auth.uid() is null) must send a null user_id, so a
-- forged user_id is rejected.
drop policy if exists "feedback: public insert" on public.feedback;
create policy "feedback: public insert"
  on public.feedback for insert to anon, authenticated
  with check (user_id is null or user_id = auth.uid());

-- Only the Care Team (admins) can read submissions.
drop policy if exists "feedback: admin read" on public.feedback;
create policy "feedback: admin read"
  on public.feedback for select using (public.is_admin());

create index if not exists feedback_created_at_idx on public.feedback (created_at desc);
