# CloseEye — Understanding System Design (Track 2)

*Design for review — no code yet. Implements the [Understanding Constitution](./understanding_constitution.md)
and the [Architecture Constitution](../../CONSTITUTION_ARCHITECTURE.html) order. This is the
INTELLIGENCE layer only; the interface is designed separately ([connect_ui_design.md](./connect_ui_design.md)).*

---

## Purpose

Replace the deterministic parser that fabricates ("Hyderabad is someone you love") with
comprehension that understands language and **never invents**. The LLM understands; the Family
Graph is the truth; deterministic code protects and decides.

---

## The pipeline (canonical order — inviolable)

```
raw input
  │
  ├─▶ 1. SAFETY FLOOR (deterministic, always, on raw text)  ── crisis? → escalate, stop.
  │
  ├─▶ 2. COMPREHEND (LLM → closed contract, "unknown" allowed, never fabricate)
  │
  ├─▶ 3. RETRIEVE (the Family Graph for the subject — what we already know)
  │
  ├─▶ 4. DISPOSE (deterministic over the understanding):
  │        • unclear / low confidence → ASK a clarifying question (never assert)
  │        • out of scope            → decline honestly
  │        • need = presence         → route to Care
  │        • otherwise               → ANSWER, grounded in the graph
  │
  └─▶ 5. REMEMBER (persist stated facts to the Family Graph, with provenance)
```

Safety is step 1 and unconditional (Law 4). Nothing the model says can suppress it.

---

## 2 · The comprehension contract (the heart of it)

The model returns **one closed JSON structure** — never free prose parsed for meaning (Law 1/2).
Every field may be `"unknown"`; that is a valid, first-class answer.

```jsonc
{
  "intent": "share" | "ask" | "request_help" | "greeting" | "unclear",
  "subject": {
    "who":          "<a PERSON — 'Amma', 'my mother', 'self'>" | "unknown",
    "relationship": "mother|father|…"                          | "unknown"
  },
  "situation":  "<what is happening — 'travelling', 'unwell', 'moving'>" | "unknown",
  "need":       "<what they want>" | "none_stated" | "unknown",
  "locations":  { "from": "…"?, "to": "…"?, "lives_in": "…"? },   // travel ≠ residence
  "facts":      [ { "label": "…", "value": "…", "provenance": "stated" } ],  // ONLY the user's words
  "confidence": "high" | "low",
  "clarifying_question": "<one question>" | null,
  "safety_signal": true | false            // a soft hint; the deterministic floor is authoritative
}
```

**The rules the contract enforces (why the screenshot can't recur):**
- `subject.who` is a **person**. A city can never land here — the model knows Hyderabad is a place.
- `locations` are separate and **typed** — "travelling from X to Y" fills `from`/`to`, never `lives_in`.
- `need` defaults to **`none_stated`** — an unrequested "you need a real-world hand" is impossible.
- `facts[]` carry `provenance:"stated"` and hold **only the user's actual words** (Law 6).
- Anything the model is unsure of is `"unknown"` + a `clarifying_question` — it **asks, never asserts** (Law 2).

The client/edge validates the shape; a malformed or non-JSON reply is treated as "unclear → ask",
never guessed at (Law 2).

---

## 3 · Grounding — the model is the ear, not the memory (Law 3)

Comprehension produces the *shape* of what was said. The **answer** is composed from the
**retrieved Family Graph** (`lib/db/retrieve` — already built): the family's stated facts and
observations for that subject. The model may phrase; it may not invent facts. "How is Amma?" is
answered from what Close Eye *knows* about Amma, plus an honest "here's what I don't know yet."

---

## 4 · Where it runs

| Surface | Who | Endpoint |
|---|---|---|
| `/connect` first-conversation | signed-**out** visitor | a new **public** comprehension endpoint (`understand-public`) — rate-limited, no PII stored until they choose to, mirrors `ask-health-public`'s guardrails |
| `/space/connect` (Workspace) | signed-**in** family | `ask-health` (authed) extended to return the contract |

Both call the SAME comprehension core + the SAME Understanding Constitution; only auth/limits differ.

---

## 5 · Provider-replaceable (Architecture Constitution, Article IX)

The model sits behind one interface (`comprehend(input, context) → Understanding`). Swapping the
provider (Anthropic ↔ gateway ↔ another) changes one adapter, never the pipeline. Zero-retention
provider config satisfies Article X (family data ownership / DPDP).

---

## 6 · What gets deleted

The deterministic **parser** for understanding — `lib/connect/understand` + the slot-filling in
`lib/connect/ledger` — is retired from the comprehension path (Law 1). What is KEPT: the crisis
floor (`_shared/crisis`), `lib/db/retrieve`, provenance/ledger *storage*, and the regression
harness.

---

## 7 · Enforcement (the law made real)

A permanent regression suite runs on every change and blocks the merge if any case fabricates:
- **The founding case** — "my mother is travelling from Hyderabad to Bangalore" → `subject.who` = a
  person (mother), `locations.from/to` = the cities, `need` = `none_stated`. A city in `subject.who`
  fails the build.
- **Siblings** — insurance/relocation/date paraphrases (the earlier misparse family).
- **The crisis suite** — "not breathing" etc. → escalate, deterministically, 100% recall.
- **Ask-when-unsure** — ambiguous inputs must produce a `clarifying_question`, never an assertion.

---

## Open decisions for you

1. **Signed-out comprehension** — OK to add a public `understand-public` endpoint (an LLM call for
   anonymous first-conversation visitors, rate-limited), or keep signed-out fully on-device and
   only comprehend after sign-in? (Trade: instant magic for visitors vs. cost/abuse surface.)
2. **Model tier** — the fastest capable model for comprehension (latency matters in a conversation)
   vs. a stronger one. Recommendation: fast tier for comprehend, it's a structured task.
