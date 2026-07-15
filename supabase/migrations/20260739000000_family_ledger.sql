-- Close Eye Connect — the Family Ledger.
--
-- The immutable, append-only foundation of the Family Understanding Engine. Every
-- entry carries its PROVENANCE and is NEVER overwritten: family-provided facts,
-- Guardian observations, AI understanding events, visit observations, manual
-- corrections, and future family memories all accrete here as new rows. A
-- correction is a new 'correction' row, not an edit. Owner-only by RLS.
--
-- Constitution: understanding is the product; never fabricate; never overwrite;
-- preserve provenance for every observation.

create table if not exists public.family_ledger (
  id             uuid primary key default gen_random_uuid(),
  loved_one_id   uuid not null references public.loved_ones(id) on delete cascade,
  family_user_id uuid not null references auth.users(id) on delete cascade,
  entry_type     text not null check (entry_type in (
                   'family_fact','guardian_observation','ai_understanding',
                   'visit_observation','correction','memory')),
  label          text,
  body           text not null,
  -- provenance: where this understanding came from
  source         text not null default 'connect_experience'
                   check (source in ('connect_experience','family_space','guardian','ai_engine')),
  created_at     timestamptz not null default now()
);

create index if not exists family_ledger_loved_one_idx on public.family_ledger (loved_one_id, created_at);
create index if not exists family_ledger_owner_idx      on public.family_ledger (family_user_id);

alter table public.family_ledger enable row level security;

-- Owner may READ their family's ledger.
drop policy if exists family_ledger_select_own on public.family_ledger;
create policy family_ledger_select_own on public.family_ledger
  for select using (family_user_id = auth.uid());

-- Owner may APPEND, but only for a loved one they own. No UPDATE or DELETE policy
-- exists — the ledger is immutable; corrections are new rows.
drop policy if exists family_ledger_insert_own on public.family_ledger;
create policy family_ledger_insert_own on public.family_ledger
  for insert with check (
    family_user_id = auth.uid()
    and exists (
      select 1 from public.loved_ones lo
      where lo.id = family_ledger.loved_one_id
        and lo.family_user_id = auth.uid()
    )
  );

-- Privilege-level immutability: authenticated users may only select + insert.
revoke all on public.family_ledger from authenticated;
grant select, insert on public.family_ledger to authenticated;
