# CloseEye Connect — Launch Readiness Plan

**Status:** PLAN for founder direction · **Date:** 2026-07-20 · **Scope:** the Connect experience
(`closeeye-next/` + `supabase/`) — production-hardening before public launch to real families. No new
product scope (Phase C stays deferred). This is a plan; nothing here is implemented yet.

**The launch goal (yours):** Connect must be *robust enough for real families* **and** we must be able to
*prove product-market fit*. That second half is decisive for prioritisation: **you cannot validate PMF for a
product you cannot see errors in or measure behaviour on.** The two largest gaps below are exactly those.

---

## 0. What's already strong (do not re-do)

The survey confirms a solid foundation — credit where due, so we spend effort only on real gaps:
- **Security core:** pervasive RLS (100+ migrations, dedicated hardening), full CSP + HSTS + frame/permissions
  headers, an edge-function origin allowlist, no secrets committed, no service-role key reachable from the
  client, JWT-verified edge functions. `retrieve()` is structurally forbidden from cross-family reads.
- **Billing engine:** Razorpay webhook **signature verification**, payment/refund/subscription lifecycle
  handled (failed payment, cancellation, refunds-logged, upgrade double-bill guard, charge idempotency),
  invoice emails. Connect is a real ₹500/mo subscription (`companion` plan).
- **Safety:** deterministic crisis floor before any model call; care-team alerting; an always-on burst cap on
  `ask-health` independent of the abuse flag.
- **Release gate:** the Launch Validation harness (Playwright smoke + axe a11y + visual regression) runs in CI
  on PRs to `main`/`feat/connect-launch`.

This is not a rescue job. It's a focused hardening pass on a sound base.

---

## 1. Readiness scorecard

| # | Area | Status | One-line |
|---|---|---|---|
| 1 | Monitoring & observability | 🔴 | No error tracking, no health check; edge logs live only in Supabase console |
| 2 | Analytics | 🔴 | None — we cannot measure activation, retention, or PMF |
| 3 | Security | 🟡 | Strong core, but rate-limit + Turnstile are **log-only** (flag off) |
| 4 | Privacy & consent | 🔴 | Consent recorded but **never enforced**; no DPDP grievance officer |
| 5 | Billing & subscriptions | 🟡 | Engine solid; **test keys**; Connect not payable on the `/connect` door (Phase-2 gated) |
| 6 | Performance & scalability | 🟡 | Fine at current scale; one unbounded query; manual SW-version discipline |
| 7 | Service orchestration | 🟡 | Care correctly hidden; **safety crons may be unscheduled in prod** |
| 8 | Production operations | 🟡 | Manual DB/fn/cron deploys; CI lacks typecheck/unit-test/lint gate |

🔴 launch-blocking gap · 🟡 hardening needed · (no 🟢 row needs action)

---

## 2. P0 — Launch blockers (fix before public launch to real families)

Each item: **finding → why it blocks → action → who.** "Who" = **[me]** (engineering, on approval),
**[config]** (an env var / dashboard setting), or **[founder/legal]** (a decision or appointment).

### P0-1 · You are flying blind — add error tracking 🔴
- **Finding:** No Sentry/Datadog/OTel anywhere; edge functions only `console.log` to the Supabase console;
  error boundaries exist for admin/family/pm but **not for the actual Connect surfaces** (`(connect)`,
  `(workspace)/space`).
- **Why it blocks:** with real families, an unseen exception is a silently broken family. You can't run a
  production service you can't observe.
- **Action:** wire **Sentry** (Next.js client+server + edge functions), add `error.tsx` for `(connect)` and
  `(workspace)/space`, alert on error-rate spikes. **[me]** + tool choice **[founder]**.

### P0-2 · You cannot prove PMF without measuring it — add product analytics 🔴
- **Finding:** No PostHog/GA/Vercel Analytics/Mixpanel. Zero funnel instrumentation.
- **Why it blocks:** the entire launch goal is "validate PMF." Without activation/retention/engagement events
  you're guessing. The FAT walks proved the experience *works*; analytics proves families *value* it.
