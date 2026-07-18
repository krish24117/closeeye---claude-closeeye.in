# CloseEye — Navigation Constitution

*Ratified 2026-07-18. One page. No design. Just rules. Every future feature is evaluated
against these laws.*

---

## Canonical concept (frozen)

**The canonical concept is the Workspace. `/space` is merely the first URL that represents it.**

The Workspace is the family's operating system. Every feature is a *tool inside* the Workspace,
never a competing destination. Product identity attaches to the **Workspace**, not to any route
name — so the eventual evolution to `/workspace` (Family · Personal · Business, switched *inside*
the Workspace) is a URL evolution, never a change of concept.

```
Space (Workspace)
├── Family
├── Connect
├── Visits
├── Timeline
├── Documents
├── Billing
└── Settings
```

---

## The seven laws

**Law 1 — One Home.** Every user has exactly one Home.

**Law 2 — One canonical location.** Every feature has exactly one canonical location.

**Law 3 — One navigation tree.** No feature may exist in two navigation trees.

**Law 4 — Notifications open inside the Workspace.** Every notification opens inside the Workspace.

**Law 5 — Deep links are canonical.** Every deep link resolves to a canonical URL.

**Law 6 — Auth never shapes IA.** Authentication never determines information architecture.

**Law 7 — Three taps.** A person is never more than three taps from any primary capability.

---

## Enforcement — the Ownership Registry (ratified 2026-07-18)

Laws 1–3 are enforced by the **[Ownership Registry](./ownership_registry.md)** — the source of
truth for every capability's one Owner and one canonical route. Every new feature must answer
**"Which Owner does this belong to?"** — **if it has no Owner, it does not ship.**

**Primary navigation (v1):** Home · Ask · People · Activity · Care. Billing and Settings are
overflow.

## Separation of concerns — navigation vs state (frozen 2026-07-18)

> **Navigation organizes capabilities. Workspace state organizes attention.**

Navigation answers *"Where do I go?"* and is **stable** (the five Owners). State answers *"What
matters right now?"* and is **dynamic** (it reshapes what Home leads with, never the map). They are
different problems and must stay separate — see the [Workspace State Model](./workspace_state_model.md).
Ownership is also system-wide, not just navigation: permissions, notifications, search, AI
retrieval and APIs all defer to a capability's one Owner (see the
[Ownership Registry](./ownership_registry.md)).

## Governing directive — optimize for launch, not Year 5 (ratified 2026-07-18)

**Do not optimize the navigation for the company CloseEye wants to become in five years. Optimize
it for the product customers are paying for at launch.** At launch (Hyderabad), families pay for
trusted human presence — **Care is a top-of-funnel job**, so it stays in primary navigation for
v1. Care leaves primary navigation only when usage data proves it is no longer a primary
destination (e.g. Ask becomes the dominant session type). The architecture leaves room to evolve;
v1 stays grounded in today's customer value.

---

*These laws precede Phase 2 (Workspace Consolidation) and govern it. See
[space_home_consolidation_plan.md](./space_home_consolidation_plan.md) and the
[Ownership Registry](./ownership_registry.md).*
