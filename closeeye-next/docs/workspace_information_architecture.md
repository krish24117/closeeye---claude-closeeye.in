# CloseEye — Workspace Information Architecture (Phase 2 design)

*Design of record. No code, no routes, no components — this is the IA the routing later obeys.
Governed by the [Navigation Constitution](./navigation_constitution.md); executes
[space_home_consolidation_plan.md](./space_home_consolidation_plan.md) Phase 2.*

**Design stance:** designed from user intent as if built from scratch today — not preserved from
today's routes, database entities, or engineering modules. The organising axis is the **person
you love**, and the constitutional order **Understand → Answer → Act**.

---

## Part 1 — Mental model & jobs, by frequency

Families do not hold a feature list in their heads. They hold one running question: **"Are the
people I love okay?"** The unit of thought is a **person** ("Dad," "Amma"), and the currency is
**change** ("what's different since I last looked"). CloseEye is where that question gets a
trustworthy answer — and, when the answer isn't enough, where real presence is summoned.

Jobs ranked by frequency (prominence should follow this):

| # | Job | Intent | Frequency | Why |
|---|---|---|---|---|
| 1 | "How is Dad?" — check someone's state | Understand | **Highest** | The reason they're here; reassurance is consumed passively and often (daily for NRIs) |
| 2 | "What changed today?" | Understand | **Very high** | Change carries the meaning; usually same session as #1 |
| 3 | "Is this normal / what do I do?" — ask | Answer | High | Worry- and event-triggered; the intelligence pillar |
| 4 | "Someone needs to check on them" — act | Act | Episodic | Low frequency, high intent when it fires |
| 5 | "What happened at that visit?" — review | Understand (reference) | Medium/low | Reference to a specific past event |
| 6 | "Add someone I love" | Grow | Low | Rare, but highest lifetime value — it grows the Family Graph moat |
| 7 | Pay / membership / settings | Administer | Rare | Pure administration |
| — | Respond to a notification · Emergency | Event-driven | — | Not navigation — surfaced to the user |

**Principle:** frequency inversely tracks how transactional a job is. Understanding and asking
are frequent and passive; acting is occasional; admin is rare. Navigation prominence follows
frequency, which also happens to reinforce the positioning — **a Family Intelligence Platform,
not a collection of services.**

---

## Part 2 — Information Architecture

**Organising principle: person-centric intelligence.** The spine is the people you love.
Everything else is either (a) something Connect *knows/observes* about a person, (b) a way to
*ask*, or (c) a way to *act*. Two cross-cutting concerns (Ask, Account) sit beside the spine.

```
WORKSPACE (Space)
│  ── primary navigation (5 owners) ──
├── Home       ► /space           how is everyone, at a glance
├── Connect    ► /space/connect   Connect: the family intelligence + messages
├── People     ► /space/people    the people you love
│     └── Person Space ► /space/people/[id]   Overview · Story · Health · Documents
├── Activity   ► /space/activity  what changed · presence stories · the family's story
├── Care       ► /space/care      request a visit · upcoming & past · services
│
│  ── overflow (Account menu) ──
├── Billing    ► /space/billing   membership & payments
└── Settings   ► /space/settings  profile · Trust & Safety

Global actions (omnipresent, not sections): Add someone (+, People) · Notifications · Emergency · Account menu
```

Ownership is fixed by the [Ownership Registry](./ownership_registry.md). "Story" on a Person is
**Activity filtered to that person** — Activity owns the feed; the Person page references its slice.

**The one-owner rule (Law 2), stated precisely: _surfacing ≠ owning._** A capability has exactly
one canonical home; every other appearance is a *reference* (a link), never a second editable
authority. Example: a visit is *owned* by Care (its canonical detail lives there) and *surfaced*
in the person's Timeline. That is not duplication. Duplication is two places that both claim to
own the same thing. An **ownership registry** (below) makes this enforceable, not a matter of
taste.

---

## Part 3 — Canonical Workspace navigation

