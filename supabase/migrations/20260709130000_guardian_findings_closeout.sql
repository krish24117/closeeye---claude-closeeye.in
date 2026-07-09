-- =====================================================================
-- Module 4 (Guardian) — close out review findings L-2 and L-3.
-- Idempotent. Run via the Supabase SQL Editor or `supabase db push`.
-- =====================================================================

-- ── L-2: cross-Guardian visit continuity ──────────────────────────────
-- An assigned Guardian should see the elder's most recent prior visit even when
-- a DIFFERENT Guardian wrote it (care hand-off). `companion_read_own_visits`
-- only covers a Guardian's own rows. Add a scoped read via a security-definer
-- helper (no RLS recursion), limited to elders the caller currently has a
-- booking for — so a Guardian can never read visits for an elder they don't serve.
create or replace function public.companion_covers_elder(p_elder_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.elder_profiles ep
    join public.bookings b on b.loved_one_id = ep.loved_one_id
    where ep.id = p_elder_id
      and b.companion_id = auth.uid()
  );
$$;

grant execute on function public.companion_covers_elder(uuid) to authenticated;

drop policy if exists "companion_read_covered_elder_visits" on public.visits;
create policy "companion_read_covered_elder_visits"
  on public.visits for select
  using (elder_id is not null and public.companion_covers_elder(elder_id));

-- ── L-3: never trust a client-supplied companion_id ───────────────────
-- RLS already enforces companion_id = auth.uid() on insert; make the column
-- default to auth.uid() so the client no longer needs to send it at all
-- (defense in depth — the value is now server-derived).
alter table public.visits
  alter column companion_id set default auth.uid();
