-- Founder Program — honest funnel events (Phase 4 dashboard).
--
-- The Founder Activation Dashboard shows real numbers only. Two of its metrics —
-- WhatsApp clicks and the landing→registration conversion rate — have no source
-- today, so we capture the minimum: a lightweight append-only event when a
-- founder landing is viewed or a WhatsApp CTA is tapped. No PII; just a type, the
-- attribution ref, and a timestamp.
--
-- event_type is constrained to a known set (an anon writer can't invent metrics),
-- inserts are public (the landing is pre-auth), reads are admin-only.
-- Idempotent throughout.

create table if not exists public.founder_events (
  id          uuid primary key default gen_random_uuid(),
  event_type  text not null check (event_type in ('landing_view', 'whatsapp_click')),
  ref         text,
  created_at  timestamptz not null default now()
);

alter table public.founder_events enable row level security;

drop policy if exists "founder_events: public insert" on public.founder_events;
create policy "founder_events: public insert"
  on public.founder_events for insert
  to anon, authenticated
  with check (event_type in ('landing_view', 'whatsapp_click'));

drop policy if exists "founder_events: admin read" on public.founder_events;
create policy "founder_events: admin read"
  on public.founder_events for select
  using (public.is_admin());

create index if not exists founder_events_type_created_idx
  on public.founder_events (event_type, created_at desc);