> **Ratified 2026-07-18.** Primary nav is **five** owners, not the three intent-tiers I first
> proposed. Rationale (founder): *optimize for launch, not Year 5.* At launch, families pay for
> trusted human presence, and People + Activity are how they check on the people they love — so
> these are top-of-funnel jobs and earn primary placement now. The 3-tier minimalism is the Year-5
> shape, not the launch shape.

**Primary navigation — 5 owners** (see [Ownership Registry](./ownership_registry.md)):
1. **Home** — how is everyone, at a glance. *(the landing)*
2. **Connect** — CloseEye Connect, the family intelligence. *(Answer)*
3. **People** — the people you love; drill into a Person Space. *(Understand — who)*
4. **Activity** — the timeline: what changed, presence stories. *(Understand — what happened)*
5. **Care** — request and review real-world presence. *(Act — a paid-for launch job)*

*Why these five:* they are the highest-frequency, highest-value **launch** jobs, each a distinct
Owner. Ask still sits before Care (answer before act). Care stays primary until usage data shows
it is no longer a primary destination — then it demotes under Services without breaking the IA.

**Secondary navigation — contextual, inside a Person Space.**
Overview · Story · Health · Documents. *Why:* the person is the object; these are its facets, so
they are sub-navigation, not global tabs. "Story" is **Activity filtered to this person** (Activity
owns the feed; the Person page references its slice — surfacing ≠ owning).

**Overflow navigation — behind the Account menu.**
Membership & Billing · Settings · Trust & Safety. *Why:* low-frequency administration; tucking it
away declutters and signals "this is not what CloseEye is about."

**Global actions — omnipresent, not destinations.**
- **Add someone (+)** — the platform's growth act; a global affordance, never buried in a section.
- **Notifications** — "what needs you"; opens *inside* the Workspace (Law 4).
- **Emergency** — always one tap away (safety-first).
- **Account (avatar → menu)** — the overflow entry.

**Floating action — none.** A FAB would duplicate primary nav. The primary "create" is **Connect**,
which is already primary nav *and* a persistent compose line on Home. If a single reach-anywhere
action is ever wanted on deep pages, it is **Connect** — never "Book," because we answer before we act.

---

## Part 4 — Migration table (today → canonical)

Every `/family/*` capability re-homed by **capability**, not by route. Canonical namespace is
`/space/*`; every legacy path `308`-redirects (Phase 4), enforced by the Phase-0 deep-link guardrail.

| Capability | Current | Future canonical | Migration notes | Redirect |
|---|---|---|---|---|
| Home / overview | `/family` | `/space` (Home) | Replaces the 4-state dashboard with "everyone you love + what changed" | `308 → /space` |
| People index | `/family/members` | `/space/people` | The roster; Home is the curated overview, this is the full index | `308 → /space/people` |
| Person | `/family/members/[id]` | `/space/people/[id]` | Becomes the **Person Space** (Overview/Story/Health/Documents) | `308` |
| Person health | `/family/members/[id]/health` | `/space/people/[id]/health` | Person-scoped facet | `308` |
| Timeline / what changed | (embedded today) | `/space/activity` (Owner: **Activity**) | Family feed; a Person's "Story" is this filtered to them | n/a (new Owner) |
| Add someone | `/family/add` | `/space/people/new` (global action) | Global "+"; lands on the new person's Space (already shipped) | `308 → /space/people/new` |
| Connect / Ask | `/family/connect`, `/connect/ask`, `/connect/[id]` | `/space/connect` | Consolidate into one Connect surface | `308 → /space/connect` |
| Messages | `/family/messages`, `/messages/[id]` | `/space/connect` (threads) | Human messages join AI Ask under one Connect roof — no second inbox | `308 → /space/connect` |
| Book a visit | `/family/book` | `/space/care` (book flow) | Care = act tier | `308 → /space/care` |
| Visits | `/family/visits`, `/visits/[id]` | `/space/care` + `/space/care/[id]` | One canonical visit detail; Person Timeline *references* it | `308` |
| Services | `/family/services` | `/space/care` (catalogue) | "What Care can do," inside Care | `308 → /space/care` |
| Documents | `/family/documents` | `/space/people/[id]/documents` (Owner: **People**) | Person-scoped; a family-level view is a read-only aggregate | `308 → /space` |
| Membership | `/family/membership` | `/space/billing` (Owner: **Billing**) | — | `308` |
| Billing | `/family/billing` | `/space/billing` (Owner: **Billing**) | — | `308` |
| Profile / settings | `/family/profile`, `/profile/edit` | `/space/settings` (Owner: **Settings**) | — | `308` |

