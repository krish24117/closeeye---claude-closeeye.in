# Phase 18 — Production Readiness Report

Aggregates Phases 1–17. **Honest headline:** the **migration planning, infrastructure review,
staging design, and safety machinery are complete**; the **actual wiring of V2 to the backend
has not yet happened** (V2 is still the localStorage prototype). So we are *ready to build and
validate on staging* — not yet ready to cut over.

## Two readiness numbers (don't conflate them)

| Lens | Readiness | Meaning |
|---|--:|---|
| **Migration prep & infrastructure** (this module's scope) | **~92%** | Reviews, plans, staging design, security audit, cutover/rollback runbooks — done. Remaining = your credentialed provisioning. |
| **V2 cutover readiness** (can we flip `closeeye.in`?) | **~58%** | Blocked on: wiring V2 → backend, staging validation, server-side RBAC, and Product Director approval. |

## Per-area reports

| # | Area | Score | State |
|---|---|--:|---|
| Infrastructure | Supabase + 40 Edge Functions + Razorpay/Twilio/Resend/Maps/Anthropic/Sentry | **95** | Mature, documented (Phase 1). Reuse as-is. |
| Database | 31 RLS tables · 95 policies · 30 FKs · 32 storage policies | **90** | Reusable, no new tables (Phase 3). Index audit + RLS-recursion recheck pending. |
| Security | Full-stack audit | **87** | Signed webhooks, pervasive RLS, no secret leak (Phase 14). 4 gaps to close. |
| Performance | Frontend 102 kB shared, static prerender, SW, AVIF/WebP | **95** (fe) | Frontend strong (Module 8). Backend query perf = index audit. |
| Payments | Razorpay: orders/membership/subscription/verify/**signed webhook** | **95** (backend) | Backend production-grade; **V2 not wired yet**. |
| WhatsApp | Twilio, templates, `whatsapp_messages` log, retry | **90** (backend) | Backend live; **V2 not wired yet**. |
| Authentication | Supabase Auth, roles, JWT, session | **82** | Backend solid; **V2 server-side RBAC not wired** (highest-priority gap). |
| Storage | 5 buckets, 32 policies, client compression | **90** (backend) | Backend ready; **V2 not wired yet**. |
| Analytics | Mixpanel/PostHog/Vercel (thin) | **65** | Needs consolidation to one `track()` shim. |
| Push | FCM/APNS | **40** | **Server-side dispatch is a NEW build** (`device_tokens` + dispatch fn). |
| Deployment | Vercel git pipeline + blue-green cutover | **85** | Designed (Phase 2/16). Staging not yet provisioned. |

## Issues

**🔴 Critical (block cutover):**
1. **V2 is not wired to the backend.** The integration (Phases 4–13) is planned but not
   executed — this is the main body of remaining work, to be done on **staging**.
2. **Server-side RBAC in V2.** Roles are routing-only; enforce with Supabase Auth + middleware
   before real customer data.
3. **Staging not yet provisioned.** Needs your Vercel domain + DNS + Supabase branch + test
   secrets (Phase 2 checklist).

**🟠 Warnings (fix on staging, pre/early cutover):**
- Rate limiting on public endpoints; CORS tightening on authenticated functions.
- PII/medical column encryption at rest.
- Push server dispatch (new build) + `device_tokens` table.
- RLS-recursion recheck; hot-path index audit.
- Analytics consolidation.

**⚪ Known (non-blocking, tracked elsewhere):**
- `closeeye-next/` isn't on GitHub yet (folder/repo decision parked with you).
- iOS build + signed store artifacts need a Mac + accounts (mobile module).

## Deployment / Analytics / Storage / WhatsApp / Payments / Auth — one-line status
- **Deployment:** blue-green domain swap on shared DB → ~1-min reversible cutover, zero data loss.
- **Payments/WhatsApp/Storage/Auth:** backends are production-ready and **reused**; the work is
  V2 wiring + staging verification, never rebuilding.
- **Analytics:** define one event shim; separate staging project so staging never pollutes prod.

## Go-Live checklist (single source)

**Build (on staging):**
- [ ] Staging provisioned (`staging.closeeye.in`, isolated DB, test secrets) — Phase 2
- [ ] V2 wired: auth → storage/reads → booking/payments → messaging → maps/analytics/monitoring → push — Phase 4–13
- [ ] Server-side RBAC + middleware in V2
- [ ] Rate limiting + CORS tightened; PII-at-rest encryption
- [ ] Push (FCM/APNS) dispatch + `device_tokens`

**Validate (on staging):**
- [ ] Payments (test): purchase, booking, renewal, refund, failure, webhook, invoice
- [ ] Auth: every role logs in; existing users unaffected (no re-register)
- [ ] WhatsApp / Email / SMS: every template delivers + logs
- [ ] Storage: upload/download/delete under RLS; cross-family isolation
- [ ] Maps, analytics, Sentry (staging env)
- [ ] Full QA + role tests + `mobile-testing.md`
- [ ] RLS-recursion recheck; index audit

**Cutover (Phase 16, in order):**
- [ ] QA ✅ → backup app → **PITR/snapshot DB** → apply additive migrations (BLUE still works)
- [ ] Verify staging green
- [ ] **🔒 Product Director approval**
- [ ] Swap `closeeye.in` BLUE → GREEN → monitor 30–60 min
- [ ] Verify live: payments · auth · WhatsApp · notifications
- [ ] Rollback ready (BLUE promotable, down-migrations, PITR)

**Guardrails (always):** production never deleted · URL never changes · no session interrupted
· staging uses test keys · no live secret exposed · **wait for approval**.

---

## Bottom line

The **backend is production-grade and reusable**, and every plan, review, and safety runbook
for a **safe, reversible, zero‑data‑loss** migration is now in place (`docs/migration/`).
Production is **completely untouched** and stays that way until you provision staging, we wire
+ validate V2 there, close the four security gaps, and the **Product Director approves** the
blue-green swap. Estimated engineering to cutover-ready: the V2 wiring + RBAC + push + staging
validation — all on staging, none on production.
