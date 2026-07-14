# The Close Eye Constitution

> **Status: DRAFT** — becomes canonical on the founder's review & sign-off (2026-07-12).
>
> The single source of truth for building Close Eye. This is an **entry point**: it
> states the non-negotiables and links to the detailed governance in
> [`closeeye-next/docs/`](closeeye-next/docs/) rather than duplicating it, so the two
> can never drift apart.

---

## 0 · Purpose & Precedence

This document consolidates the product truths, design authority, architecture, locked
decisions, and working rules into one front door. When two sources disagree, resolve in
this order:

1. The founder's direct, current instruction.
2. **This Constitution.**
3. The [`closeeye-next/docs/`](closeeye-next/docs/) corpus — Product-Bible, Design-System, Brand-Guidelines, Decision-Log, and the rest.
4. The code as it currently stands.

The Constitution changes **only** with the founder's explicit sign-off. Every material
decision is appended to the [Decision-Log](closeeye-next/docs/Decision-Log.md); history
is never rewritten.

---

## 1 · What Close Eye Is / Is Not

Close Eye is a **family trust company** — so no family faces life's important moments
alone. It delivers that trust as two things: **Close Eye Connect**, the intelligence that
stays with your family, and **Close Eye Care**, the trusted human network it activates
when someone needs to be there (see §2a). It is **not** a healthcare marketplace, a
booking portal, an insurance site, an elder-care directory, or a chatbot. **The product
is trust; the intelligence and the human network both serve it — never the other way
around.**
_Source: [Product-Bible](closeeye-next/docs/Product-Bible.md)._

---

## 2 · Product Truths

- **Mission** — the most trusted intelligence and presence for the families we serve.
- **Who we serve** — families living away from the people they love, usually an adult
  child abroad buying for a parent in India. Copy centres the **parent's dignity**,
  never the child's absence.
- **The two products** — **Close Eye Connect** (the global intelligence layer) and
  **Close Eye Care** (the on-demand human network). Connect orchestrates; Care fulfills
  (see §2a).
- **Care's services** — Home Wellbeing Visit · Hospital Companion · Custom Request, plus
  the capabilities Connect can activate (medicine pickup, festival visit, emergency
  response).
