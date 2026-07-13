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
Risk Classification
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

**Never** `Family → LLM → Answer`. The model is the sixth thing that runs, never the first.
Deterministic safety and business rules decide *who answers* before a token is generated.

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
