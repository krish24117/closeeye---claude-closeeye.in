# Phase 3 — Database Review

Reviewed from `supabase/migrations/` (51 versioned files) — the source of truth. **Read-only:
no DB connection, no schema change.** Rule honoured: reuse the existing schema, don't
duplicate tables, don't recreate users/auth.

## Schema at a glance

| Aspect | Count | Notes |
|---|---:|---|
| Tables (RLS-enabled) | **31** | booking_requests, bookings, companions, companion_locations, elder_profiles, family_members, loved_ones, memberships, notifications, payments, profiles, subscriptions, visits, visit_reports, vitals, whatsapp_messages, … |
| Foreign keys | 30 | relational integrity across booking → visit → report, family → loved_ones, etc. |
| RLS **enabled** | 31 tables | row-level security is on everywhere it matters |
| RLS **policies** | **95** | per-role read/write rules |
| Storage policies | 32 | across the 5 buckets |
| Triggers | 7 | incl. `updated_at` maintenance (6) |
| Functions | 12 | helpers + policy predicates |
| Indexes | 15 | see index note below |

**Verdict: mature and reusable. No new tables are required for V2** — every V2 localStorage
store maps onto an existing table (mapping is Phase 4–13). So, per the rule, **no new
migration is written in this phase.**

## Findings & recommendations (none applied — your call)

1. **Versioning ✅** — migrations are timestamp-prefixed (`20260614120000_*.sql`), sequential
   and immutable. Good as-is; keep the convention below for any future change.
2. **Rollback ⚠ (forward-only)** — Supabase migrations don't auto-generate down scripts. For
   *safe* rollback, adopt the up/down convention below and always test on the **staging
   branch** first (Phase 2). Production rollback = restore the pre-migration snapshot (Phase 17).
3. **Soft deletes — none** (`deleted_at` absent on all tables). For care-critical data
   (visits, reports, payments) a soft-delete + partial index is safer than hard delete.
   *Optional* additive migration; flagged, not applied.
4. **`updated_at` coverage — partial** (10 of 31 tables; 6 triggers). Low-risk hygiene: add
   `updated_at timestamptz default now()` + a `moddatetime` trigger to the remaining
   mutable tables. *Optional.*
5. **Indexes — audit the hot paths** (15 for 31 tables). Confirm indexes exist on FK columns
   and frequent filters: `visits(guardian_id, scheduled_at)`, `booking_requests(status,
   created_at)`, `payments(status)`, `companion_locations(companion_id, updated_at)`. Add
   only where a real query needs it (keyset pagination on `(created_at, id)`).
6. **RLS recursion — re-verify.** There is history of a `bookings ↔ loved_ones` **infinite
   recursion** in RLS that broke family/companion/admin pages. With 95 policies, re-run a
   quick recursion check on staging (a self-referential policy predicate re-triggering RLS).
7. **Search** — for name/address/report-text search, a `pg_trgm` or `tsvector` index (Phase
   later) rather than `ILIKE` scans. *Optional.*

## Migration & rollback conventions (versioned · rollback-capable · safe)

Create actual migration files **only when a real schema change is needed** (none now). When
you do, follow this — every change ships as a pair:

```
supabase/migrations/<UTC-timestamp>_<change>.sql          # up (additive, idempotent)
supabase/migrations/rollback/<same-timestamp>_<change>.down.sql   # down (documented)
```

**Up template** (`docs/migration/templates` mirrors this):
```sql
-- 20260709T1200_add_deleted_at_visits.sql   (UP)
-- Safe: additive, idempotent, no data loss.
begin;
alter table public.visits add column if not exists deleted_at timestamptz;
create index if not exists visits_active_idx on public.visits (scheduled_at) where deleted_at is null;
commit;
```

**Down template** (rollback):
```sql
-- 20260709T1200_add_deleted_at_visits.down.sql   (ROLLBACK)
begin;
drop index if exists public.visits_active_idx;
alter table public.visits drop column if exists deleted_at;
commit;
```

**Safety rules:**
- **Additive first** — add columns/tables/indexes; never drop or rename a live column in the
  same release as the code that stops using it (two-phase: deploy code → later drop).
- **Idempotent** — `if not exists` / `if exists` so re-runs are safe.
- **Wrapped in a transaction**; `create index concurrently` (outside a txn) only for large
  hot tables.
- **Test on the staging branch first**, always. Never run an unproven migration on prod.
- **Backfill** in a separate, batched migration — never a blocking `UPDATE` on a huge table.

## Storage (buckets + policies)

5 buckets — `elder-photos`, `visit-photos`, `visit_reports`, `companion-photos`,
`companion-documents` — with 32 `storage.objects` policies. Reuse as-is; upload/download/
permission verification is Phase 9.

---

**Bottom line:** the database is production-grade and V2 consumes it unchanged. The only
required Phase-3 output is the **conventions above** (no schema edits); items 3–7 are
optional hardening to run on **staging** if the Product Director wants them.
