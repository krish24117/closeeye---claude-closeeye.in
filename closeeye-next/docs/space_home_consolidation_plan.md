# CloseEye Connect — Home Consolidation Migration Plan

**Decision (ratified 2026-07-18):** `/space` is the canonical post-login home. `/family`
ceases to be a competing home — its overview redirects to `/space`, its functional surfaces
become subsections of the `/space`-rooted app, and every entry point converges on `/space`.

**Target:** one home · one primary navigation model · one mental model.
**Constraints:** no broken navigation or deep links, ever · reversible and production-deployable
after every phase.

**Canonical concept (frozen):** the canonical concept is the **Workspace**; `/space` is merely
its first URL. `/space` does not become another page — it becomes the **Workspace**, and every
feature becomes a *tool inside* it. This scales to Personal and Business later without a breaking
rename. Governed by the [Navigation Constitution](./navigation_constitution.md).

```
Space (Workspace)
├── Family   ├── Connect   ├── Visits   ├── Timeline
├── Documents   ├── Billing   └── Settings
```

---

## 1. Current reality (why this is non-trivial)

| | `/space` | `/family` |
|---|---|---|
| Routes | **1** (route group `(space)`) | **18** (book, visits, members, membership, billing, documents, connect, services, profile, add, messages…) |
| Chrome | minimal (`.spc`, Newsreader) | full **FamilyShell**, 7-item tab nav (Manrope) |
| Role | the Connect **home** (journal) | the functional **app** |
| Auth | its own ad-hoc OAuth (self-handled) | `auth-gate` managed; home target = `/family` |
| "Home" points to | itself | `/family` (FamilyShell logo ×2) |

- **94 internal links** point at `/family/*`.
- **Notifications carry no deep-link target today** (`id, type, title, message, read` only) — informational, so **no deep-link breakage risk now**; future links must target `/space`.
- `/space` is **not** in `auth-gate`'s managed `APP` list — it's an island.

**The load-bearing constraint:** two shells + two design languages. The home **cannot** flip to
`/space` until `/space` can navigate to every functional surface (the single nav model). That nav
unification is UI work — the piece being deferred. It is the pivot the whole migration turns on.

---

## 2. Principles (same discipline as the platform migration)

- **No broken deep links** — every legacy URL renders or `308`-redirects. At every phase.
- **One concern per phase** — routing changes and UI changes never in the same step.
- **Reversible & production-deployable** after every phase.
- **Converge, don't big-bang.**

---

## 3. Phases

### Phase 0 — Lock + guardrail · SAFE NOW · no UI · no behaviour change
- Ratify "`/space` = canonical home" in the routing IA / Architecture Constitution.
- Ship a **deep-link guardrail test**: enumerate every legacy `/family/*` route + the 94 links; assert each resolves (renders or redirects) — nothing `404`s at any point in the migration. (Same pattern as `staff-console-serves-both`.)
- *Deliverable: the safety net. Nothing else moves without it.*

### Phase 1 — Converge FUTURE entry points · SAFE NOW · no UI
- Add-Someone → already lands on `/space` ✓ (done).
- Give `AppNotification` an optional `target`; route taps; author all **new** targets at `/space`. No existing targets to migrate.
- Any deep link authored from today points at `/space`.
- *Deliverable: no new divergence is created while we migrate.*

### Phase 2 — Workspace Consolidation · the pivot · needs greenlight
Not a UI redesign. The deliverables are **architectural outcomes**, not prettier screens:
one navigation model · one information architecture · one shell · one authentication flow ·
one canonical home.
- Build a single Workspace shell whose **Home = `/space`** and whose nav reaches every capability as a tool inside the Workspace.
- `/space` becomes the Workspace; FamilyShell's Home target changes `/family` → `/space`; the two interaction models and design languages reconcile into one.
- **The pivot:** once the Workspace can reach every capability, the home can flip without stranding anyone.
- Can ship *behind* the current routing (shell before the flip).

