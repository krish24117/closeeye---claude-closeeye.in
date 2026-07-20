# CloseEye — Founder Beta Launch Checklist

**Purpose:** the single operational checklist to complete before inviting the first family to the invite-only
Founder Beta. **Last updated:** 2026-07-20. Status legend: ✅ done · ⏳ founder action · ▶️ do at invite time.

> Do not invite the first family until every ✅/⏳ item in **Safety, Security, Privacy, and Billing** is green.

## 1. Infrastructure
- ✅ Production topology: `main` → production (Vercel), `feat/connect-launch` → UAT (connect.closeeye.in).
- ✅ Health endpoint live (`/api/health`, 200/503).
- ✅ Deploy gate enforced (vercel.json runs `verify && build` — no deploy without typecheck + tests + build).
- ⏳ Enable **branch protection on `main`** requiring the *CI Quality Gate* check (so nothing merges/deploys
  without it). *(GitHub → Settings → Branches.)*
- ▶️ Confirm the production domain + Supabase Auth redirect URLs are correct for the beta domain.

## 2. Security
- ✅ RLS on all family tables; no service-role key reachable from the client; edge-function origin allowlist.
- ✅ CSP + HSTS + frame/permissions headers.
- ✅ Abuse protection **enforced** (`RATE_LIMIT_ENFORCE=true`, verified).
- ▶️ **Turnstile** before any *public* exposure (`TURNSTILE_SECRET_KEY`) — optional for invite-only beta.
- ✅ No secrets in the repo; secrets in Vercel/Supabase.

## 3. Privacy & Governance (DPDP)
- ✅ Consent enforced (client card + server gate in `ask-health`, fail-closed; crisis bypasses).
- ✅ Withdrawal + deletion paths (Profile → withdraw / close account).
- ✅ Privacy Notice complete & plain-language; Grievance Officer published.
- ⏳ **Activate `hello@closeeye.in`** so the Grievance Officer address receives mail — *launch prerequisite.*
- ✅ Internal DPDP record (`docs/DPDP_COMPLIANCE.md`).
- ✅ Analytics fully anonymous (no `identify` during beta).

## 4. Billing state
- ✅ Razorpay engine wired (webhook signature verified; subscription/refund lifecycle handled).
- ⏳ **Confirm the beta billing model**: free/invite (recommended — no live keys needed) vs paid. If paid:
  add **live Razorpay keys**, un-gate `PHASE_2_ENABLED` checkout on the Connect door, add price/paywall copy.
- ✅ Current: keys are test; Connect checkout gated on the Connect door (i.e., free for the beta by default).

## 5. Monitoring & Observability
- ✅ Sentry active (client/server/edge, PII-scrubbed, error boundaries) — env-gated.
- ✅ PostHog active (8 anonymous PMF events) — env-gated.
- ▶️ Add an **uptime monitor** on `/api/health` (e.g. a simple external ping) before invites.
- ▶️ Confirm PMF events appear in the PostHog Activity tab (founder to eyeball).

## 6. Support
- ⏳ **Support channel** for beta families (the Grievance/Hello inbox, or WhatsApp) — who watches it, response
  expectation.
- ▶️ A short "what to do if something breaks" note for invited families (how to reach you).

## 7. Production-readiness verification (run before invites)
Verify prerequisites exist so nothing fails at runtime (commands used in Phase 1/4):
- ✅ **Env vars:** required `NEXT_PUBLIC_SUPABASE_*` enforced by the build **preflight** (a missing one fails
  the deploy). Observability vars set in Vercel.
- ✅ **Edge functions** deployed (`ask-health` incl. consent + crisis; delete-account; razorpay-*; submit-booking).
- ✅ **DB migrations** applied (no pending).
- ✅ **Cron jobs** scheduled + healthy — verify: `supabase db query --linked "select jobname, schedule, active
  from cron.job;"` → `check-overdue-bookings` + `sla-escalation` active; and `cron.job_run_details` shows
  recent `succeeded` runs.
- ✅ **Emergency workflow** proven (real escalations delivered 3/3 in prod).

## 8. Rollback & Incident Response
- ✅ **Rollback runbook** (`docs/ROLLBACK_RUNBOOK.md`) — Vercel promote-previous (instant), edge-fn redeploy,
  additive-migration forward-fix; data-safe by construction.
- ▶️ **Incident response (beta):** on a report — (1) check Sentry for the error, (2) reproduce, (3) roll back
  if user-facing (runbook §1), (4) fix forward through the gate, (5) tell the affected family. Keep it simple:
  one person on call (founder), the runbook, and Sentry.
- ▶️ Know the two "stop the bleeding" flags: `CARE_ENABLED` / `PHASE_2_ENABLED` (hide Care), and rolling back
  `ask-health` (answer/safety).

---
### Go / No-Go
**GO when:** branch protection on, `hello@closeeye.in` live, billing model confirmed, uptime monitor on,
support channel named. Everything else is ✅. At that point the invite-only Founder Beta is safe to begin.
