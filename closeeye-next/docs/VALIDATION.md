# Launch Validation Harness v1

The reusable release gate. Deliberately small — critical journeys, accessibility, console-error
detection, screenshot regression, Lighthouse. **Freeze it here; expand only when production
experience proves it necessary (→ v2).**

## Run it

```bash
npm run e2e          # Playwright: smoke + a11y + visual, desktop + mobile
npm run e2e:report   # open the last HTML report
npm run e2e:update   # regenerate screenshot baselines (after an intended visual change)
npm run validate     # e2e + Lighthouse CI
```

Target defaults to the UAT preview (`https://connect.closeeye.in`); override with
`VALIDATE_BASE_URL`. Public journeys run with no credentials. Authenticated journeys run only when
`PLAYWRIGHT_USER` / `PLAYWRIGHT_PASS` are set (see below). CI: `.github/workflows/validate.yml` runs
on PR/push; add the two as **GitHub secrets** to enable the authenticated suite there.

## The three permanent validation accounts

Created + seeded by `node scripts/seed-validation-accounts.mjs` (idempotent; uses the public anon
key from `.env.local` — auto-confirm is on, so no service-role key is needed). They live in the
production Supabase project with clearly-marked `@closeeye-validation.test` emails and **only fake
data**.

| Key | Email | Purpose | Seed |
|---|---|---|---|
| **empty** | `validation-empty@closeeye-validation.test` | Onboarding / first-run / add-family | no family |
| **family** ⭐ | `validation-family@closeeye-validation.test` | **The primary Playwright account** — most tests | 3 loved ones (father, mother, wife) |
| **power** | `validation-power@closeeye-validation.test` | Performance / scale | 6 loved ones |

Shared password (throwaway validation accounts, fake data): **`CloseEye!Validation#2026`**.

**Wire it up:**
- **Local:** add to `.env.local` (gitignored):
  `PLAYWRIGHT_USER=validation-family@closeeye-validation.test` and `PLAYWRIGHT_PASS=CloseEye!Validation#2026`
- **CI:** set the same two as repository **secrets** (`PLAYWRIGHT_USER`, `PLAYWRIGHT_PASS`).

## Known limits (v1, intentional)

- **`family_ledger` facts aren't seeded** — that table's RLS only accepts writes via a privileged
  path, so the accounts have loved ones but not the per-person "known" facts. The Workspace still
  renders the real family (enough to validate UI). Enrich via a service-role seed if needed later.
- **Screenshot baselines are OS-specific** (`*-win32.png` committed). CI (Linux) must regenerate
  `*-linux.png` once (`npm run e2e:update` in a Linux env / container).
- **Authenticated selectors** track the current `/auth` form; update if that form changes.
- **Lighthouse is advisory** in v1 (`continue-on-error`) — sensible thresholds, not 100/100.

## What it checks

- **Smoke** (`e2e/smoke.public.spec.ts`): `/`, `/connect`, `/auth` render with no critical runtime
  errors (uncaught exceptions, React/hydration, failed critical loads; benign `vercel.live` preview
  noise filtered).
- **Accessibility** (`e2e/a11y.public.spec.ts`): axe on key screens; fails only on serious/critical.
- **Visual** (`e2e/visual.public.spec.ts`): screenshot regression on key public screens.
- **Authenticated** (`e2e/authenticated.spec.ts`): Workspace, Profile, add-family form — **read-only**,
  never mutates production data.
- **Lighthouse** (`lighthouserc.json`): performance / accessibility / best-practices / seo.
