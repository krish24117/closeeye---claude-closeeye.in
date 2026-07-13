# CloseEye — Executive Context

> **What this is.** The operating charter for how CloseEye is *thought about* and *built* —
> the lens the founding executive team applies to every decision.
>
> **How it relates to the Constitution.** It sits *beside* [CONSTITUTION.md](./CONSTITUTION.md),
> it does not replace it. The **Constitution is product law** — product truths, locked
> decisions, design authority, and the working protocol. This is the **executive charter** —
> identity, philosophy, and how to reason. One source of truth is preserved: where they touch,
> **the founder's direct instruction wins, then the Constitution, then this document.** This
> charter never overrides a locked decision (pricing, RLS, red-flag/crisis logic, payments) or
> the 5-step working protocol (plan → approval → implement → test → commit). It explains how to
> *extend* the product without breaking it.

---

## 1. What CloseEye is

CloseEye is a **Trust Infrastructure Platform**.

- It is **not** an elder-care company.
- It is **not** a healthcare company.
- It is **not** a chatbot.
- It is **not** telemedicine.

**Technology supports trust. Humans deliver trust.** Every recommendation must strengthen
trust. Never optimize for AI alone.

## 2. Mission

Build the world's **most trusted family relationship platform**.

Every product decision must increase **trust — not complexity**.

## 3. The product already exists — extend it

Do not redesign. Do not duplicate. Do not rebuild. **Extend.**

The current ecosystem: Website · Android · iOS · Customer App · Guardian App · Presence
Manager Dashboard · Founder Dashboard · Admin Dashboard · Booking · Membership · Payments ·
Presence Stories · Notifications · Authentication · **CloseEye Connect**.

## 4. CloseEye Connect

Connect is **not chat**. Connect is the **digital relationship** between a family and CloseEye.

**AI exists only to coordinate. The human network owns responsibility.**

## 5. AI philosophy

**AI should:** detect · classify · retrieve context · summarize · personalize · educate ·
organize · coordinate · escalate · **prepare humans**.

**AI must never:** diagnose · prescribe · replace humans · invent facts · **delay emergencies**.

## 6. The architecture — the only order that is allowed

```
Family
  ↓
Intent Detection
  ↓
Subject Detection            ← who is this about? (selects the safety regime)
  ↓
Risk & Red-Flag Detection    ← the deterministic SAFETY ENGINE (rules, not the LLM)
  ↓
Family Context
  ↓
Business Rules
  ↓
AI
  ↓
Presence Manager / Guardian / Doctor
  ↓
Audit Trail
```

**Never** `Family → LLM → Answer`. The LLM is never the first or final decision-maker for a
high-risk situation. **Medical safety must never depend on the model judging itself safe — a
deterministic Safety Engine runs before generation, and the LLM can never bypass it.** Subject
Detection is a safety step, not just personalization: who the question is about selects which
red-flag set and which escalation apply (elder vs child vs adult vs self).

## 6a. Connect's operating spec — the four states and the Trust Test

*This section is the **permanent operating specification for CloseEye Connect** and governs
all future AI work on it. Any change to Connect's AI proceeds in a fixed, safety-first order —
**① Product Law → ② Architecture review → ③ Safety Engine design → ④ Validation suite →
⑤ UI-honesty audit → ⑥ incremental implementation** — and ships only behind a passing
validation suite. Trust is the release gate, never "it compiles."*

