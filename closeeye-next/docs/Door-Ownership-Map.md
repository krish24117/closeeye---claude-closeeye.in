# Close Eye — Door Ownership Map

**Read-only inventory, generated 2026-07-23.** Answers one question: which files belong to
**closeeye.app** (global Connect door), which to **closeeye.in** (India door), and which are
**shared** by both. Source of truth for the routing split is `lib/platform/front-door.ts`
(the single brain) — this doc is the human-readable manifest that pairs with it.

## Verdict up front

**Shared dominates.** Of ~110 page routes: **~5 are App-only, ~12 are India-only, and ~90+
are shared.** All of `lib/**` is shared. This is why a physical two-folder split is the wrong
move — it would force duplicating the ~90 shared screens (the family workspace, the booking
engine, the PM/Guardian/Admin consoles). The doors are already separable at the **front
door**; the **product engine** is deliberately one. Enforce the boundary with a test, don't
tear the tree in half.

Legend: 🟢 **App-only** (Connect door) · 🟠 **India-only** (closeeye.in) · ⚪ **Shared** (both)

---

## How the split is decided (from `front-door.ts`)

- On a **Connect host** (`closeeye.app`, `www.closeeye.app`, `connect.closeeye.in`): `/`
  rewrites to `/connect`, and India-commercial segments **redirect to `/connect`**.
- On the **India host** (`closeeye.in`): nothing is rewritten — every page renders.
- **`INDIA_ONLY_SEGMENTS`** = `about, book, membership, services, become-a-guardian,
  become-a-companion, trust-safety, contact, help, feedback, welcome` → 🟠 blocked on `.app`.
- **`STAFF_SEGMENTS`** = `guardian, pm, admin` → ⚪ must be reachable on every door.
- Everything not in those lists (workspace, auth, onboarding, join, legal, technical) → ⚪.

---

## 🟢 App-only — the global Connect door (`app/(connect)/`)

These pages *are* the closeeye.app front door. (They also render on `.in` since nothing
blocks them, but they are authored as the Connect door's surface.)

| Route | File |
|---|---|
| `/connect` (App home — `/` rewrites here on `.app`) | `app/(connect)/connect/page.tsx` |
| `/connect/demo` | `app/(connect)/connect/demo/page.tsx` |
| `/care` | `app/(connect)/care/page.tsx` |
| `/how-it-works` | `app/(connect)/how-it-works/page.tsx` |
| `/how-companions-are-verified` | `app/(connect)/how-companions-are-verified/page.tsx` |
| (group chrome) | `app/(connect)/layout.tsx`, `error.tsx`, `connect/experience.tsx` |

**Components:** `components/connect/` — `connect-home.tsx`, `consent-prompt.tsx`,
`config.ts`, and `understanding-conversation.tsx` ⚠️ (this last one is **also used by the
shared `/space/connect`** — it's the Connect engine UI, so treat it as shared-product that
also anchors the App door).

## 🟠 India-only — closeeye.in (`app/(marketing)/` India-commercial + funnels)

Blocked on `.app` (redirect to `/connect`). This is where the **companion funnel already
lives** — the pivot builds here.

| Route | File |
|---|---|
| `/` (India home) | `app/(marketing)/page.tsx` |
| `/about` | `app/(marketing)/about/page.tsx` |
| `/book` → booking entry | `app/(marketing)/book/page.tsx` |
| `/services` (companion services, ₹) | `app/(marketing)/services/page.tsx` |
| `/membership` (Care pricing) | `app/(marketing)/membership/page.tsx` |
| `/become-a-companion` | `app/(marketing)/become-a-companion/page.tsx` |
| `/become-a-guardian` | `app/(marketing)/become-a-guardian/page.tsx` |
| `/trust-safety` | `app/(marketing)/trust-safety/page.tsx` |
| `/contact` · `/help` · `/feedback` | `app/(marketing)/{contact,help,feedback}/page.tsx` |
| `/welcome` (India onboarding carousel) | `app/welcome/page.tsx` |
| `/f/[ref]` (founder referral funnel) | `app/f/[ref]/page.tsx` |

**Components:** `components/marketing/` — `companion-application`, `membership-plans`,
`founding-counter`, `contact-form`, `trust-safety`, `service-book-button`, `share-buttons`.
(⚠️ `components/marketing/legal-page.tsx` is **shared** — used by the legal pages below.)

## ⚪ Shared — both doors (the product engine)

**Legal / technical** (in `(marketing)` group but pass through on `.app`):
`/privacy`, `/terms`, `/cookies`, `/consent`, `/medical-disclaimer`, `/refund-policy`,
`/cancellation-policy`, `/offline`, `/design-system` · component: `marketing/legal-page.tsx`.

**App & product:**
- Auth / entry: `/auth`, `/onboarding`, `/join/**`, `/permissions`, `/notifications`,
  `/settings`, `/search`, `/founder-brief`
- **Workspace** `app/(workspace)/space/**` (~19): `space`, `activity`, `billing`, `care`,
  `connect`, `network`, `notifications`, `people`, `people/[id]` (+ `add`/`edit`/`health`/
  `memories`/`memories/add`), `people/add`, `settings`
- **Legacy family portal + booking engine** `app/family/**`: `book` (the 486-line engine),
  `members`, `visits` (+`[id]`), `messages`, `documents`, `billing`, `membership`,
  `services`, `connect`, `profile/edit`, `add`

**Staff consoles** (`STAFF_SEGMENTS` — must be on every door):
- `app/admin/**` (~25) · `app/pm/**` (~12) · `app/guardian/**` (~7)

**Shared component dirs:** `family` (56), `ui` (27), `console` (21, PM), `guardian` (10),
`admin` (9), `auth` (5), `workspace` (3), `cloza` (3), `layout` (2), `pwa` (2), `analytics`
(1), `app` (1), `funnel` (1).

**All of `lib/**` is shared:** `platform` (the region/front-door adapter — the thing that
lets one codebase serve both doors), `db`, `connect`, `collaboration`, `understanding`,
`family`, `identity`, `space`, `workspace`, `routing`, `design-system`, `observability`,
`pwa`, `cloza`.

---

## Entanglement check (why a split isn't needed)

- App-door marketing (`app/(connect)/**`) does **not** import the India booking engine or
  India family components — the front-door *surfaces* are cleanly separable already.
- The only App→shared reach is `/space/connect` (shared workspace) importing
  `components/connect` — correct: both doors' logged-in users get the same Connect engine.
- India components (`components/marketing/*`) are imported only by India routes + `/f/[ref]`.

## Recommended enforcement (instead of splitting)

1. **Keep `lib/platform/front-door.ts` the single brain** — never re-hardcode host/segment
   lists elsewhere.
2. **Add a guardrail test** that fails the build if the buckets above are violated (a Care/
   India segment leaking onto `.app`, or a `STAFF_SEGMENT` misclassified as India-only).
   Extends the existing `front-door.test.ts` / `staff-console-serves-both.test.ts`.
3. **This manifest** is the human map; update it when a route's door ownership changes.

**Precedence:** founder's word > Constitution > docs (incl. this) > code.
