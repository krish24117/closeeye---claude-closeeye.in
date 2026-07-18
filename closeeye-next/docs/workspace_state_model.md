# CloseEye — Workspace State Model

*Ratified 2026-07-18. The third architectural artifact, beside the
[Ownership Registry](./ownership_registry.md) and the
[Navigation Constitution](./navigation_constitution.md).*

---

## The frozen principle

> **Navigation organizes capabilities. Workspace state organizes attention.**

They are different problems:

| | Answers | Nature |
|---|---|---|
| **Navigation** | *Where do I go?* | **Stable** — the five Owners never change with the situation |
| **State** | *What matters right now?* | **Dynamic** — reshapes what Home leads with |

**Users do not come to a dashboard. They come to a situation.** The Workspace must adapt to the
family's current state rather than always rendering the same layout. State never changes the
navigation — the five Owners are constant — it changes **what Home surfaces first** and which
global affordances rise.

---

## The states

State is **derived, never asserted** — read deterministically from the Family Graph (signals,
observations, alerts, active bookings/visits, crisis detection), consistent with
deterministic-safety-first and the honesty guarantee (*never claim calm without a positive
signal*). State is computed **per person** and **rolls up** to the Workspace by urgency.

| State | Trigger | What Home leads with |
|---|---|---|
| **Getting to know** | New person / no positive signal yet | Welcome, what Connect is learning, "tell me" prompts, Ask. *Never* a false "all calm." |
| **Healthy** | Positive signal, no open alerts | Family summary, recent memories, Ask line |
| **Needs Attention** | Missed medication · new report · reminder · suggested action | The attention item(s) up top + the one suggested action |
| **Active Care** | A visit is live / a Guardian is en route | Live visit card, timeline updates, "Contact Guardian" |
| **Emergency** | Crisis detected (deterministic safety floor) | Emergency banner, one-tap actions (region-correct number, care team), live updates |
| **Resolved** | An attention/emergency episode just closed | Brief acknowledgement, then settles back toward Healthy |

**Roll-up priority** (the Workspace leads with the most urgent person's state):

```
Emergency  ►  Active Care  ►  Needs Attention  ►  Getting to know  ►  Healthy  ►  Resolved (transient)
```

A family with several people can hold several states at once (Dad *Healthy*, Amma *Needs
Attention*); Home leads with the most urgent and shows each person's state on the roster.

---

## What state does and does not touch

- **Does:** reshape Home's leading content; raise global affordances (e.g. the Emergency banner); set each person's status indicator on the People roster.
- **Does NOT:** change the navigation (the five Owners are constant — Law of separation above); change **ownership** (a live visit is still *owned* by Care; *Active Care* merely **surfaces** it on Home — surfacing ≠ owning).

---

## Relationship to what exists

- **Supersedes the ad-hoc 4-state dashboard** (`new / family_added / visit_booked / active`,
  `lib/db/dashboard.ts`). Those encode an **onboarding lifecycle**; this model encodes the
  **family's situation**. Onboarding maps into **Getting to know**; the rest of the lifecycle is
  subsumed by attention/care states. (Migration is a Phase-2 concern; the LOCKED lifecycle stays
  until the state model replaces it deliberately.)
- **Honors the honesty guarantee** already in `deriveSnapshot` — *Getting to know* is exactly the
  refusal to fake calm before a real signal exists.

---

## Why this matters for Phase 2

Home (Owner: **Home**, `/space`) is **state-driven**: it renders the current Workspace state, not a
fixed dashboard. The other four primary Owners (Ask, People, Activity, Care) are **navigation
destinations** — stable regardless of state. This separation is what keeps the Workspace legible as
the product grows: attention changes constantly; the map does not.