- **Action:** instrument the core funnel — **sign-up → onboard → add loved one → first question → answer →
  return (D1/D7/D30) → memory added → conversation reopened**. Recommend **PostHog** (funnels + retention +
  session replay, privacy-friendly, self-host option for DPDP). **[me]** + tool choice **[founder]**.
- **North-star metric to instrument first:** *% of new families who ask ≥1 question and return within 7 days.*

### P0-3 · Turn on abuse protection 🟡→🔴 at public scale
- **Finding:** rate-limiting and Turnstile are fully built but **log-only** — gated behind
  `RATE_LIMIT_ENFORCE` (currently not `true`) on the two public endpoints (`waitlist-signup`,
  `submit-booking-request`). `ask-health`'s own burst cap is the only always-on limiter.
- **Why it blocks:** a public URL with an LLM behind it and log-only limits is an open cost/abuse surface.
- **Action:** set `RATE_LIMIT_ENFORCE=true` and `TURNSTILE_SECRET_KEY`; verify a 429/403 actually fires; keep
  `ask-health` burst cap. **[config]** + a verification pass **[me]**.

### P0-4 · Enforce consent before AI/health processing 🔴
- **Finding:** `consents`/`wellbeing_consents` tables + `recordConsent()`/`hasActiveConsent()` exist, but
  `hasActiveConsent()` has **zero call sites** — consent is recorded non-fatally in one flow and **never gates**
  `ask-health` before it processes health context with Claude.
- **Why it blocks:** processing family health data without an enforced lawful basis is a DPDP exposure the day
  a real (non-founder) family uses it.
- **Action:** decide the consent model — recommend **consent-at-first-use** (a clear, recorded acceptance
  before the first Connect question) enforced server-side; then wire the gate. **[founder decision on model]** +
  **[me]** to enforce.

### P0-5 · DPDP legal minimum — grievance officer + accurate privacy policy 🔴
- **Finding:** no Grievance Officer / DPO named anywhere; privacy/consent pages are thin (55/19 lines). A
  data-deletion path **does** exist (`delete-account` fn) — good.
- **Why it blocks:** India's DPDP Act requires a named grievance officer and accurate notice for a service
  holding health data. This is a legal gate, not an engineering one.
- **Action:** appoint & publish a **grievance officer**; legal-review the privacy policy so it *accurately*
  states what data is held, how it's processed (AI), retention, and the erasure right. **[founder/legal]** +
  **[me]** to place the copy.

### P0-6 · Verify the safety-critical crons are actually scheduled in production 🔴
- **Finding:** `sla-escalation` (5-min) and `check-overdue-bookings` (15-min) have **no `schedule.sql`** —
  scheduling is a manual Supabase Dashboard step. If it was never done in prod, **SLA escalations and overdue-
  booking alerts silently don't fire.**
- **Why it blocks:** these are the follow-up safety nets behind emergencies and visits. Unscheduled = a family
  emergency that isn't chased.
- **Action:** verify (or schedule) both crons in production pg_cron; add a `schedule.sql` + a monitor that
  alerts if a cron hasn't run. **[founder/ops to verify in Dashboard]** + **[me]** for the schedule.sql & monitor.

### P0-7 · Decide the launch billing model (and get live keys if paid) 🟡→decision
- **Finding:** Connect is a real payable subscription on the **India** `/family/membership` route, but on the
  **global `/connect` door** checkout is behind `PHASE_2_ENABLED` — it shows *"visits open 15 August,"* no
  price, no pay. Keys are **test** (`rzp_test_…`).
- **Why it matters:** launch can't be ambiguous about whether Connect is free-beta or paid.
- **Action / decision:** **[founder]** choose — **(a) free/invite beta** (fastest to PMF signal; defer live
  keys), or **(b) paid at launch** (needs live Razorpay keys + un-gating checkout on the Connect door +
  price/paywall copy). Recommend **(a) free or low-friction beta** to maximise PMF learning, then turn on paid.
  **[me]** to wire whichever you pick.

### P0-8 · Protect the auto-deploying `main` branch — add a CI quality gate 🟡→🔴
- **Finding:** `main` **auto-deploys to production**, yet CI runs only Playwright/axe/visual (LHCI
  continue-on-error). There is **no `tsc --noEmit`, no `vitest`, no lint** gate, and `eslint.ignoreDuringBuilds
  = true`.
