-- Ask Close Eye · leads table
-- Captures buying intent from the service track (pricing / sign-up / "how to start" questions).
-- parent_id references loved_ones (not care_profiles — that table does not exist in this schema).

create table if not exists public.leads (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users(id) on delete set null,
  loved_one_id uuid references public.loved_ones(id) on delete set null,
  question     text,
  intent       text not null default 'signup',   -- signup | sales_call | info
  status       text not null default 'new',
  created_at   timestamptz not null default now()
);

alter table public.leads enable row level security;

create policy "users_read_own_leads"
  on public.leads for select
  using (auth.uid() = user_id);

-- Service role bypasses RLS for inserts from the edge function.