### Phase 3 — Flip the home · routing only · reversible
- `auth-gate`: family home target `/family` → `/space`; add `/space` to the managed `APP` list; fold `/space`'s ad-hoc OAuth into the one auth model (keep its sign-in working for back-compat).
- Direct sign-in now lands on `/space`. Deep links unaffected.
- *Reversible: flip the target back (one line).*

### Phase 4 — Migrate capabilities (not routes) · routing + redirects
Do **not** ask "where should `/family/settings` go?" Ask "**what capability does this
represent?**" This phase designs the future information architecture, it does not preserve the
old one.

The canonical owner + route for every capability is fixed by the ratified
[Ownership Registry](./ownership_registry.md) — the source of truth this phase executes:

| Existing | Owner | Canonical location |
|---|---|---|
| Family Overview | **Home** | `/space` |
| Members | **People** | `/space/people` |
| Visits · Book · Services | **Care** | `/space/care` |
| Timeline / what changed | **Activity** | `/space/activity` |
| Ask · Messages | **Ask** | `/space/ask` |
| Payments · Membership | **Billing** | `/space/billing` |
| Documents | **People** | `/space/people/[id]/documents` |
| Profile · Settings | **Settings** | `/space/settings` |

- `/family` (bare overview) → `308` → `/space`.
- Each capability re-homes under `/space/*`; **every** legacy `/family/<x>` gets a `308` → its canonical location (deep links preserved). The guardrail enforces no-`404`.
- Update the 94 internal links to canonical targets (mechanical, guardrail-checked).

### Phase 5 — Cleanup
- Remove the dead FamilyShell "home"; delete unreachable code; collapse duplicate nav.
- Confirm one home, one nav, one mental model; guardrail green.

---

## 4. `/family` disposition (recommendation)

Bare `/family` → **redirect** to `/space` (kills the competing home immediately, zero deep-link
cost). Functional `/family/*` → **migrate to `/space/*` subsections** over Phase 4 with `308`
back-compat, so the end state is a single `/space` namespace = one mental model. **URLs move
last; nothing breaks because redirects cover every legacy path.**

---

## 5. Critical-path ordering (do not violate)

```
Phase 0 (guardrail) ─► Phase 1 (converge future) ─► Phase 2 (UNIFIED NAV, UI) ─► Phase 3 (flip home) ─► Phase 4 (redirect /family) ─► Phase 5 (cleanup)
                                                     └── the single greenlight that unblocks the flip
```
**Phase 2 MUST precede Phase 3.** Flipping the home before the unified nav exists strands users
on `/space` with no route to features. This is the one ordering that cannot be reordered.

---

## 6. Risks + rollback

- **Stranding** — mitigated by strict Phase 2-before-3 ordering.
- **Deep-link breakage** — mitigated by the Phase 0 guardrail (fails the build on any `404`) + `308` redirects covering every legacy path.
- **Auth duplication** — `/space` ad-hoc OAuth vs `auth-gate`; reconcile in Phase 3, both working until then.
- **External/native deep links** (APK, WhatsApp report links, emails) — audit for hardcoded `/family/*`; the `308`s cover them, but note any to fix at source.
- **PWA cache** — bump `sw` VERSION each shipped phase so devices pick up routing changes.
- **Rollback** — every phase is a discrete revert; the home flip (Phase 3) is a one-line change.

## 7. Explicitly deferred

- **Phase 2 (Workspace Consolidation)** — the shell/IA/auth unification. Everything else is routing/guardrails and can proceed now. Phase 2 is the single greenlight that unblocks the flip.
- **The `/workspace` evolution** — once Personal and Business exist, the user will land in `/workspace` and switch contexts (Family · Personal · Business) inside it. **Not now.** Keeping `/space` as the canonical home is the right trade-off for this phase; because the canonical *concept* is the Workspace (not the route), that later move is a URL evolution, not a breaking rename.

---
*Governed by the [Navigation Constitution](./navigation_constitution.md). The seven laws are the
standard every phase — and every future feature — is evaluated against.*
