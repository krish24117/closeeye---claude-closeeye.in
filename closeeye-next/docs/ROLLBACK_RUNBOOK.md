# Production Rollback Runbook

**Status:** Operational · **Last updated:** 2026-07-20 · **Audience:** whoever is on call during Founder Beta.
Goal: revert a bad production release **quickly and without data loss.**

## The core safety property (why rollback is safe)
A deployment ships **code**, not data. Family data lives in Supabase (Postgres) and is **never touched by a
frontend or edge-function deploy**. The `family_ledger` is **append-only + RLS-isolated** (Architecture
Constitution Article V/X), and migrations are **additive-only** (§2g). Therefore rolling back application code
**cannot lose family data**. The only way to lose data is a *destructive migration* — which the additive-only
rule prohibits.

## 1. Frontend (Vercel) — the common case, instant
The web app is stateless, so rolling it back is safe and immediate.
- **Fastest:** Vercel Dashboard → the project → **Deployments** → pick the last-known-good deployment →
  **⋯ → Promote to Production**. Instant, no rebuild. (Vercel retains every prior deployment.)
- **From git (also triggers the CI gate):**
  ```
  git revert <bad-commit>        # creates an inverse commit (no history rewrite)
  git push origin main           # Vercel redeploys the reverted code
  ```
  Use `git revert`, not `reset --force` — reverting preserves history and is reviewable.
- **Verify:** load `https://<domain>/api/health` → `{status:"ok"}`; smoke the core journey (sign in → ask).

## 2. Edge functions (Supabase) — manual, per function
Edge functions are deployed by hand (`supabase functions deploy`). To roll one back:
```
git checkout <last-good-commit> -- supabase/functions/<name>
supabase functions deploy <name> --project-ref kghwmiriboavmyswcqnr
git checkout HEAD -- supabase/functions/<name>   # restore your working tree
```
The `ask-health` function is the sensitive one (answers + crisis + consent). Re-verify after: a normal
question answers, a crisis phrase still escalates, and consent is still enforced.

## 3. Database migrations — additive-only, forward-fix
Migrations are additive (new tables/columns/policies), so a rollback almost never needs a *down* migration.
- If a migration is wrong: write a **new, compensating forward migration** (e.g. drop the just-added column)
  and apply it. Never hand-edit a shipped migration.
- Extreme case (data corruption): restore from Supabase **Point-in-Time Recovery** — a last resort, coordinate
  before using. This is the only path that could touch data, which is exactly why migrations stay additive.

## 4. Config / secrets (env vars, feature flags)
- Vercel env var or Supabase secret changed in error → revert it in the respective dashboard; redeploy if it's
  build-time (`NEXT_PUBLIC_*`). Feature flags (`CARE_ENABLED`, `PHASE_2_ENABLED`, `RATE_LIMIT_ENFORCE`) flip in
  the dashboard with no code change.

## Decision guide
| Symptom | Action |
|---|---|
| Bad UI / broken page / build regression | §1 Promote previous (instant) |
| Bad answer/crisis/consent behavior | §2 redeploy prior `ask-health` |
| Bad migration | §3 compensating forward migration |
| Wrong secret / flag | §4 dashboard revert |
| Data corruption (rare) | §3 PITR — coordinate first |

## Verified
The git-revert mechanism is confirmed clean (an inverse commit applies without conflict and restores the prior
tree; see the Phase-4 validation). Production data is independent of deploys (append-only ledger + RLS +
additive migrations), so every path above is **data-safe by construction.**