- **The people** — **Guardian** (the verified, trained person who visits) ·
  **Presence Manager** (one dedicated human, the family's single point of contact) ·
  **Family** (the customer — never called "customer").
- **Universal promises** — every **Care visit** comes with verified Guardians, a
  dedicated Presence Manager, WhatsApp updates, visit reports, privacy, and human
  support — no fine print.

---

## 2a · Product Architecture — Connect & Care

_Founder decision, 2026-07-14._ Close Eye is delivered as **two products under one trust brand** — the intelligence and the human network, kept distinct:

- **Close Eye** — the trust brand and company.
- **Close Eye Connect** (₹500 / month) — the **primary product**: a **global intelligence layer**, the operating system for a family. Because it is software, it works **anywhere in the world**. It *remembers, understands, and stays with* the family every day — family intelligence, personalized guidance, emergency escalation, health records, family timeline, doctor network (future), and care orchestration.
- **Close Eye Care** — the **trusted human network**, activated **on demand**. Never framed as an "upgrade" — it is a capability of the ecosystem: Guardian visit, hospital companion, medicine pickup, festival visit, emergency response, Presence Manager. **India-based** (physical presence).

**Connect orchestrates; Care fulfills.** Connect detects that something is wrong and offers to arrange real-world help; Care carries it out. The family never has to understand the distinction — the platform orchestrates it.

> **Close Eye Connect is the intelligence that stays with your family. Close Eye Care is the trusted human network it activates whenever real-world presence is needed.**

**Surfaces:** `closeeye.in` = brand & company · `/connect` = the Connect product (sells Connect-the-SKU; Care appears only as a capability it activates, never the hero) · `/care` (future) = the physical service network.

**The remove-AI test.** Every headline must pass it: if the value proposition needs the word "AI" to be compelling, it is too weak. Lead with trust, family, memory, and continuity — the parts that are hard to copy.

This reconciles the locked pricing (Connect ₹500 / Care ₹1,500) by defining what each product **is**.

---

## 2b · The Family Intelligence System (frozen)

_Approved &amp; frozen by the founder, 2026-07-14._ The full blueprint is the **Intelligence Architecture** document. Its parts are **one system, not six products** — the **Family Intelligence System**: `Family Graph · Memory · Events · Context · Understanding · Safety · Reasoning`. **Close Eye is building Family Intelligence, not AI** — AI is an implementation detail; the product is a family's compounding, private understanding. The non-negotiables, enshrined as law:

- **The inviolable order.** Never `Family → LLM → Answer`. Always `Family → Retrieve → Reason → Answer`. The foundation model is a rented reasoning engine over the family's private knowledge — never the source of truth, never the first responder. Deterministic where safety and trust demand it; generative only where nuance helps.
- **Eight layers.** Channel &amp; Identity → Intent &amp; Subject → Risk (deterministic Safety Engine, *before* generation, life-safety floor never model-dependent) → Context Retrieval (Family Graph + Memory) → Policy Router (rules first; decides answer / ask / escalate / future-doctor / future-Care) → Grounded Reasoning → Safety &amp; Grounding post-check → Response, Action &amp; Events (learning loop).
- **Memory in three tiers** — the record (permanent), the model (learned), the moment (episodic). **Event-sourced:** memory, graph, personalization, and explainability derive from the event stream (risk lives in the pattern, not one message). Internally this is **Family Memory**; it is never exposed to customers as a "storage" or "gallery" product (§2c).
- **Understanding compounds without retraining.** The private context compounds; the rented model stays fixed. **Understanding compounds faster than AI improves** — memory without understanding is Google Photos; understanding is Close Eye. That is the moat: the accumulated, private, structured _understanding_ of each specific family, plus the trust that let them share it. Foundation models commoditize; a family's understanding does not.
- **Non-goals.** Never a chatbot, symptom-checker, telemedicine, or medical AI. Health is one domain among many.

**The freeze (2026-07-14).** These principles are coherent and **frozen** — the Family Graph, Memory, Event model, Safety, Retrieval, and Policy routing do not change. Future work builds _on top_ of them; it does not redesign them. Changes require the founder's explicit sign-off.

---

## 2c · Law — Memory is Understanding, Never Storage

_Constitutional law. Founder, 2026-07-14._ In the same category as the inviolable order (§2b) and Trust-first — a principle that must guide every future feature, UX decision, AI workflow, and monetization strategy.

Close Eye Connect is **not a cloud storage service.** Photos, videos, documents, reports, voice notes, and other files are **never the product** — they are inputs that help Connect understand a family.

- Families never have to remember where something is kept. They **ask** — search is replaced by understanding.
- The product **never competes on storage capacity, folders, or gigabytes.** It competes on its ability to remember, understand, and answer in the context of a specific family.
- Every uploaded memory must **strengthen the Family Graph** and improve future understanding.
- **Storage is invisible. Understanding is the product.**

**The interaction model — the pair:** _Remember, don't organize. Ask, don't search._ The customer never organizes folders and never searches directories. They simply ask Connect.

**The three constitutional moats** — stronger together than any single AI feature:

1. **Family Graph** — relationships.
2. **Family Life Memory** — understanding of life's moments.
3. **Ask, Don't Search** — the interaction model.

**The gate.** Every future proposal is checked against one question: **"Does this help the family ask instead of search?"** If the answer is no, it is challenged before implementation.

---

## 2d · Law — AI is Infrastructure; Family Intelligence is the Product

_Constitutional law. Founder, 2026-07-14._ In the same category as the inviolable order (§2b) and Memory-is-Understanding (§2c).

**AI providers are infrastructure. Family Intelligence is the product.**

- The **Family Graph**, **Family Life Memory** (internally "Family Memory"), the **Consent Engine**, and the **Retrieval layer** are **permanent company assets** — the accumulated, private, consent-based understanding of each family. They are what Close Eye owns and what compounds.
- **LLMs are interchangeable reasoning engines** behind a stable interface (§2e / B5). They are rented, swappable, and must **never become the centre of the architecture.** A provider change must never touch business logic.
- **Corollary.** We never build a moat on a model, a prompt, or a vendor — only on a family's understanding and the trust that created it. When a provider improves or is replaced, the product is unchanged; when a family's understanding deepens, the product improves.

---

## 2e · Version 1 Infrastructure (frozen)

_Founder-approved &amp; frozen, 2026-07-14. Full rationale: the Infrastructure Decision Paper (B2–B5)._ Sized deliberately for **100,000 families over three years** — robust, privacy-first, extensible, and free of premature complexity. The rule through all four: **one Postgres, one consent gate, one AI interface.**

- **B2 · Data platform** — **one Postgres (Supabase) as the single system of record.** The Event Store (append-only table), the Family Graph (adjacency + recursive CTEs), and the Vector Index (`pgvector` / HNSW) all live *inside* it, every row family-scoped behind RLS. No separate graph DB, vector DB, or event bus until a named trigger demands it.
- **B3 · Consent** — **inherited object-level consent, enforced by one gate** (`can_access(grantee, object, purpose)`). Append-only records; coarse grants inherit down `Family → Person → object`; most-specific override wins; default deny. Nothing is retrieved or sent to a model without passing the gate.
- **B4 · Identity** — **manual tagging first; face recognition opt-in, per-family, suggest-then-confirm.** No biometric processing without explicit consent; embeddings are per-tenant, never pooled, deletable; the family is always the authority on identity.
- **B5 · AI provider** — **one internal interface, default Anthropic, swap by config.** Provider-agnostic by abstraction; zero-retention and no-training-on-family-data enforced contractually and at the single egress choke-point.

Changes to this V1 infrastructure require the founder's explicit sign-off.

---

## 2f · The Seven-Layer Intelligence Stack (frozen)

_Founder-approved &amp; frozen as Version 1, 2026-07-14._ The Family Intelligence System (§2b) is built as **seven layers in strict dependency order** — trusted family knowledge at the base, reasoning applied near the top, the experience outermost. Each layer answers one architectural question and provides a capability the next consumes:

1. **Identity** — Family · Person · Relationships · Consent. _Who are these people?_
2. **Event Store** — the append-only spine. _What happened?_
3. **Family Graph** — relationships &amp; facts. _How are they connected?_
4. **Family Life Memory** — durable understanding (AI-powered indexing is support, not reasoning). _What should never be forgotten?_
5. **Retrieval** — the consent-filtered brief. _What information matters now?_
6. **Intelligence Runtime** — the **provider-independent** reasoning boundary. _What does it mean?_
7. **Connect Experience** — the family-facing response. _How should Connect respond?_

Layers 1–5 are trusted family knowledge; Layer 6 applies reasoning to it (rented, swappable — never the source of truth, per §2d); Layer 7 is the experience the family touches.

**Law — strict layering.** Every layer exposes a **stable interface** and communicates **only with its adjacent layers**. No layer may bypass another, reach across the stack, or depend on another layer's internal implementation details. Any layer may be reimplemented freely so long as its interface holds.

Changes to this Version 1 architecture require the founder's explicit sign-off.

---

## 2g · Law — Backward Compatibility is Constitutional

_Constitutional engineering law. Founder, 2026-07-14._ The family must **never experience a migration.**

- Every new subsystem must **coexist** with the current production system until it has been **validated in production** — additive first, canonical later.
- **No big-bang migration. No production risk.** The current schema (`profiles`, `loved_ones`, `elder_profiles`, `family_assignments`, and the rest) stays operational; the new architecture grows beside it and becomes canonical gradually and reversibly.
- **No architectural purity justifies breaking a working customer experience.** When elegance and a live family's experience conflict, the family wins.

This governs the whole platform's evolution — the Intelligence Stack (§2f) included.

---

## 2h · Identity &amp; Object Standards (frozen, v1.0)

_Founder-approved refinements to Identity Architecture v1.0, 2026-07-14. Additive — they refine, they do not redesign._

- **Purpose-based consent is first-class.** No consent exists without a stated **purpose**; every access decision is `can_access(grantee, object, purpose)`. The same grantee may be permitted a Person's data for one purpose (e.g. care-coordination) and denied it for another (e.g. sharing with a doctor, or AI reasoning). Access for an unstated or mismatched purpose is denied — purpose limitation by construction.
- **Identity Confidence model** — every identity link and resolution carries one of four states: **Suggested** (system-proposed, not yet trusted), **Confirmed** (a family member accepted a suggestion), **Manual** (a family member entered it directly), **Unknown** (unresolved / ambiguous). Only **Confirmed** and **Manual** count as fact for reasoning; **Suggested** and **Unknown** mean _ask, never assert_.
- **Universal object metadata** — every domain object, platform-wide, carries five fields: **CreatedBy**, **Source**, **Confidence**, **Provenance**, and **ConsentScope**. These make trust, explainability, and consent structural on every object — not just Identity.

---

## 3 · Design Authority

- **Name** — "Close Eye", two words, always.
- **Type** — Manrope (fallback Inter). No other display face in `closeeye-next`.
- **Logo** — the official mark + wordmark system; never reconstructed ad hoc.
- **Buttons** — exactly four: Primary, Secondary, Ghost, Text.
- **Colour** — only the semantic tokens (ink, green, accent, ivory, card, line, muted,
  success / warning / error). No ad-hoc greens. No gold.
- **Space** — 8-point grid. **Radius** — 12 / 20 / 28 / 32.
- **Voice** — "emotion without guilt"; observe the banned-words list.

_Detail: [Design-System](closeeye-next/docs/Design-System.md) ·
[Brand-Guidelines](closeeye-next/docs/Brand-Guidelines.md) ·
[Colour-System](closeeye-next/docs/Colour-System.md) ·
[Typography](closeeye-next/docs/Typography.md) ·
[Writing](closeeye-next/docs/Writing.md)._

---

## 4 · Architecture Truths

- **One product, one domain.** The web app is production at **closeeye.in** (canonical
  origin `www.closeeye.in`). Role → workspace — Family Space, Guardian App, PM Console,
  Admin / Founder OS — one app, never parallel apps.
- **Stack** — Next.js 15 (App Router, React 19, TypeScript strict, Tailwind,
  **light-only**) in `closeeye-next/`; **Supabase** backend (auth, Postgres + RLS,
  storage, edge functions); Razorpay payments.
- **Auth** — Google + password. No magic-link / email-OTP for families.
- **Mobile** — one codebase. The native apps are a **remote shell** (Capacitor) that
  loads the live site; rebuild the native app **only** for a store release (a `v*` tag).
  Android + iOS both build green in CI.
- **Deploy** — `git push origin main` → Vercel auto-deploys `closeeye-next` →
  closeeye.in. Production DB migrations and edge-function deploys are run by the founder
  via CLI.

---

## 5 · Locked Decisions

Frozen unless the founder reopens them:

- **Membership pricing** — Connect ₹500 · Care ₹1,500. Clean rounded pricing only.
- **Auth** — Google + password; no magic-link (see §4).
- **Dashboard lifecycle states** — fixed; do not redesign or "optimise" them.
- **Scope** — the parked backlog is not built proactively.

_Full history: [Decision-Log](closeeye-next/docs/Decision-Log.md)._

---

## 6 · Working Protocol

- **Machines** — Windows is the **primary development machine** (code, web build, tests,
  commits, CI). The Mac is a **dedicated iOS build / Simulator / App Store signing
  machine only** — don't switch to it unless the task truly needs it.
- **Every feature, in order:**
  1. **Explain the plan.**
  2. **Wait for the founder's approval.**
  3. Implement.
  4. Run tests.
  5. Commit to Git.
- **Never change business logic without asking first** — pricing, booking rules, auth /
  session flows, data model / RLS, membership, red-flag / crisis logic, payments.
  Config, CI, infrastructure, and copy still follow the five steps but are lower-risk.
- **Prove correctness before optimizing.** In validation and coexistence phases (e.g. a
  Shadow migration), prefer **clarity over cleverness** — a design that is easy to reason
  about and verify beats a faster one until correctness is proven. Do not optimise a phase
  whose job is to prove the model. Keep each phase **small, measurable, reversible, and
  independently approvable**; never combine phases or merge migration steps to "save time."
- **Zero secrets.** No credential, key, token, or connection string ever lives in source
  code, logs, error messages, or a client bundle. Secrets come only from server-side
  environment / secure config — never committed, never logged, never shipped to the browser.
- **Observability before access.** No subsystem reads or touches production data before the
  means to observe it exist — metrics, an access log, and a kill-switch must be in place
  first. Instrument, then access; never point code at production data blind. On failure,
  **fail closed** (disable the subsystem) — never fall back to touching production behaviour.
- **Authorization is explainable and deterministic.** Every authorization decision
  (`can_access`) is computed by deterministic rules — **never an LLM** — and returns a full,
  inspectable result: **Decision · Reason · Matched Rule · Consent Source · Evidence ·
  Confidence.** An access decision must always be reconstructable from these six fields.
- **Migration decisions are evidence-based, not intuition-based.** A migration only advances
  a phase on **measured evidence** — parity, health, and performance from the Migration
  Control Center — never on a feeling that "it looks ready." Readiness is a function of the
  numbers; if the evidence isn't green and stable, the phase does not advance.
- **Implementation-Complete is not Validation-Complete.** A phase whose purpose is
  production validation is only **Implementation-Complete** when its code exists and is
  verified in isolation. It is **Complete** only when production evidence confirms it against
  the exit criteria over an agreed observation window, with founder review. Status must never
  claim a validation phase "Complete" before that evidence exists — a phase like this sits at
  **🟡 Ready (Dormant / Awaiting Validation)** until the evidence earns the ✅.
- **Advance only on validated evidence.** Implementation proves that software was built
  correctly; **validation proves that the system behaves correctly in production.** Close Eye
  advances only on validated evidence, never on implementation alone.
- **A frozen implementation stays frozen; changing it resets validation.** Once a phase's
  implementation is frozen for validation, any code change **reopens implementation** and
  **resets validation readiness** — evidence collected before the change is void and the
  observation window restarts. There is no "small change" during validation; a change is a
  reopen, tracked as its own increment, re-verified, and re-frozen before validation resumes.

---

## 7 · Change Control

- Amend this Constitution only with the founder's explicit sign-off.
- Record every material product / design / architecture decision in the
  [Decision-Log](closeeye-next/docs/Decision-Log.md).
- When the Constitution and reality diverge, fix reality **or** update the Constitution
  — never let them silently disagree.
