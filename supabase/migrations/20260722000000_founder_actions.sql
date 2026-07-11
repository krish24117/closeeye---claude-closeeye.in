-- Founder ops — log the founder's outbound actions (call / WhatsApp / email taps)
-- per registrant. Powers the Today's-Calls / Today's-WhatsApps KPIs, the
-- "reached" coverage metric, and the per-family timeline. Admin-only, append-only.
-- Idempotent.

create table if not exists public.founder_actions (
  id            uuid primary key default gen_random_uuid(),
  registrant_id uuid not null references auth.users(id) on delete cascade,
  action_type   text not null check (action_type in ('call', 'whatsapp', 'email', 'followed_up', 'note')),
  created_at    timestamptz not null default now()
);

alter table public.founder_actions enable row level security;

drop policy if exists "founder_actions: admin insert" on public.founder_actions;
create policy "founder_actions: admin insert"
  on public.founder_actions for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "founder_actions: admin read" on public.founder_actions;
create policy "founder_actions: admin read"
  on public.founder_actions for select
  to authenticated
  using (public.is_admin());

create index if not exists founder_actions_reg_idx on public.founder_actions (registrant_id, created_at desc);
create index if not exists founder_actions_created_idx on public.founder_actions (created_at desc);
