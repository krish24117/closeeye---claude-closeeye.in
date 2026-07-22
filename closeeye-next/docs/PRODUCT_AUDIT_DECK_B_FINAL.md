# Product Audit — Deck B · Product Experience Review (Final)

**Date:** 2026-07-20 · **Product:** CloseEye Connect v1.0 (Release Candidate) · **Method:** two first-time
customer walkthroughs (FAT-1 exploratory, FAT-2 hardened), plus a full-surface read. Findings are evidence-based
and refinement-only — no new functionality proposed. Each finding carries an actionable recommendation.

## Executive read
Connect delivers a genuinely strong first experience: a family reaches a grounded first answer within a minute,
the product remembers them, and it is honest about what it knows. The experience's **strengths are trust and
clarity of promise**; its **weaknesses are consistency and density**, not concept. Nothing here is a blocker for
an invite-only beta; the items below are the difference between "strong beta" and "world-class."

---

## 1. UX audit (the core journey)
**Strong:** 2-step onboarding (name → first loved one) → land on the person's Space → guided first task →
first grounded answer. The consent moment reads as a trust promise, not a legal wall. Returning-home ("What
I'm noticing") is the best screen — warm, honest, one clear action.
**Findings:**
- **B1 · Competing first actions.** After adding a person, the guided task is immediately followed by "2 things
  need you", "What should happen next", and a "tell me ×4" grid — four overlapping asks. *Rec:* keep the single
  guided task first; reveal depth after the first success. (Partly addressed in Priority 2; verify on the
  established-person view.) *P1.*
- **B2 · The first answer is thin** until facts exist. Correct and honest, but underwhelming. *Rec:* have the
  first answer acknowledge the person by name/relationship (done) and offer to capture 2–3 facts inline so the
  next answer is visibly better. *P1.*
- **B3 · Two provisioning paths** (/auth onboarding vs /connect front-door) create subtly different first-runs.
  *Rec:* converge messaging so both land on the same guided first task. *P2.*

## 2. Interaction audit
- **B4 · Four "working" indicators** across the funnel (skeleton, `Loader2` spinner, `Sparkles` pulse, the seal
  ring). *Rec:* one loading vocabulary (the shimmer skeleton for pages; a single inline indicator for actions). *P1.*
- **B5 · Consent → answer transition** was a stale-closure bug (fixed) — a good reminder that state transitions
  around the gate need care. Now smooth. *Verified.*
- **B6 · Send affordance & keyboard.** Enter-to-send works; the composer is calm. *Rec:* add a subtle "thinking"
  affordance tied to the understanding beat so the wait feels intentional. *P2.*

## 3. Information architecture
- Dock (Home · People · Connect-orb · Activity · Profile) is clear and thumb-reachable. Connect as the central
  orb reads as the primary action. **Strong.**
- **B7 · "Add someone" landed on the generic home** (ignored `?member`) — *fixed* (now opens the new person). *Verified.*
- **B8 · Care tab** correctly hidden (`CARE_ENABLED`), but residual visit/Guardian copy remains behind the gate.
  *Rec:* ensure everything Care-framed is gated so a flag flip is clean. *P2.*

## 4. Design consistency
- **B9 · Two token vocabularies** (legacy `text-ink/muted/card` vs new `text-content/surface/edge`) in adjacent
  files. Same pixels, but reads as drift and blocks the colour migration. *Rec:* converge on the semantic tokens. *P2.*
- **B10 · Two type systems** (Connect's `.cx .h-serif` scale vs the app's `h1..caption`). *Rec:* the typography
  completion (Deck A P1) collapses these. *P1.*
- **B11 · Empty/error states** are re-implemented ad-hoc in several places rather than using `states.tsx`. *Rec:*
  adopt the canonical components everywhere. *P1.*

## 5. Trust review (the product's core dimension)
**Strong and deliberate:** provenance shown ("from your words" vs "my reading"), the understanding beat before
answering, "still learning" not "I forgot", consent as a promise, plain-language privacy, honest empty states.
**Findings:**
- **B12 · The four trust classes are ratified but not yet surfaced** in every answer (Article XII). Verified fact
  / inferred / general knowledge / professional advice aren't visually distinguished in the answer chrome yet.
  *Rec:* a lightweight, consistent trust-attribution treatment. *P1 (the highest-leverage trust lift).*
- **B13 · Care/presence promises leaking onto the global door** undercut trust ("we'll send someone" when Care
  isn't live). *Mostly fixed this pass; finish the P2 content items.*

## 6. Accessibility review
- Skip-to-content link present; semantic headings; focus-visible rings on key controls; the validation harness
  runs axe. **Good baseline.**
- **B14 · One serious colour-contrast issue on `/space` home** (flagged in the readiness audit). *Rec:* fix to
  WCAG AA. *P1.*
- **B15 · Consistency of focus states + reduced-motion.** *Rec:* audit focus-visible on all interactive elements;
  honour `prefers-reduced-motion` on the orb/ambient animations. *P2.*

## 7. Mobile experience
- Mobile-first and thumb-reachable (dock, orb, sheets). FAT walkthroughs were on an iPhone profile and read well.
- **B16 · Some density on the person Space** on small screens (B1). *Rec:* progressive disclosure on mobile. *P1.*
- **B17 · On-device smoke tests pending** (founder to run on real iPhone + Android) — especially the emergency
  path. *P0 (operational, founder action).*

## 8. Content quality
- Voice is warm, human, and — critically — honest. **Strong.**
- **B18 · Care/Hyderabad/launch-date leaks** — *mostly fixed this pass*; remaining P2 items in Deck A.
- **B19 · Duplicated copy** (hero, tagline, medical-decline authored twice). *Rec:* single-source. *P2.*
- **B20 · `how-it-works` is Care-visit framed** on the global door. *Rec:* rewrite to the Family-Intelligence
  experience. *P2.*

## 9. Navigation review
- Route architecture is clean (role → workspace; `/family/*` → `/space`; host-gated front doors). The deep-link
  guard (not-onboarded → onboarding) and add-someone routing are fixed. **Strong.**
- **B21 · Global footer** linked to Care/India pages — *fixed this pass* (now Family-Intelligence-safe).

## 10. Product heuristics (Nielsen, applied)
- *Visibility of system status:* the understanding beat + honest "still learning" — **excellent**.
- *Match to the real world:* speaks like family ("how has Amma been?") — **excellent**.
- *Consistency & standards:* the weakest — two token/type systems, ad-hoc states (B9–B11).
- *Error prevention/recovery:* warm error boundaries, retry, no data loss on failure — **good**.
- *Aesthetic & minimalist:* strong on the landing/returning-home; the person Space over-collects (B1).
- *Help & docs:* privacy/consent clear; no in-product help for a first-time family. *Rec:* a light first-run hint. *P3.*

---

## Priority summary
- **P0:** front-door crisis lane region-awareness (Deck A); on-device emergency smoke test (founder).
- **P1:** trust-class chrome (B12), typography completion (B10), state consistency (B4/B11), competing first
  actions (B1), colour contrast (B14), thin-first-answer (B2).
- **P2:** token unification (B9), content de-dup + `how-it-works` rewrite (B19/B20), Care gating completeness (B8).
- **P3:** first-run help hint; focus/reduced-motion polish.

**Bottom line:** the experience is trustworthy and clear — its identity (an AI that knows your family, honestly)
comes through. The work left is *consistency and finish*, not concept. None of it blocks the invite-only beta;
all of it raises the ceiling toward world-class (Deck C).
