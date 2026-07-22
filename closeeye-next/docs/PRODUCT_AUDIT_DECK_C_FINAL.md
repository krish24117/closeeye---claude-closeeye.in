# Product Audit — Deck C · World-Class Product Benchmark (Final)

**Date:** 2026-07-20 · **Product:** CloseEye Connect v1.0 (RC). Benchmarked against the standard set by
**Apple, Airbnb, Notion, Linear, Stripe**. Honest, refinement-only. Each dimension: **current state → gap →
recommendation → priority (P0 critical · P1 high · P2 medium · P3 low)**. Scores are directional (0–10) against a
world-class 10.

| Dimension | Score | Headline gap |
|---|:--:|---|
| Visual quality | 7 | Two type/token systems; no Display tier |
| Interaction quality | 7 | Four loading vocabularies; motion under-used |
| Product clarity | 8 | Strong promise; some Care/positioning drift (mostly fixed) |
| Trust | 8 | Best dimension; four-class chrome not yet visible |
| Emotional design | 8 | Warm and human; a few transactional edges remain |
| Typography | 6 | Serif still provisional/scoped; Manrope not retired |
| Motion | 5 | Minimal, inconsistent; no orchestrated moments |
| Information density | 7 | Person Space over-collects on mobile |
| Accessibility | 7 | Good baseline; one serious contrast issue |
| Performance | 7 | Fast; one unbounded query; no perf budget |
| Global readiness | 7 | Positioning leaks fixed; i18n/region depth pending |

---

### 1 · Visual quality — 7
**Current:** a coherent, calm forest/ivory brand; the landing and returning-home read premium. **Gap vs Linear/
Stripe:** two token vocabularies and two type scales coexist, and there's no Display tier — every headline is the
same size, so the visual hierarchy is flatter than a world-class product. **Rec:** complete the typography
(Display/Title/Heading tiers) and converge tokens. **P1.**

### 2 · Interaction quality — 7
**Current:** calm composer, Enter-to-send, warm error recovery, no data loss on failure. **Gap vs Notion/Linear:**
four different "working" indicators; transitions are functional, not delightful; no keyboard-power affordances.
**Rec:** one loading vocabulary; considered micro-interactions on the highest-traffic actions (ask → understand →
answer). **P1.**

### 3 · Product clarity — 8
**Current:** the promise is unusually clear — "the intelligence that knows the people you love", demonstrated
within a minute. **Gap vs Stripe (clarity of what-it-does):** residual Care/visit framing on the global door
blurred "what is this?" — *mostly fixed this pass.* **Rec:** finish the `how-it-works` rewrite + content de-dup. **P2.**

### 4 · Trust — 8 (the standout)
**Current:** provenance shown, understanding-before-answering, "still learning" honesty, consent as a promise,
plain-language privacy, verified emergency delivery. This is genuinely ahead of most consumer AI. **Gap vs the
bar it sets itself (Article XII):** the four epistemic classes (verified fact / inference / general / professional)
aren't yet visible in every answer. **Rec:** a consistent, lightweight trust-attribution chrome — the single
highest-leverage lift in this deck. **P1.**

### 5 · Emotional design — 8
**Current:** warm, human, calm-first; "for Amma", the returning-home noticing, the consent trust-promise —
Airbnb-grade warmth in places. **Gap:** a few transactional edges remain (bare "Loading…", some Care residue,
the thin first answer feeling empty). **Rec:** warm every state (Deck B B11) and make the first answer feel like
the start of a relationship. **P1/P2.**

### 6 · Typography — 6 (lowest)
**Current:** Inter + Manrope (sans) app-wide; a serif renders only via a scoped `.cx` class on Connect, falling
back to Georgia elsewhere; the six semantic role tokens exist but are consumed by nothing. **Gap vs Apple/Airbnb
(type as identity):** no real editorial serif app-wide, no Display hierarchy, Manrope not retired, two scales.
**Rec:** the staged typography completion (Deck A P1) — load the ratified serif app-wide, retire Manrope, map the
role tokens, establish the Display tier. *Do it regression-gated, not on the frozen RC blind.* **P1.**

### 7 · Motion — 5
**Current:** minimal — a few spins/pulses and the orb; motion tokens defined but unconsumed. **Gap vs Linear/
Stripe (motion as feedback + polish):** no orchestrated page-load or reveal, no consistent easing, no motion
language. **Rec:** adopt the motion tokens; one orchestrated moment (the understanding beat → answer) and
consistent easing; honour `prefers-reduced-motion`. **P2.**

### 8 · Information density — 7
**Current:** the landing and home breathe well. **Gap vs Notion (density done right):** the person Space
over-collects (four competing asks) on mobile. **Rec:** progressive disclosure — one action first, depth after
first success. **P1.**

### 9 · Accessibility — 7
**Current:** skip link, semantic headings, focus-visible on key controls, axe in CI. **Gap vs Apple (a11y as
default):** one serious contrast issue on `/space`; inconsistent focus states; reduced-motion not fully honoured.
**Rec:** fix the contrast (AA), audit focus-visible everywhere, honour reduced-motion. **P1 (contrast) / P2 (rest).**

### 10 · Performance — 7
**Current:** fast (Haiku answers, bounded design, small bundle; Sentry/PostHog lazy-loaded with zero dormant
cost). **Gap vs Stripe/Linear (perf as a feature):** one unbounded ledger query; no performance budget or
Lighthouse gate (LHCI is advisory); no answer caching. **Rec:** bound the query, make a perf budget, promote
Lighthouse to a tracked (not blocking) metric. **P2.**

### 11 · Global readiness — 7
**Current:** two front doors on one platform; region/currency/locale layer exists; positioning leaks (Hyderabad/
Care/launch-date) fixed this pass; metadata now Family-Intelligence. **Gap vs Airbnb/Stripe (true global):** no
UI i18n yet; the front-door crisis lane isn't region-aware (P0, Deck B); region depth (residency, local emergency
numbers surfaced) is architected but not fully wired. **Rec:** region-aware crisis routing (P0); stage i18n +
residency for post-beta. **P0 (crisis) / P2 (i18n).**

---

## What "10/10" looks like (the target)
- **Apple:** typography and a11y are invisible and perfect; every state is designed.
- **Airbnb:** emotional warmth is systematic, not incidental.
- **Notion:** density is masterful — a lot of capability, calm to use.
- **Linear:** interaction + motion feel engineered; nothing is ad-hoc.
- **Stripe:** clarity and performance are a feature; trust is total.

CloseEye already meets that bar on **trust and clarity of promise** — its hardest, most defensible dimensions.
The distance to world-class is concentrated in **finish**: typography, motion, state consistency, and surfacing
the trust model it already has. None of it changes the product; all of it raises the ceiling.

## Consolidated priority
- **P0:** region-aware crisis routing on the front door; on-device emergency smoke test.
- **P1:** trust-class chrome · typography completion · state/interaction consistency · person-Space density ·
  colour contrast.
- **P2:** motion language · token unification · content de-dup + `how-it-works` · performance budget.
- **P3:** first-run help · reduced-motion + focus polish.

*Sequencing note:* the P1 items are best done in a dedicated, screenshot-regression-gated polish pass — ideally
informed by the Founder Beta (what real families notice first), so effort lands where it changes the experience,
not where it merely satisfies a checklist.