*Redirect strategy:* all entries land in `WORKSPACE_REDIRECTS` (single source of truth,
`lib/routing/redirects.ts`), spread into `next.config`; the guardrail fails the build if any
legacy path stops resolving. `/family` itself redirects last, after every child has a canonical
home.

---

## Part 5 — Constitution check

| Law | Verdict | Note / watch-item |
|---|---|---|
| 1 · One Home | ✅ | `/space` is the sole Home; `/family` retires |
| 2 · One canonical location | ✅ | Enforced by the *surfacing ≠ owning* rule + ownership registry |
| 3 · No feature in two nav trees | ⚠️→✅ | Real risk: visits (Care ∩ Timeline), documents (person ∩ family aggregate). Resolved by declaring a single **owner** and making all else references. Must be policed. |
| 4 · Notifications open in Workspace | ✅ | Phase 1 shipped; Phase 4 refines targets to specific `/space/*` |
| 5 · Deep links canonical | ✅ | `308` map + Phase-0 guardrail |
| 6 · Auth never shapes IA | ⚠️→✅ | `/space`'s ad-hoc OAuth must fold into one auth flow (Phase 3) so auth isn't a parallel structure |
| 7 · ≤3 taps to any primary capability | ✅ | Home 0 · Ask 1 · Care/book 1 · a person 1 · a person's visits 2 · add 1 · notifications 1 · emergency 1 · billing 2 |

**Improvements mandated by the check:** (a) publish an **ownership registry** (one owner per
capability) to hold Law 2/3; (b) fold `/space` auth into the single flow in Phase 3 (Law 6);
(c) decide Documents ownership = **person**, family view is read-only (Law 3).

---

## Part 6 — User journeys

1. **First-time user** — after the first conversation, lands on **Home** with the one person they
   added: "Connect began understanding X," prompts to teach it more, an Ask line. Instantly legible:
   *this is where I understand my family.*
2. **Returning family member** — **Home**: the "what changed" feed + each person's snapshot. One
   glance answers "is everyone okay." Taps a person for depth.
3. **NRI checking parents** — opens **Home** (other timezone, mobile): Dad's snapshot + last update
   + what changed. Reassurance in seconds; region-correct throughout (Phase 7). Asks if worried.
4. **Booking a Guardian** — from Home or a person → **Care** → book → confirmation. The visit then
   *appears* in the person's Timeline and the Care list; its canonical detail is one page. ≤3 taps.
5. **Asking Connect** — the persistent Ask line (Home) or **Connect** nav → compose → Connect retrieves
   the Family Graph → answers from what it knows → offers to **act** (book) if needed. Understand →
   Answer → Act in one motion.
6. **Reviewing visit history** — a person → **Timeline** (their story) *or* **Care** → past visits;
   both reference the one canonical visit detail.
7. **Adding a family member** — global **Add someone (+)** from anywhere → quick capture → lands on
   the new person's Space. *(Already shipped as the uniform add flow — this journey is live and
   matches the target IA.)*
8. **Receiving a notification** — bell → tap → opens **inside the Workspace** at the canonical
   location (Phase 1 live; Phase 4 makes it the specific `/space/*`). Never dumped into `/family`.
9. **Emergency escalation** — **Emergency** is one tap from anywhere; a crisis phrase in **Connect**
   trips the deterministic safety floor → escalation card with the region-correct number + care-team
   alert. Reachable everywhere; safety never depends on where you are.