- **Why it blocks:** a type error or a failing unit test (e.g. the crisis-floor or resolver regression suites)
  can reach production unblocked.
- **Action:** add a fast CI job — **typecheck + vitest (incl. the crisis-floor & ds-lint suites)** — required
  on PRs to `main`/`feat/connect-launch`. Cheap, high-leverage. **[me]**.

---

## 3. P1 — Launch hardening (soft-launch window / first weeks)

- **Health-check endpoint** (`/api/health`) + external uptime monitor (Connect + Supabase + the edge fns).
- **Bound the ledger retrieval** — `retrieve.ts` reads *all* `family_ledger` rows for a subject with no
  `LIMIT`; add a windowed/most-recent bound so a heavy family can't slow a request at scale.
- **Structured-log sink** — ship edge-function logs somewhere queryable/alertable (today they live only in the
  Supabase console).
- **Rollback runbook for DB migrations & edge functions** — web/native rollback is documented; DB/fn is not.
- **Consolidated incident / on-call runbook** — one page: who's paged, how to roll back, how to check the crons.
- **SW-version discipline** — a release checklist item (or automated bump) so the known stale-bundle gotcha
  can't ship.

## 4. P2 — Post-launch / scale

- Response caching for repeated/expensive answers; per-family cost telemetry on `ask-health`.
- Deeper analytics funnels + cohort retention dashboards once the basics are flowing.
- Automated migration/function deploy in CI (manual is acceptable for a small team pre-scale).
- Load/perf testing ahead of a growth push.

---

## 5. Decisions I need from you

| # | Decision | Recommendation |
|---|---|---|
| **L1** | Launch model — free/invite beta vs paid at launch (P0-7) | **Free / low-friction beta** — fastest, cleanest PMF signal; enable paid once value is proven |
| **L2** | Error-tracking tool (P0-1) | **Sentry** (best Next.js + edge support) |
| **L3** | Analytics tool (P0-2) | **PostHog** (funnels + retention + replay; DPDP-friendly self-host option) |
| **L4** | Consent model (P0-4) | **Consent-at-first-use**, recorded, enforced server-side before the first question |
| **L5** | Grievance officer (P0-5) | Appoint a named person (you, initially) + publish contact |
| **L6** | Who verifies prod crons & flips the env flags (P0-3, P0-6) | You/ops in the Supabase Dashboard; I'll prep the schedule.sql, monitors, and verification steps |

## 6. Recommended launch sequence

A phased path that front-loads *seeing* and *measuring*, then *hardening*, then *opening the doors*:

1. **Instrument (P0-1, P0-2, P0-8)** — Sentry + PostHog + CI gate. *Now we can see and measure. Ship to UAT.*
2. **Lawful & safe (P0-3, P0-4, P0-5, P0-6)** — enforce abuse limits, enforce consent, publish DPDP notice +
   officer, verify safety crons. *Now we can lawfully and safely serve non-founder families.*
3. **Billing decision (P0-7)** — free beta (default) or wire paid + live keys.
4. **Soft launch** — a bounded cohort of real families; watch Sentry (errors) + PostHog (activation/retention)
   daily; the north-star metric (P0-2) is the PMF read.
5. **Harden (P1)** — health checks, log sink, query bound, runbooks — during the soft-launch window.
6. **General availability** — open the doors once the soft-launch cohort shows errors are quiet and the
   north-star metric holds.

---

### One-paragraph summary
Connect sits on a genuinely strong foundation — RLS, CSP, signature-verified billing, a deterministic safety
floor, and a validation harness. The launch-blocking gaps are the ones that matter most for *your* goal of
proving product-market fit with real families: we currently **can't see errors** (no Sentry), **can't measure
value** (no analytics), have **abuse protection switched off** (a single env flag), **don't enforce consent**
before processing health data, lack the **DPDP grievance officer**, may have **unscheduled safety crons**, and
let an **auto-deploying `main`** through without a typecheck/test gate. None is deep; together they are the
difference between a demo and a product real families can trust. I recommend a free/invite beta so the PMF
signal is clean. Give me L1–L6 and I'll execute in the recommended sequence — **instrument, make lawful & safe,
then open the doors** — pausing for your approval at each phase.
