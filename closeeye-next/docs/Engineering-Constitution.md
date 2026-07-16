# CloseEye — Engineering Constitution

The engineering counterpart to the product Constitution. Three immutable principles
govern every service, review, and extension. They are enforced in code, not just
documented here — the canonical source is [`lib/platform/`](../lib/platform/).

---

## The three principles

### 1. The database remembers. The LLM reasons.
Supabase is the single source of truth. Family memory lives in the database
(`family_ledger`, `loved_ones`, `profiles`, …). A model — today the deterministic
Connect engine, tomorrow an LLM — reasons **only over retrieved context** and is
**never the memory**. It never invents a fact, a person, a relationship, or a state.

### 2. Infrastructure failures fail open. Trust failures fail safe.
If a mechanism *we* added breaks, it must not take a family down with it. But we never
grant, serve, or assert anything we cannot verify. Encoded as the **Trust Matrix** in
[`lib/platform/trust.ts`](../lib/platform/trust.ts) (`failMode`) and mirrored for the
edge functions in [`supabase/functions/_shared/trust.ts`](../../supabase/functions/_shared/trust.ts).

| Class | Direction | Example |
|---|---|---|
| Infrastructure | **fail OPEN** | rate-limit store down → allow; LLM/budget down → degrade to deterministic + human |
| Identity | **fail SAFE** | can't verify a user → treat as anonymous, grant no authed privilege |
| Permission | **fail SAFE** | RLS ambiguous → deny; never serve another family's data |
| Memory | **fail SAFE** | ledger read fails → "couldn't load", never invent; write fails → surface it, never fake success |
| Safety | **fail SAFE** | crisis classification uncertain → escalate / `tel:108`; never assume "safe" |
| Trust | **fail SAFE** | consent unconfirmed → don't proceed; retrieval failed → don't let the model invent |

*The synthesis:* when auth **infrastructure** is flaky we fail **open on availability**
(still serve the anonymous experience) **and** fail **safe on privilege** (grant nothing
authed). Serving and trusting are different questions.

### 3. Every request ends with one structured NextAction.
Deterministic or LLM-reasoned, a request resolves to exactly one honest, structured
[`NextAction`](../lib/platform/next-action.ts) — `answer | clarify | handoff | execute
| escalate`, with a confidence, structured offers, and a `needsHuman` flag. Loose prose
cannot drive a platform; this can.

---

## Supporting contracts

- **`TRUST_THRESHOLD`** ([`lib/platform/trust.ts`](../lib/platform/trust.ts)) — the single,
  platform-wide knob that governs **answer / clarify / handoff** via `decideStep`.
- **`CONVERSATION_BUDGET`** — a conversation may clarify at most this many rounds before
  handing off to a human, so a family is **never trapped in a loop**. Exceeding it
  **fails safe to a person**. Enforced across ~1,480 conversations by
  [`first-conversation.test.ts`](../lib/connect/first-conversation.test.ts).
- **Decision Policy** ([`lib/platform/decision-policy.ts`](../lib/platform/decision-policy.ts))
  — the gate between a `NextAction` and its **execution**. It evaluates business rules the
  reasoning engine must not decide alone: capability availability, city support,
  membership, consent, provider availability, operational readiness. Decision failures
  fail gracefully — **never invent** (a rule that can't confirm "yes" doesn't pass),
  **never silently fail** (every outcome carries an honest reason), and a rule that throws
  becomes a **deny**, never a silent allow.

## How the future platform inherits this

The rate-limiter, cost budget, and Decision Policy are **cross-cutting middleware**, not
per-feature plumbing. In the Family Intelligence architecture, each **domain descriptor**
(Medical, Legal, Finance, …) simply *declares* its rate/cost policy and its Decision rules,
and the Universal Orchestrator enforces them uniformly at the entry point — declarative,
exactly like the router and retrieval.
