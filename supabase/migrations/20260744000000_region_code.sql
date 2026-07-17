-- Phase 2 — the family owns its region.
--
-- region_code drives the emergency number, currency, locale, and which Care modules are
-- available (see closeeye-next/lib/platform/regions.ts). Adding it here is the pivot that
-- turns "pinned to India" into "the family's actual region".
--
-- SAFE BY CONSTRUCTION:
--   · NOT NULL DEFAULT 'IN' backfills every existing row → today's India behaviour is
--     preserved exactly. No family's emergency number, currency, or Care changes.
--   · Additive only. RLS is untouched: region_code is owned data, already covered by the
--     existing family_user_id / owner policies on these tables.
--   · Reversible: `alter table ... drop column region_code`.
--
-- After this is applied, the staged resolution code (fetchSpace reads loved_ones.region_code)
-- ships in one push, and the crisis dial resolves per-family instead of per-constant.

alter table public.profiles    add column if not exists region_code text not null default 'IN';
alter table public.loved_ones  add column if not exists region_code text not null default 'IN';

-- Cheap lookups when we later resolve a family's region on every request.
create index if not exists loved_ones_region_idx on public.loved_ones (region_code);
create index if not exists profiles_region_idx   on public.profiles   (region_code);

comment on column public.loved_ones.region_code is
  'ISO-3166 region for this loved one; drives emergency number, currency, locale, Care availability (lib/platform/regions.ts). Default IN.';
comment on column public.profiles.region_code is
  'The family account holder''s region. Default IN.';
