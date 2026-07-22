# CloseEye — Launch Readiness Scorecard (Founder Report)

**Date:** 2026-07-20 · **Context:** readiness for an **invite-only Founder Beta** (not a public launch).
This is a founder report — honest, not an engineering status. Scores are 0–10, with what earns the score and
what would make it a 10.

| Area | Score | One-line |
|---|:--:|---|
| Product | 7 | The core promise works; it's one domain, unproven with real families |
| Trust | 8 | The strongest dimension — memory integrity + a real trust model |
| Safety | 8 | Deterministic crisis floor, verified delivery; one flagged gap |
| Security | 8 | Strong fundamentals; Turnstile + pentest pending |
| Privacy | 8 | Consent enforced + plain-language DPDP; needs counsel + live inbox |
| Operations | 7 | Gate + rollback + verified crons; manual DB deploys, single on-call |
| Scalability | 6 | Sound architecture, unproven at scale; human network is the hard part |
| Observability | 7 | Sentry + anonymous PMF analytics live; no uptime alerting yet |
| User Experience | 7 | Fast, warm, honest; some density + no real-user validation |
| Launch Risk (invite beta) | 7 | Moderate-low and manageable, with a few prerequisites |

---

### Product — 7
**Why:** Connect delivers its core promise — a family intelligence that remembers and gives grounded answers,
with the Memory-Integrity work removing the launch blocker (it no longer sounds like a stateless chatbot).
**To reach 10:** breadth (only Connect is live; finance is designed, not built; Care is hidden); the first
answer is thin until a family adds facts; and there is **no retention/PMF evidence yet** — that only comes from
real families.

### Trust — 8
**Why:** This is CloseEye's best dimension. Provenance on every fact; the four-class trust model is
constitutional; consent is framed as a trust promise; answers say "still learning," never "I forgot." Privacy
is stated in plain language.
**To reach 10:** it's unproven with real families; the four trust classes are ratified but not yet surfaced in
every answer's chrome (that's a later phase); the "isn't waking up" crisis-phrase gap slightly dents trust.

### Safety — 8
**Why:** A deterministic crisis floor (100% recall on the canonical probe set, now gated on every deploy),
crisis bypasses consent, real emergency alerts **verified delivered 3/3 in production**, and the SLA/breach
backstop is now scheduled and running.
**To reach 10:** the flagged **"isn't waking up" (contracted negation) does not fire** — needs medical-team
review; and a real on-device "not breathing → 108" smoke test should be done before inviting family.

### Security — 8
**Why:** Row-Level Security throughout, CSP/HSTS, edge-function origin allowlist, no secrets in the repo, no
service-role key reachable from the client, **abuse protection enforced**, Razorpay webhook signature
verification, PII-scrubbed error reporting.
**To reach 10:** Turnstile/CAPTCHA before public exposure; a formal security review/pentest; the rate-limiter's
fail-open design is a deliberate availability trade to revisit at scale.

### Privacy — 8
**Why:** Consent is enforced **client and server** (fail-closed) before any family/health processing; a
plain-language Privacy Notice; a published Grievance Officer; withdrawal + deletion paths; anonymous analytics;
an internal DPDP record.
**To reach 10:** `hello@closeeye.in` must be **live**; legal counsel review of the notice + lawful-basis; DPAs
with sub-processors and data-residency confirmation for a public launch.

### Operations — 7
**Why:** A real deployment gate (CI + Vercel, tests can't be bypassed), a rollback runbook, crons **verified
running in production**, monitoring live, and a single operational Founder-Beta checklist.
**To reach 10:** DB migrations + edge functions still deploy by hand; a single on-call (founder); branch
protection on `main` not yet enabled; no incident drill yet.

### Scalability — 6
**Why:** The architecture is sound and provider-replaceable (RLS, a versioned retrieval seam, one Postgres
ready for pgvector). At Founder-Beta volume, scale is a non-issue.
**To reach 10:** one unbounded ledger query needs bounding; no load testing; no answer caching; and the
**human Care network is the genuinely hard-to-scale asset** (rightly constrained to Hyderabad-first).

### Observability — 7
**Why:** Sentry (client/server/edge, PII-scrubbed, error boundaries) and PostHog (8 anonymous PMF events) are
live and env-gated; a health endpoint exists; edge functions log structured events.
**To reach 10:** no external **uptime monitor / alerting** yet; no dashboards; logs aren't aggregated; and the
PMF events want one human confirmation in the PostHog Activity tab.

### User Experience — 7
**Why:** Two-step onboarding, a guided first task, a first grounded answer within a minute, a warm and honest
returning-home, and a calm consent moment. FAT-1 judged the experience genuinely strong.
**To reach 10:** FAT-1's remaining friction (person-space density, some polish), mobile-only refinement, the
thin first answer, and — most of all — **no real-user validation yet**.

### Launch Risk (for an invite-only beta) — 7
**Why:** For a small, invited cohort with the founder as the safety net, risk is moderate-low and managed:
safety nets running, the gate enforced, rollback ready, consent lawful, data-safe by construction.
**To lower it further:** finish the founder prerequisites (below), review the crisis gap, and — the only real
unknown — put it in front of real families.

---

## The prerequisites before inviting the first family
1. Activate **hello@closeeye.in** (Grievance Officer inbox).
2. Enable **branch protection on `main`** requiring the CI Quality Gate.
3. Confirm the **billing model** (free/invite recommended — no live keys needed).
4. Add an **uptime monitor** on `/api/health`.
5. Have the medical team review the **"isn't waking up"** crisis gap, and do one on-device emergency smoke test.
6. Name the **support channel** and watcher.

## The one question, answered honestly

> **If CloseEye were my company, would I confidently invite my own family to use it today?**

**Yes — for an invite-only beta where I am the safety net, and once prerequisites 1–5 are done. Not for a
public launch yet.**

I would, because every layer that could let my family down has been made *real and verified*, not assumed: it
remembers them and answers honestly with provenance (never "I forgot"); it detects emergencies and I've seen the
alert actually deliver; it enforces consent lawfully; a broken build can't reach them; and I can roll back in
seconds without losing their data.

I would **not** do it blindly. The single thing that would make me hesitate is the crisis-floor gap — *"my
mother isn't waking up"* is exactly the phrase a panicking child types, and it doesn't currently fire. Before my
own parent used this, I'd want that reviewed and an on-device "not breathing → 108" test done with my own hands.
Fix that, activate the inbox, and turn on the uptime monitor, and I'd invite my family with genuine confidence —
because the trust this product is built on has been earned in the code, not just the pitch.

**What I would not yet do:** open it to the public. Turnstile, a legal review, scale/performance hardening, and
— above all — evidence that real families find it valuable are still ahead. That evidence is exactly what the
Founder Beta exists to produce.
