-- =====================================================================
-- Public Founding-100 counter.
--
-- A safe aggregate for the scarcity number on /f/[ref] and the marketing site. Returns
-- ONLY the count of founding families (reserved founder_prelaunch registrants + numbered
-- founding members) — no PII, no rows. Anon-executable via SECURITY DEFINER (the same
-- pattern as public.is_admin()), so it never loosens row-level RLS on profiles /
-- subscriptions. Idempotent (create or replace).
-- =====================================================================

create or replace function public.founding_count()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::int
  from public.profiles
  where founder_prelaunch = true or is_founding_member = true;
$$;

revoke all on function public.founding_count() from public;
grant execute on function public.founding_count() to anon, authenticated;
