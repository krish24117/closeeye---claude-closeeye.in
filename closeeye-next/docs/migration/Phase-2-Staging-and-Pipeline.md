# Phase 2 & 15 — Staging Environment + Deployment Pipeline

**Goal:** a production-shaped staging environment for V2 that is fully isolated from the
live site. **No production project, domain, secret, or database is touched.** These are the
exact steps for *you* to run in Vercel / your DNS / Supabase — I can't provision them, and
per the rules I never handle live secrets.

---

## Topology (what runs where)

| Environment | App | Vercel project | Domain | Data |
|---|---|---|---|---|
| **Production** | live Vite app (`src/`) | existing prod project | `closeeye.in` | live Supabase `kghwmiriboavmyswcqnr` |
| **Staging (V2)** | `closeeye-next/` | the **closeeye-next** project (already exists) | **`staging.closeeye.in`** | **isolated** (see Supabase below) |
| **Preview** | `closeeye-next/` | closeeye-next project | auto Vercel URLs per PR | staging DB |

The V2 staging deployment **already exists** at `closeeye-next.vercel.app`. Step 2 just
formalises it: attach the staging domain, split env by target, isolate the DB, and put a
branch-based pipeline around it. Production stays exactly as-is.

---

## A. Domain — `staging.closeeye.in`

1. Vercel → **closeeye-next** project → **Settings → Domains → Add** `staging.closeeye.in`.
2. Your DNS provider → add the record Vercel shows (a **CNAME** `staging` → `cname.vercel-dns.com`).
3. Leave `closeeye.in` and `www` **untouched** (they point at the prod project).

> Alternative name `next.closeeye.in` works identically — pick one.

## B. Environment variables — separate per target

In Vercel → closeeye-next project → **Settings → Environment Variables**, scope each var to
**Production / Preview / Development** (Vercel's three scopes map to: staging domain =
"Production" scope *of the closeeye-next project*, PR previews = "Preview"). Use **test
values only** — never the live keys:

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` → the **staging** Supabase.
- `NEXT_PUBLIC_RAZORPAY_KEY_ID` → **Razorpay test** key.
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` → a **restricted** key (staging referrer only).
- `NEXT_PUBLIC_SITE_URL=https://staging.closeeye.in`.

Server-side secrets (Razorpay secret, Twilio, Resend, Anthropic) live on the **Supabase
staging project's** Edge Function secrets, not in Vercel. Names in `.env.staging.example`.

## C. Database isolation — recommended: Supabase **Branching**

Reconciles the two rules ("exact replica" + "reuse existing, don't duplicate"): a Supabase
**preview branch** applies the same `supabase/migrations/` to an **isolated branch database**
— identical schema, **no production data, no manual duplication, zero risk to prod**.

- Enable branching on the project, or create a dedicated **staging project** seeded by
  `supabase db push` from `supabase/migrations/`.
- Point the staging app's `NEXT_PUBLIC_SUPABASE_*` at that branch/project.
- Set the staging Edge Function secrets to **test** Razorpay/Twilio/Resend values.

> Do **not** point staging at the live project — staging tests would write to real customer
> data. Detailed migration/rollback conventions are Phase 3.

## D. Deployment pipeline (Phase 15)

Git-native via Vercel (no custom build server needed):

| Trigger | Result |
|---|---|
| PR opened | Vercel **Preview** deploy (auto URL) + checks |
| Merge to `staging` branch | deploys to **`staging.closeeye.in`** |
| Merge to `main` | **stays on V2 staging only** until cutover — production is a *separate* project and is never auto-updated by this repo |
| Git **tag `v*`** | triggers the mobile CI (Android/iOS) from the mobile module |

- **Preview deployments:** on by default once the repo is connected to Vercel.
- **Rollback:** Vercel → Deployments → **"Promote"** a previous deployment (instant). DB
  rollback = reset the Supabase branch or run the down-migration (Phase 3 / Phase 17).
- **Release tags & versioning:** tag `vX.Y.Z`; bump `package.json` version; keep the tag →
  deployment mapping in the changelog.
- **Deployment notifications:** Vercel → Settings → **Integrations → Slack/GitHub** for
  deploy start/success/fail.

## E. Guardrails (Phase 19, enforced here)

- The **production** Vercel project + `closeeye.in` domain are **never** added to or changed
  by this pipeline.
- Staging uses **test** payment/messaging keys — a stray test never bills a real customer.
- No live secret is committed; `.env*` is git-ignored (`.env.staging.example` holds names only).

---

## Your checklist for Step 2

- [ ] Add `staging.closeeye.in` to the closeeye-next Vercel project + DNS CNAME
- [ ] Create the staging Supabase (branch or dedicated project) from `supabase/migrations/`
- [ ] Set staging env vars (test values) in Vercel + Supabase Edge Function secrets
- [ ] Connect the repo to Vercel git integration (preview + staging branch)
- [ ] Confirm production project/domain untouched (`curl -I https://closeeye.in` unchanged)
- [ ] Slack/GitHub deploy notifications on