**Every request resolves into exactly ONE of four terminal states** (we never think "elderly
support" vs "child support"):
1. **Safe General Guidance** — evidence-based information; no profile needed.
2. **Personalized Guidance** — the same, enriched by the Family Graph when it exists.
3. **Human Assistance** — escalate to a Presence Manager or the future Doctor workflow.
4. **Emergency** — activate the emergency workflow immediately.

A request is declined only when an answer would be **medically unsafe, legally inappropriate,
or beyond a general-guidance system** — never because of *who* it is about.

**The Trust Test — every AI response passes this before it reaches the user, in tiers:**
- **Level 1 · mandatory** — answers the user's actual question **and** is medically +
  operationally safe. Fail either → the response is never shown.
- **Level 2 · expected** — provides immediate value, whenever it is safe to.
- **Level 3 · contextual** — personalizes from the Family Graph when available, and offers a
  relevant CloseEye service **only when appropriate**. Level 3 **automatically disappears** in
  emergencies, severe distress, or high-risk moments. **Trust before conversion — never nudge
  a frightened family.**

**UI honesty.** Nothing — prompt, placeholder, empty state, disclaimer, response — may promise
what the product refuses to do, or restrict Connect's scope beyond what is operationally true.
Physical services are elder-focused; **Connect serves the whole family.** Keep limitations
honest; make the AI genuinely useful for everyone.

**The release gate.** Connect changes ship only after a validation suite (100+ real-world
scenarios, every subject and risk level) passes on: subject · intent · risk · Safety-Engine
result · response quality · personalization · escalation · Trust Test. **Trust is the release
gate — never "it compiles."**

## 6b. The Safety Engine — product law

- **It is a product capability, not an AI capability.** Every entry point — chat, the future
  voice interface (SIA), WhatsApp, any future API — passes through the *exact same* Safety
  Engine, as one shared module. No channel ever reimplements safety. The trust promise is
  identical everywhere CloseEye appears.
- **Life-Threatening Red Flags** — one module, with subsets: *Children · Adults · Elderly ·
  Pregnancy · Mental Health · Trauma · Poison · Safeguarding*. Pediatric is one subset, not the
  whole. **Intent before age:** the universal life-threat set fires *subject-independently*
  ("swallowed a battery" is an emergency for a son or a father alike). Subject Detection *adds*
  subject-specific flags and *selects the honest escalation* — it never gates the universal
  set. Doubt always widens the net, never narrows it.
- **Safeguarding is its own lane, not the medical lane.** Abuse, violence, a shaken baby,
  neglect, an unsafe home, a suicidal parent affecting a child — **detect, never try to solve,
  escalate to a human** and the right helpline (India: Childline 1098, and the relevant crisis
  lines), *not* 108. Tuned against harmful false positives: it routes to human judgment, never
  auto-accuses a family. Imminent physical danger (a baby being shaken *now*) is still an
  emergency.
- **The release gate is the Red Flag Simulator.** Before the Safety Engine is enabled in
  production, run 100 → 500 → 1000 simulated conversations, each Expected vs Actual → Pass/Fail.
  **100% pass is required on the deterministic safety outputs** (red-flag catch, subject,
  escalation, terminal state) — one missed life-threat = fail = no ship. AI-answer *quality* is
  held to a high bar with human review — never a fake "100%" on a metric that can't be measured
  deterministically.

## 7. The Family Graph — the long-term moat

Think beyond conversations. CloseEye owns the **Family Graph**. Every recommendation should
strengthen it:

Relationships · Health · Preferences · Documents · Visits · Guardian Notes · Presence Stories ·
Family Memory · Emergency History · Consent · Membership · Timeline.

The Family Graph — real human observation, accumulated with consent — is the asset no
pure-software competitor can clone. Protect it; feed it; make it the memory layer.

**The Family Graph is not a project — it is a property of every feature.** We never build
graph infrastructure for its own sake. Every meaningful interaction should naturally enrich
the family's trusted context *while solving today's problem*: a visit produces a report **and**
a preference; a festival visit strengthens a relationship; a medicine reminder captures a
routine. **Every customer interaction should leave the product smarter than before** — same
work, stronger future. So every feature asks one question at design time: *what does this add
to the graph?*

**The trust guardrail on this principle.** "Smarter" means *better able to serve this family*
— not better data for us. The graph grows **only** through knowledge the family chose to share
or a Guardian earned by showing up; never data harvested, inferred, or captured without
consent. Enrichment that doesn't serve the family, or that they didn't consent to, is
surveillance, not memory. The graph is a **trust asset first, a moat second** — and the moment
those two conflict, trust wins.

## 8. Product principles

- Reuse existing components. Never duplicate functionality.
- Never redesign approved UX.
- Respect the Constitution. Respect the Design System.
- One source of truth.
- **Human-first. Trust-first.**

## 9. Business objective

**Primary objective: acquire the first 100 paying families.**

Every recommendation should improve **at least one** of these five levers — and say which:

| Lever | The question it answers |
|---|---|
| **Trust** | Does a family believe us more after this? |
| **Retention** | Does this make a family stay? |
| **Conversion** | Does this turn a visitor into a paying family? |
| **Operational efficiency** | Does this let a small team serve more families? |
| **Scalability** | Does this still hold at 100× the families? |

If a proposal improves none of the five, it does not ship now.

## 9a. The merge gate

Before any feature is merged, it must answer one question:

> **"Would this make a real family more likely to trust CloseEye with someone they love?"**

If the answer is no, the feature is **redesigned before implementation** — not shipped and
iterated on. This gate sits *above* the five levers: a feature can improve conversion or
efficiency and still fail here, and if it fails here, it does not ship. Trust is the product;
this is how we protect it at the point of change. A feature that opens a new kind of help
(e.g. answering about a child) fails this gate until it is at least as **safe** as the help it
adds — never before.

## 10. How the executive team reasons

Whenever the founder asks a question, **before answering:**

- Challenge assumptions.
- Detect hidden opportunities.
- Detect hidden risks.
- Calculate ROI.
- Identify automation opportunities.
- Suggest reusable architecture.
- Think 3–5 years ahead.

Do not simply answer the question. Think like a co-founder responsible for a generational
company.

- If the idea is **weak**, explain why.
- If the idea is **strong**, improve it.
- **Never agree automatically.**

Always optimize for the long-term success of CloseEye.

---

## Appendix — grounding in the current architecture

This charter is operational, not aspirational. Each principle maps to something that already
exists in the codebase. Extend these; do not rebuild them.

### The architecture pipeline → real components

| Stage | Where it lives today |
|---|---|
| **Intent Detection** | `detectRedFlag` (`ask-health/redflags.ts`), `looksLikeInjection`, `isServiceQuestion`, `looksLikeChildQuery`, `looksOffTopic` — deterministic, run before any model call. |
| **Risk Classification** | `set_query_sla` trigger on `member_queries` (emergency 30m / urgent 2h / watch 12h / routine 24h); the deterministic red-flag categories. |
| **Family Context** | Server-trusted context fetched inside `ask-health` (`loved_ones` + `elder_profiles`); prior `member_queries`. Never client-trusted. |
| **Business Rules** | Monthly/burst caps, membership (`profiles.is_founding_member`), consent (`consents`), assignment (`family_assignments` / `can_manage_family`). |
| **AI** | `ask-health` Claude call (Haiku) with the inline system prompt + auto-disclaimer. Bounded, never diagnostic. |
| **Human handoff** | Presence Manager (`family_assignments`, `admin_role='presence_manager'`, `get_my_presence_manager`); Guardian (`bookings.companion_id`, `is_companion_assigned_to_loved_one`); Doctor (`doctors` — dormant scaffolding to activate); Emergency (`sendCareTeamAlert` + `sla-escalation` cron + the escalation matrix). |
| **Audit Trail** | `member_queries` incident fields (`escalated_at`, `escalation_category`, `escalation_delivered`); `whatsapp_messages` delivery log. |

### The Family Graph → real tables

| Graph node | Backing store |
|---|---|
| Relationships | `loved_ones.relationship`, `family_assignments` |
| Health | `elder_profiles` (conditions, allergies, medications, things-to-avoid) |
| Preferences | `elder_profiles` (routine, interests, food, language, pinned note) |
| Visits | `booking_requests` → `bookings` → `visits` |
| Guardian Notes | `visit_reports`, `guardian_messages` |
| Presence Stories | `visits` / `visit_reports` (`/family/visits/[id]`) |
| Emergency History | `member_queries` (`escalated_*`) |
| Consent | `consents` |
| Membership | `profiles` (`is_founding_member`, plan) |
| Timeline | `messages` + `member_queries` + `visits` — the one conversation (unification in progress) |

### The roles → the RLS model (four-role foundation)

- **Family** — `family_user_id = auth.uid()` (own data only).
- **Presence Manager** — `admin_role='presence_manager'` + `family_assignments`, gated by `can_manage_family()`.
- **Guardian** — the companion model (`bookings.companion_id` + `is_companion_assigned_to_loved_one`).
- **Doctor** — `doctors` table (role + schema exist; surface dormant — a V2 activation).
- **Super Admin** — `is_admin()` (everything).

Authorization is centralized in `can_manage_family()`. Route all future staff access through
it — never hardcode role checks or duplicate assignment logic.
