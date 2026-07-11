-- Founder ops — reminders / daily task list. A dated reminder against a family
-- ("call Ravi after 8PM"); due/overdue open reminders surface as Today's Tasks.
-- Admin-only. Idempotent.

create table if not exists public.founder_reminders (
  id            uuid primary key default gen_random_uuid(),
  registrant_id uuid not null references auth.users(id) on delete cascade,
  due_on        date not null,
  note          text,
  done          boolean not null default false,
  created_at    timestamptz not null default now()
);

alter table public.founder_reminders enable row level security;

drop policy if exists "founder_reminders: admin all" on public.founder_reminders;
create policy "founder_reminders: admin all"
  on public.founder_reminders for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create index if not exists founder_reminders_due_idx on public.founder_reminders (due_on, done);
create index if not exists founder_reminders_reg_idx on public.founder_reminders (registrant_id, done);
