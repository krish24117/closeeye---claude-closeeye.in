# CloseEye — Connect UI Design

*Design for review — no code yet. The EXPERIENCE layer only; the intelligence is designed
separately ([understanding_system_design.md](./understanding_system_design.md)). They meet at one
seam: the UI renders the `Understanding` contract the system produces. Design language: Connect
(Newsreader serif "human voice" + Inter chrome + warm paper — the `.cx`/`.wsp` identity).*

---

## The one idea

**Show the understanding before the answer.** Connect's difference isn't that it answers — every
chatbot answers. It's that it shows you *what it understood*, marks *what it doesn't know*, and
lets you *correct it* — before it says a word back. The UI's whole job is to make "understand
first" **visible and trustworthy.** When the system is unsure, the UI **asks** — it never shows a
guess as a fact.

---

## The loop

```
Say  →  Understand (shown)  →  Confirm / Correct  →  Answer (grounded)  →  Act (if needed)
                    ↑                        │
                    └──── ask when unsure ───┘
```

Every turn is this loop. The user is always one tap from correcting Close Eye's understanding.

---

## The signature surface — the Understanding Ledger

What Close Eye understood, rendered with **provenance always visible** (Constitution Law 6). Three
marks, never blurred:

| Mark | Means | Example |
|---|---|---|
| **✓ from your words** | a fact the family stated | ✓ *She's travelling from Hyderabad to Bangalore* |
| **~ my reading** | an inference, labelled as one — never a fact | ~ *You might want someone to help her settle in* |
| **○ still to know** | an unknown, an invitation to fill | ○ *How is her health?* |

**The rule the UI enforces:** a `~ my reading` can never wear a `✓`. An `○ unknown` is shown as a
question, never asserted. This is where the screenshot failed — "you need a real-world hand" was a
reading printed as a ✓ fact. In this design that is structurally impossible: readings render in
their own row, in muted type, with the word "reading".

Footer, only when true: *"The ticks are your words. The tildes are my reading. Nothing is
assumed."* — shown **only** if every ✓ is genuinely stated (Law 2).

---

## Ask when unsure (the honest moment)

When comprehension returns low confidence or a `clarifying_question`, the UI does **not** render a
ledger of guesses. It renders a single, calm question:

> *"Is Amma travelling for a trip, or moving to Bangalore for good?"*
> [ For a trip ]   [ Moving ]   [ Let me explain ]

The answer feeds straight back into the loop. A Close Eye that asks reads as *careful*; one that
assumes reads as *wrong*. We choose careful.

---

## Correction is always one tap

Under any understanding: **"Did I get this right?"** → **Not quite** (edit the reading) · **Edit**
(fix a fact) · **Change the person**. Correcting is not an error path — it's the product working.
Each correction writes to the Family Graph, so Close Eye is more right next time (learning by
accumulation).

---

## The answer

Shown **after** understanding, and only ever grounded in what Close Eye knows (the retrieved
graph). It always includes an honest edge: *"Here's what I can say from what I know — and here's
what I'd need to know to say more."* No confident answer built on an unknown.

---

## Two surfaces, one experience

| | `/connect` — first conversation | `/space/connect` — the Workspace |
|---|---|---|
| Who | a signed-**out** visitor meeting Close Eye | a signed-**in** family, ongoing |
| Tone | onboarding: *"Tell me about someone you love."* | continuity: subject chips (Mother/Father/Amma), history |
| Goal | one sentence → a visible understanding → sign in to keep it | ask anything → grounded answer → act |
| Same | the loop, the ledger, ask-when-unsure, correction, the design language |

The first conversation is the demo of the whole product **running** — it understands your one
sentence in front of you. That is the conversion moment; it must never fabricate, or the promise
breaks at hello.

---

## States (what the surface shows)

- **Listening** — the input, a calm prompt, suggestions.
- **Understanding** — a brief "reading you…" then the ledger reveals (the existing unfold motion).
- **Clarifying** — the single question + quick chips.
- **Answering** — the grounded answer + the honest edge.
- **Acting** — route to Care / add to the graph / talk to a person.
- **Can't** — honest: *"I didn't quite follow — tell me a little more?"* Never a fake answer.

---

## Design language (non-negotiable)

Newsreader serif for the voice (what Close Eye "says" and the person's name), Inter for chrome and
labels, warm paper, generous space, whisper-soft shadows — identical to `/connect` and the
Workspace. One product, one feel, in every country. Region-specific *values* (emergency number,
currency) adapt; the *look* never does.

---

## The seam (where the two designs meet)

The system emits an `Understanding` object; the UI renders it. That is the only contract between
them — which is why we can perfect each on its own, then join them. Change the model, the UI
doesn't move. Restyle the UI, the intelligence doesn't move.
