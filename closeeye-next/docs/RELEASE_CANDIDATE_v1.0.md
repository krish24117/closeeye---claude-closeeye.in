# CloseEye v1.0 — Founder Beta Release Candidate

**Status:** RELEASE CANDIDATE (frozen for review) · **Date:** 2026-07-20 · **Target:** invite-only Founder Beta
(**not** a public launch). This is the single release-candidate document. It references the deeper docs rather
than duplicating them: [Founder Beta Checklist](./FOUNDER_BETA_CHECKLIST.md) · [Rollback Runbook](./ROLLBACK_RUNBOOK.md) ·
[DPDP Compliance](./DPDP_COMPLIANCE.md) · [Launch Readiness Scorecard](./LAUNCH_READINESS_SCORECARD.md) ·
[Architecture & Product Blueprint](./ARCHITECTURE_PRODUCT_BLUEPRINT.md) · Architecture Constitution v1.1.

---

## 1. Architecture summary (v1.0)
CloseEye is a **Family Intelligence Platform**, not a chatbot. One inviolable pipeline governs every answer:

**`Family → Retrieve → Reason → Answer`** — never `Family → LLM → Answer`.

- **Family Graph** (`family_ledger`) — append-only, provenance-tagged, RLS-isolated per family. The system of record.
- **Retrieve** (`retrieve.v1`) — a versioned read seam that grounds every answer in the family's own facts.
- **Reason** — the LLM understands language and composes; it is **never** the source of truth and never decides
  emergencies, payments, or dispatch (Architecture Constitution Principles 4/5/7).
- **Safety** — a **deterministic crisis floor**, first and model-independent, shared by Connect and Ask.
- **Provider-replaceable** — the LLM is swappable behind a stable interface; the platform is the moat.
- **Domain-agnostic by construction** — health is one domain; the graph/retrieve/reason path is ready for
  legal/finance/etc. without redesign (Article XI, ratified).

Two front doors, one platform: `connect.closeeye.in`/`closeeye.app` (global Connect) and `closeeye.in` (India).

## 2. Features implemented (in this RC)
- **Connect** — the family conversation: visible *Understand → Reason → Answer*, grounded in the Family Graph;
  **durable conversations** (reopen across days); reliable **subject resolution** ("my mother" → the right
  person); **memory integrity** (never claims to forget — "still learning", not "I forgot").
- **Workspace** — Home (what Close Eye notices/knows/is learning), People + per-person Space, Memories,
  Health profile, Activity, Profile.
- **First-time experience** — 2-step onboarding (name + first loved one), guided first task, a first grounded
  answer within a minute.
- **Safety** — deterministic crisis floor with broadened natural-language recall (cardiac arrest/pulse,
  negated-"waking", cyanosis, +more), crisis → 108 / self-harm → helpline routing, verified care-team alert
  delivery, SLA/overdue safety crons running.
- **Governance** — consent enforced (client trust-promise card + fail-closed server gate; crisis bypasses),
  withdrawal + deletion, plain-language Privacy Notice, Grievance Officer, DPDP record, anonymous analytics.
- **Observability** — Sentry (client/server/edge, PII-scrubbed) + PostHog (8 anonymous PMF events), env-gated;
  `/api/health`.
- **Deployment safety** — CI + Vercel quality gate (`verify` = preflight + typecheck + full suite incl. crisis
  floor + resolution, then build); rollback runbook; data-safe by construction.
- **Billing** — Razorpay engine (signature-verified webhook, subscription/refund lifecycle) — present; the beta
  runs free by default (see §5).

## 3. Deferred features (intentionally NOT in v1.0)
Care orchestration · Finance/Insurance intelligence (Phase C — *designed, approved-in-principle, not built*) ·
Legal / Property / Government / Education domains · deeper Family Moments · Trust-chrome surfacing of the four
epistemic classes · typography migration · public launch (Turnstile, legal review) · paid Connect on the global
door · Doctor workflow. None is required for the beta; all fit the frozen architecture without redesign.

## 4. Known limitations (honest)
- **Crisis floor (open, medical-review):** broadened significantly, but bare "won't respond"/"doesn't respond"
  are deliberately not added (ambiguous); the floor is recall-biased (accepted false positives). Any change is
  medical-team owned.
- **First answer is thin** until a family adds facts (grounding deepens with use).
- **One domain live** (Connect); no PMF/retention evidence yet — that's what the beta produces.
- **Care hidden** (`CARE_ENABLED=false`); the human network is Hyderabad-first and supply-constrained.
- **Ops:** DB migrations + edge functions deploy by hand; single on-call; no uptime monitor yet; one unbounded
  ledger query to bound later.

## 5. Launch prerequisites (before the first invite)
From the Scorecard — the short list that gates the beta:
1. Activate **hello@closeeye.in** (Grievance Officer inbox).
2. Enable **branch protection on `main`** requiring the CI Quality Gate.
3. Confirm the **billing model** — *free/invite recommended* (no live keys needed).
4. Add an **uptime monitor** on `/api/health`.
5. **Medical-team review** of the crisis floor + a real **on-device "not breathing → 108" smoke test** (iPhone
   + Android). *This is the one true life-safety gate.*
6. Name the **support channel** + who watches it.