---

## Part 7 — Future-proofing (Personal, Business)

The frozen decision — *the canonical concept is the Workspace; `/space` is merely its first URL* —
is what makes this scale **without a nav redesign**.

Structurally, the IA is abstract over **subjects**: Home understands your subjects, Ask queries
them, Care/Act does things to them, Account administers. Today the subject is **a person you love**.
The grammar generalises:

| Context | Subjects | Home | Ask | Act |
|---|---|---|---|---|
| **Family** (today) | people you love | how is everyone | ask about them | send presence |
| **Personal** (future) | your own life domains | how am I | ask about my situation | do things for myself |
| **Business** (future) | entities you track | how is the business | ask about it | act on it |

Evolution: introduce a **Workspace switcher** and the URL grows `/space` → `/workspace/{family|
personal|business}` (a `308` from `/space`, because identity lives on the *concept*, not the
route). Each context reuses the same navigation grammar — Home / Ask / Act / Account — so nothing
is redesigned; a context is *added*. **Do not build now.** The seams (Workspace concept, subject
abstraction, person-as-subject spine) are already in place; that is the proof it scales.

---

## Part 8 — Self-challenge

**Alternatives considered**

- **A · Capability-tab IA** (7 flat tabs: Family, Connect, Visits, Timeline, Documents, Billing,
  Settings). *Rejected* — module/entity-oriented, reinforces "a collection of services" (the exact
  positioning we reject), and frequency-blind (Billing co-equal with Home). Its one virtue —
  everything visible — is a discoverability crutch, not an architecture.
- **B · Pure person-centric** (no global sections; everything inside a person). *Rejected* — the
  cross-cutting jobs (ask in general, account, add someone, "what changed across everyone") have no
  home. Too narrow.
- **C · Feed-first** (a single activity feed as Home). *Partially adopted* — great for "what
  changed," weak for "how is Dad specifically" and for acting. My Home is a **hybrid**: roster +
  what-changed feed + Ask.

**Weaknesses & trade-offs of the recommendation**

1. **Person-scoped discoverability** (sharpest trade-off) — Health, Memory and per-person visits
   live *inside* a person, so "show me all documents / all visits across the family" has no primary
   home. *Mitigation:* Care lists all visits; a **read-only family Memory aggregate** for documents.
   This reintroduces the Law-2/3 surfacing-vs-owning tension — which is exactly why the **ownership
   registry** is mandatory, not optional.
2. **Ask ↔ Home overlap** — Ask is both a Home line and primary nav; risk of feeling duplicated.
   *Mitigation:* Home's line is a *launcher* into the one canonical Ask surface (reference, not a
   second home).
3. **Care in primary nav vs "act only when needed"** — the closest call. Elevating Care to primary
   nav slightly re-tilts toward the "services" framing we downplay. I keep it because visit
   history/upcoming needs a standing home and a 2-item nav feels incomplete — but it is **reversible**:
   Care can demote to a Home/person action later without breaking the IA.
4. **Single-person families** — "everyone you love" + a people index is heavy for one elder.
   *Mitigation:* Home adapts — a one-person family drops more directly into that person's Space.
5. **Two timelines** — Home's "what changed" vs a person's "story." *Mitigation:* distinct scope and
   naming; they are different lenses, not duplicates.

**Why this is the strongest**

It is the only option that simultaneously: (a) **leads with understanding** — the positioning made
structural; (b) is **frequency-ordered**; (c) is **person-centric** — aligned to the moat; (d)
**passes the constitution** (with the registry and the Phase-3 auth fold); (e) **scales to Personal
and Business** through the subject abstraction with no redesign; and (f) keeps **primary nav to a
learnable three**. The capability-tab alternative is more immediately findable but structurally
wrong; the pure-person and feed-first options are too narrow. The one real cost —
person-scoped discoverability — is bounded by read-only aggregates policed by the ownership registry.
