# Final UI/UX Audit — CloseEye Connect (pre-Founder-Beta)

**Date:** 2026-07-20 · **Scope:** refinement + consistency only (no features, no redesign, RC stays frozen).
This documents what was **changed** in the polish pass and what is **recommended** (staged, so nothing
destabilises the frozen Release Candidate right before real families arrive). "Before/after screenshots" are
described as before → after copy/behaviour changes — the deltas are copy/positioning/gating, not layout.

## Principle applied
The single most important UX issue for a *global* Connect launch is **positioning leakage**: India-Care,
Hyderabad, and launch-date content appearing on the global Family-Intelligence door. Those are copy/config
fixes — high customer-facing value, low regression risk — so they were done now. Larger refactors (the full
typography migration, state-token unification) carry visual-regression risk on a frozen RC and are **staged as
prioritised recommendations**, to be done with the screenshot-regression harness, not blind before beta.

---

## A. Changes made (this pass)

| # | Surface | Before | After | Why |
|---|---|---|---|---|
| 1 | Global landing input (`experience.tsx`) | Sample: *"My mother lives alone **in Hyderabad**…"* | *"My mother lives alone and I worry about her…"* | City-specific on a global door |
| 2 | Global footer (`experience.tsx`) | *How it works · **visits open 15 August** · **How companions are verified** · **Ask a real person on WhatsApp*** | *How it works · Privacy · Terms* (companion-vetting shown only when `CARE_ENABLED`) | Launch-date + Care + India-human CTAs leaked globally |
| 3 | Medical lane, front door (`experience.tsx`) | *"…bring a trusted person to see them **in person**"* + WhatsApp CTA | *"…remember what matters and help you think it through, so you walk into that conversation prepared"* (WhatsApp CTA gated behind `CARE_ENABLED`) | Care/visit promise + India CTA on the global door |
| 4 | Ask lane, front door (`experience.tsx`) | *"Talk to a real person on WhatsApp →"* (always) | Gated behind `CARE_ENABLED` | India-human CTA on the global door |
| 5 | Connect metadata (`(connect)/layout.tsx`) | Title *"— **Your Trusted Presence**"*; description *"…**trusted local people step in to help**"* | Title *"— The intelligence that knows the people you love"*; description *"…remembers what matters, privately, for years"* | Presence/Care framing → Family-Intelligence voice (title + OG + Twitter) |
| 6 | Design-system page (`design-system/page.tsx`) | Typography note: *"One family (**Open Sauce One**)"* | *"Inter for text, a serif for display. Semantic roles — meaning, not size."* | Publicly wrong (app ships Inter/Manrope; Constitution ratified Inter) |
| 7 | Signed-in Connect medical reply (`understanding-conversation.tsx`) | *"…bring a trusted person to check in, and reach someone now for anything urgent"* | *"…remember what matters and help you prepare for that conversation"* | Care/presence promise on global signed-in Connect |
| 8 | Signed-in Connect pending reply | *"…your **care team** will follow up…"* | *"I couldn't compose an answer just now. Please try again in a moment."* | Care-team leak |
| 9 | Activity empty state (`space/activity/page.tsx`) | *"…as Close Eye learns about your family and **visits happen**…"* | *"…as Close Eye learns about your family, everything worth noticing shows up here."* | Assumes Care visits |

**Verified:** `tsc` clean. All changes are copy/gating; no layout or logic change. Care-specific content is now
gated behind `CARE_ENABLED` (the same pattern already used correctly for the Care lane), so it returns
automatically when Care launches — nothing is deleted, only correctly scoped.

---

## B. Recommendations (staged, prioritised)

### P0 — before public launch (safe for beta as-is)
- **Front-door crisis lane still shows an India WhatsApp CTA** (`experience.tsx` escalate lane, "Reach a real
  person now →"). Deliberately **not touched** in this copy pass (safety-critical). A signed-out crisis should
  route to **local emergency services**, not a fixed India number. Needs a careful, region-aware fix with the
  medical team — *the one item here I'd treat as a true pre-public-launch blocker.*

### P1 — typography completion (the deferred serif work)
Do this as its own pass **with screenshot regression**, not blind on a frozen RC. Exact steps (from the audit):
1. Load the ratified serif Display face app-wide in `app/layout.tsx` (today it's scoped only to `.cx` on
   Connect; elsewhere `--font-display` falls back to Georgia). **Retire Manrope** in favour of Inter (the
   ratified text face; Manrope is Constitution-deprecated).
2. Map the six role tokens (`--type-display/title/heading/body/caption/overline`, `--font-display/-text`) into
   `tailwind.config.ts` (`fontFamily` + `fontSize`); retire the legacy `h1..caption` scale.
3. Establish the **Display tier** (≤1 per page — hero, first-run) so headlines aren't all `text-h2`; distinguish
   Title vs Heading.
4. Adopt the reading-rhythm + `--space-*` tokens (currently defined, unconsumed).
5. Collapse the two parallel type systems (`.cx` `.h-serif` + the Tailwind scale) onto the six tokens.
*Impact: the single biggest visual-quality lift; risk: touches every screen → must be regression-gated.*

### P1 — state consistency
- Adopt the canonical `components/ui/states.tsx` (`EmptyState`/`ErrorState`) and `page-skeleton.tsx` everywhere;
  replace the ad-hoc empty/error cards in `space/page.tsx`, `care/page.tsx`, `activity`, `memories`,
  `understanding-conversation`.
- Add `loading.tsx` for the `(workspace)` and `(connect)` route groups (they currently fall back to ad-hoc
  inline text); unify on the shimmer skeleton (no bare "Loading…").
- Dedupe the two near-identical error boundaries (`(connect)/error.tsx` vs `(workspace)/error.tsx`).
- Unify one loading indicator vocabulary (today: skeleton, spinner, pulse, ring — four).

### P2 — token unification
- Two token vocabularies coexist (`text-ink`/`text-muted`/`bg-card` legacy vs `text-content`/`surface-*`/`edge`
  new). Same pixels today, but it blocks the Ch.2 colour migration. Converge Connect/space surfaces on the new
  semantic tokens.

### P2 — content de-duplication
- Hero promise + "Your Trusted Presence" footnote are each authored twice (`experience.tsx`); the medical-decline
  copy is authored twice (`experience.tsx` vs `understanding-conversation.tsx`) — single-source them.
- The `how-it-works` and `how-companions-are-verified` pages are Care-visit framed on the global door — rewrite
  `how-it-works` to the Family-Intelligence experience, and region-gate `how-companions-are-verified`.

### P3 — housekeeping
- `space/people/[id]/health` visit-photo copy (already `CARE_ENABLED`-gated) and stray Guardian/visit comments.
- Confirm `components/marketing/founding-counter.tsx` (Hyderabad) never mounts on Connect.

---

### Summary
The **positioning leaks a global family would actually notice are fixed** (Care/Hyderabad/launch-date off the
Connect door, Family-Intelligence voice in metadata). The larger, higher-risk refactors — **typography
completion** and **state unification** — are specified precisely and staged so they can be executed *after* the
beta learning phase (or in a dedicated regression-gated pass), consistent with keeping the RC stable for the
first families. See `PRODUCT_AUDIT_DECK_B_FINAL.md` (experience review) and `PRODUCT_AUDIT_DECK_C_FINAL.md`
(world-class benchmark) for the full findings behind these recommendations.