## 6. Operational runbook
- **Deploy:** push → CI Quality Gate → Vercel runs `verify && build` (no deploy if it fails). **Migrations +
  edge functions are manual** (`supabase db push` / `supabase functions deploy <name> --project-ref
  kghwmiriboavmyswcqnr`). Crons scheduled in the Supabase Dashboard.
- **Verify production is ready** (commands):
  - Crons: `supabase db query --linked "select jobname, schedule, active from cron.job;"` (expect
    check-overdue-bookings + sla-escalation active) and recent `succeeded` in `cron.job_run_details`.
  - Secrets present: `supabase secrets list` (Twilio/Resend/CARE_TEAM_*/Razorpay/Anthropic/RATE_LIMIT_ENFORCE).
  - Health: `curl https://<domain>/api/health` → `{status:"ok"}`.
- **Feature flags:** `CARE_ENABLED`, `PHASE_2_ENABLED`, `RATE_LIMIT_ENFORCE`, `TURNSTILE_SECRET_KEY`.

## 7. Incident response guide (beta)
Keep it simple — one on-call (founder), the runbook, and Sentry.
1. **See it** — Sentry captures the exception (with context, PII-scrubbed).
2. **Assess** — user-facing? safety-related? how many families?
3. **Stop the bleeding** — user-facing UI/build regression → **roll back** (§8). Care/visit issue → `CARE_ENABLED`
   off. Answer/safety issue → redeploy the prior `ask-health`.
4. **Fix forward** — through the gate (a fix can't ship without passing tests).
5. **Tell the family** — proactively, honestly. In beta, every incident is a trust moment.
- **Safety-critical** (a missed/mishandled emergency): treat as sev-1 — verify the crisis floor + escalation
  delivery immediately, and review with the medical team.

## 8. Rollback procedure
Full detail in the [Rollback Runbook](./ROLLBACK_RUNBOOK.md). In short:
- **Frontend:** Vercel → Deployments → **Promote** the last-good deployment (instant), or `git revert` + push.
- **Edge function:** `git checkout <good> -- supabase/functions/<name>` → `supabase functions deploy <name>`.
- **Migration:** additive-only → ship a **compensating forward migration** (never destructive down-migrate).
- **Data-safe by construction:** deploys don't touch data (append-only ledger + RLS + additive migrations) —
  verified (a clean revert restored the tree; prod data was untouched).

## 9. Founder Beta playbook
**The beta is a learning phase, not a feature-building phase.**
- **Who:** a small number (≈5–15) of carefully selected families you can support personally and who'll be honest.
- **Invite:** personal, direct; set expectations ("early access, help us learn, reach me directly").
- **Watch daily:** Sentry (errors) + PostHog (the funnel, §10). One family struggling = one thing to fix.
- **Capture:** keep a running log of friction/quotes/requests — this becomes the v1.1 roadmap, evidence-first.
- **Don't build new features mid-beta** unless a *safety* issue demands it. Resist scope; observe behavior.
- **Graduate criteria:** the north-star metric holds, errors are quiet, and families spontaneously return and
  add more loved ones — *then* consider widening or turning on paid.

## 10. Success metrics
Measuring **customer value and trust**, not vanity.
- **North-star:** *% of new families who ask ≥1 question and return within 7 days.*
- **Funnel (PostHog, anonymous):** signed_up → onboarding_completed → loved_one_added → first_question_asked →
  answer_received → follow_up_asked → conversation_reopened → memory_added.
- **Activation:** % completing onboarding + first question. **Retention:** D1/D7/D30 return. **Depth:** second
  loved one added; conversations reopened; memories/facts added.
- **Trust signals (qualitative):** do families say it "knows my family"? do they come back unprompted?
- **Safety (non-negotiable):** zero missed emergencies; every escalation delivered.
- **The founder question, re-asked at the end of beta:** *would a family confidently pay a monthly membership?*

## 11. v1.1 roadmap (evidence-led, after the beta)
Sequenced by what the beta demonstrates — not assumed:
1. **Crisis-floor medical review** (the open items) + any coverage the beta surfaces. *(Always first.)*
2. **Trust chrome** — surface the four epistemic classes (verified / inferred / general / professional) in every
   answer (Article XII made visible).
3. **Answer depth** — richer grounding + proactive fact capture so the first answer is stronger.
4. **Ops hardening** — uptime alerting, bound the ledger query, log aggregation, incident drill.
5. **The domain-agnostic proof** — *if* the beta shows families want document intelligence, build **Phase C
   (Finance/Insurance)** end-to-end as the plugin proof; otherwise deepen Connect.
6. **Care orchestration** — activate when provider supply is ready (Hyderabad-first), shaped by what families
   actually asked for during the beta.

---

### Freeze statement
This is CloseEye **v1.0**, frozen for the Founder Beta. The engineering work is done: the product remembers a
family and answers honestly, emergencies are detected and escalated (broadened and verified), consent is lawful,
nothing broken can deploy, and a bad release can be rolled back without data loss. What remains before the first
invite is a short operational list (§5) — with the medical-team crisis review + on-device emergency smoke test as
the one true life-safety gate. After that, the beta's job is to tell us the truth: whether real families
experience CloseEye as *the AI that knows their family*.
