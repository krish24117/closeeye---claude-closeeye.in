# CloseEye — The Understanding Constitution

*Frozen 2026-07-18. Product law, equal in weight to the [Navigation Constitution](./navigation_constitution.md)
and the [Architecture Constitution](../../CONSTITUTION_ARCHITECTURE.html). It governs how Close Eye
understands what a family says. Every feature that touches comprehension is evaluated against it.*

---

## Why this exists

A family typed *"My mother is travelling from Hyderabad to Bangalore."* The engine answered:
**"Someone you love: Hyderabad. She lives in Bangalore. You need a real-world hand."** Three
fabrications — a city named as a person, an invented residence, an assumed need — and it printed
*"nothing is assumed"* underneath. A deterministic parser had been made to do the one job it can
never do: understand language. This constitution makes that failure illegal.

---

## The frozen principle

> **The LLM understands the language. The Family Graph is the truth. Deterministic code protects
> and decides. No component may do more than its own job.**

Understanding, truth, safety, and decision are four different jobs. The screenshot happened
because one regex tried to do all four. Never again.

---

## The seven laws

**Law 1 — Understanding is comprehension, never parsing.**
Free-form human language is understood by a language model, never by regex or slot-matching. A
city is not a person; a date is not a place. If a task requires understanding language, it is not
a parser's job.

**Law 2 — Never fabricate. "Unknown" is a valid answer.**
Close Eye presents as fact ONLY what the family actually said or what the Family Graph holds. When
it does not know, it marks the slot *unknown* and **asks** — it never fills a blank with a guess,
and never prints a guess under "your words."

**Law 3 — The model is the ear, never the memory.**
The LLM is never the source of truth. Every answer is grounded in the **retrieved Family Graph** —
the family's own words and observations — not the model's world knowledge. The model comprehends
the question; the graph supplies the facts.

**Law 4 — Safety is deterministic and unconditional.**
Crisis and red-flag detection run in code, on the raw input, **always** — before and independent
of any model. Life-safety is never delegated to a model's judgment. (A model that misses "not
breathing" once is a model that cannot be trusted with the floor.)

**Law 5 — Disposal is deterministic.**
What Close Eye can and cannot do — answer, ask, route to Care, refuse out-of-scope, escalate — is
decided by code over the structured understanding, never by the model's discretion.

**Law 6 — Provenance is never flattened.**
Every fact carries its origin — the family's words, a guardian/visit observation, or the model's
reading — and a reading is **never** promoted to a stated fact.

**Law 7 — Understand before answer; retrieve before reason.**
The order is inviolable: **comprehend → retrieve the family → reason → answer → remember.** Close
Eye never reasons from an empty context, and never answers before it has understood.

---

## Enforcement (so this is law, not a wish)

- **A permanent regression suite** (lib/connect/) holds the founding case and its siblings: *"my
  mother is travelling from Hyderabad to Bangalore"* must NEVER place a city in the person slot,
  NEVER invent a residence, NEVER assume a need. If an understanding change fabricates on any
  pinned case, **it does not ship.**
- **The crisis floor keeps its own suite** (Law 4) — deterministic, 100% recall, run on every change.
- **The comprehension contract is closed** — the model returns a fixed structure with `unknown`
  allowed for every field; a free-form answer is never trusted as structure (Law 2).
- **No regex slot-filler may live in the understanding path** (Law 1) — a guardrail asserts it.

---

*Companion to the [Architecture Constitution](../../CONSTITUTION_ARCHITECTURE.html) (the inviolable
Family → Retrieve → Reason → Answer order) and the [Navigation Constitution](./navigation_constitution.md).
Precedence unchanged: the founder's word, then the Constitution. This is how Close Eye earns the
word "understand."*
