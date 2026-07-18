# CloseEye — Ownership Registry

*Ratified 2026-07-18 as a constitutional enforcement mechanism. The source of truth for where
every capability lives. Enforces [Navigation Constitution](./navigation_constitution.md) Laws 1–3
(one Home · one canonical location · no feature in two nav trees).*

---

## The rule

**Every capability has exactly one Owner and exactly one canonical route.** Every other
appearance of that capability is a *reference* (a link), never a second home — **surfacing ≠
owning.**

Before any new feature ships it must answer one question:

> **"Which Owner does this belong to?"**

**If it has no Owner, it does not ship.** A capability without a home in this registry is a
capability that breaks the information architecture.

---

## Owners

| Owner | Canonical root | In primary nav? | What it owns |
|---|---|---|---|
| **Home** | `/space` | ✅ | The Workspace landing — how is everyone, at a glance |
| **Connect** | `/space/connect` | ✅ | CloseEye Connect — the family intelligence and conversation |
| **People** | `/space/people` | ✅ | The people you love and everything scoped to a person |
| **Activity** | `/space/activity` | ✅ | The timeline — what changed, presence stories, the family's story |
| **Care** | `/space/care` | ✅ | Real-world presence — visits, booking, services |
| **Billing** | `/space/billing` | overflow | Membership and payments |
| **Settings** | `/space/settings` | overflow | Profile, preferences, Trust & Safety |

**Primary navigation (v1):** Home · Connect · People · Activity · Care.
Billing and Settings are overflow (Account menu). Notifications and Emergency are global actions,
not owned routes — they *resolve into* the Workspace at the relevant Owner's canonical route.

---

## The registry (every capability today)

| Capability | Owner | Canonical route |
|---|---|---|
| Workspace home / overview | **Home** | `/space` |
| Ask CloseEye (AI) | **Connect** | `/space/connect` |
| Messages (care team / human) | **Connect** | `/space/connect` |
| Family roster | **People** | `/space/people` |
| A person (Person Space) | **People** | `/space/people/[id]` |
| Person health (conditions, meds, allergies) | **People** | `/space/people/[id]/health` |
| Person documents (reports, prescriptions) | **People** | `/space/people/[id]/documents` |
| Add someone | **People** | `/space/people/new` |
| Timeline / what changed / Presence Stories | **Activity** | `/space/activity` |
| Request a visit (book) | **Care** | `/space/care` |
| Visits — upcoming & past | **Care** | `/space/care` |
| Visit detail | **Care** | `/space/care/[id]` |
| Services catalogue | **Care** | `/space/care` |
| Membership | **Billing** | `/space/billing` |
| Billing / payments | **Billing** | `/space/billing` |
| Profile & settings | **Settings** | `/space/settings` |
| Trust & Safety / policies | **Settings** | `/space/settings` |
| Notifications | *global action* | opens at the relevant Owner's route (Nav Law 4) |
| Emergency | *global action* | always reachable; not an Owner |

**Surfacing-not-owning examples (allowed, not violations):**
- A **visit** is owned by **Care**; **Activity** and a Person's page *surface* it (link to the one canonical `/space/care/[id]`).
- A person's **story** is **Activity** filtered to that person — Activity owns the feed; the Person page references its slice.
- **Home** surfaces People, Activity and Ask; it owns none of them — it is the curated cross-section.

---

## Ownership is system-wide, not just navigation (ratified 2026-07-18)

Ownership is a **system-wide contract**. The question *"Who owns this capability?"* — not *"Where
is it shown?"* — governs far more than where a link lives. As CloseEye grows, the same Owner is
the authority for a capability across every subsystem:

- **Navigation** — the canonical route
- **Permissions** — who may see/act on it
- **Notifications** — what surfaces and where it opens
- **Search indexing** — how it is found
- **AI retrieval** — what Connect reads and reasons over
- **APIs** — the canonical contract for the capability

**Worked example — a Visit.**

| | |
|---|---|
| **Owner** | Care |
| **Canonical location** | `/space/care/[id]` |
| **Visible from** | Home · Activity · Person · Search · Ask |
| **Permissions / notifications / search / AI retrieval / API** | all defer to **Care** |

This prevents the most common failure of a growing product: the same feature slowly existing in
multiple places with different behaviours. There is one owner; everything else references it.

## Amendment procedure

A new Owner is added only when a capability genuinely belongs to none of the above — a deliberate
constitutional act, not a convenience. Renaming an Owner or moving a canonical route is a
migration (redirect + guardrail), never a silent edit. This registry is versioned with the code
and reviewed whenever a capability is added.
