# CloseEye Design System Constitution

*Ratified 2026-07-19. Design law for every CloseEye product surface. Subordinate to the founder's
word and to [CONSTITUTION.md](../../CONSTITUTION.md) (product law); it governs how the product is
**built visually**. Where it conflicts with the earlier Design Authority's font/typography
provisions, **this document supersedes them** (Manrope is deprecated — see Chapter 1).*

This Constitution is organised into chapters. Each chapter is design law for one system. A chapter
is ratified only by the founder; amendments are deliberate constitutional acts, never silent edits.

| Chapter | System | Status |
|---|---|---|
| **1** | **Typography** | **Ratified 2026-07-19** |
| **2** | **Color** | **Ratified 2026-07-19** |
| 3 | Spacing & Layout | Drafting |
| 4 | Motion | Reserved |
| 5 | Icons | Reserved |
| 6 | Components | Reserved |
| 7 | Accessibility | Reserved |
| 8 | Navigation | Reserved (see [ownership_registry.md](./ownership_registry.md) + navigation_constitution.md) |

Reserved chapters carry no law yet; they mark where future systems will be governed with the same
rigor already applied to product architecture.

---

# Chapter 1 — Typography

## Objective

The objective of the Typography Constitution is **not to standardize the existing typography, but
to simplify it into a timeless semantic system** that can remain stable for the next 5–10 years and
serve every future CloseEye product, in every language.

The system is deliberately **small**. Fewer roles, applied consistently, communicate hierarchy more
clearly than many roles applied loosely.

## The Laws

1. **Hierarchy, never decoration.** Typography communicates importance and order. A style that
   exists only to look nice does not ship.
2. **One canonical token per element.** Every text element maps to exactly one token. Sizes are
   never invented inline.
3. **Only two families.** One editorial Display serif and one global Interface sans. Nothing else
   is loaded or referenced.
4. **Whitespace is typography.** Vertical rhythm is protected. Spacing comes from the scale, never
   a guessed value.
5. **Consistency outranks creativity.** A new style requires constitutional approval — never a
   one-off in a component.
6. **Calm before beautiful.** Every screen should feel calm before it feels beautiful.
7. **Reduce cognitive load.** Typography lowers the effort to read; it never adds friction for
   effect.
8. **Prefer fewer styles.** If two tokens communicate the same importance, one is removed.
9. **Global readability first.** The system is designed for every script, not English. No language
   is an afterthought.
10. **Typography is a trust signal.** A calm, consistent interface creates confidence; inconsistency
    reads as risk.
11. **Semantic Ownership.** Every token must answer one question: *what meaning does this
    communicate?* If the answer is only a pixel size or a visual preference, the token must not
    exist.

**Governing principle, above all laws:** **Typography tokens represent meaning, not size.** A
different pixel size is not a new token. Only a new *meaning* earns one.

## Ratification 1 — The Six Semantic Roles (RATIFIED)

CloseEye typography consists of **six semantic roles only**. Each is a meaning, not a size. Each
**owns** its font family, weight, line-height and letter-spacing. **No additional role may be
introduced without constitutional approval** (Law 5).

| Token | Meaning (the role it plays) | Family |
|---|---|---|
| **Display** | A singular emotional statement. At most one per page; hero and first-run only. | Display serif |
| **Title** | "Where you are" — the screen's identity. Exactly one per screen. | Display serif |
| **Heading** | A section, or the name of a thing (a card, a list row, a person). | Display serif |
| **Body** | All reading text. *Secondary text is Body in a muted colour — never a smaller size.* | Interface sans |
| **Caption** | Supporting metadata: timestamps, hints, helper text. | Interface sans |
| **Overline** | The category kicker / eyebrow. Uppercase, sits above a Title or Heading. | Interface sans |

**Roles deliberately removed** (and not missed): *Lead* (a lead is Body; emphasis is spacing) ·
*Body-sm / "secondary"* (secondary is a colour, not a size) · *H4-as-separate* and the five
card-title variants (all fold into Heading) · any *Micro / label floor* (too small to carry
meaning — re-homes to Caption or Overline, or is removed).

## Ratification 2 — Font Families (PARTIALLY RATIFIED)

The constitutional rule is: **one editorial Display serif + one global Interface sans.** Referenced
only through role tokens, never by hard-coded family name in components.

| Role token | Purpose | Ratification |
|---|---|---|
| `--font-text` | The global **Interface sans** — all Body, Caption, Overline; interface chrome. | **Inter — RATIFIED.** |
| `--font-display` | The editorial **Display serif** — Display, Title, Heading. | **PROVISIONAL.** |

**The Display serif is provisional.** The current candidate is **Newsreader**, but the Constitution
**must not be hard-coded to Newsreader** until a final brand review confirms all of:

- long-term brand suitability,
- rendering quality across devices,
- licensing,
- multilingual behaviour,
- accessibility,
- marketing consistency.

Until that review completes, all surfaces reference `--font-display` (the *role*), so the final
serif can be set in exactly one place. **Manrope is deprecated** and leaves the system.

## The Token Definitions

Working definitions, finalised in Phase 1 (Design Tokens). One `rem` scale for **every** surface,
so the system honours OS Dynamic Type and browser zoom. Each token owns its parts; components apply
the token, never the parts. Sizes are mathematically anchored on a 16px base.

| Token | Size (rem) | Line-height (Latin) | Letter-spacing (Latin) | Weight | Family |
|---|---|---|---|---|---|
| Display | `clamp(2.5, 5.6vw, 4)` | 1.05 | −0.02em | 500 | `--font-display` |
| Title | `clamp(1.75, 3.4vw, 2.25)` | 1.10 | −0.02em | 500 | `--font-display` |
| Heading | `1.25` | 1.30 | −0.01em | 500 | `--font-display` |
| Body | `1.0625` | 1.60 | 0 | 400 | `--font-text` |
| Caption | `0.8125` | 1.50 | 0 | 500 | `--font-text` |
| Overline | `0.8125` | 1.40 | +0.12em · UPPERCASE | 700 | `--font-text` |

Letter-spacing and line-height values above are the **Latin** baseline; per-script adjustments are
mandatory (see Global Typography). The legible floor is Caption (0.8125rem); nothing ships smaller.

## Typography Ownership Matrix

Every token must justify its existence — a distinct role, an owner, a usage rule, and canonical
components. If it cannot, it is removed (Law 8 + Law 11).

| Token | Semantic role | Owner | Usage rule | Canonical components |
|---|---|---|---|---|
| Display | A singular emotional statement | Brand / Marketing | ≤ 1 per page; hero & first-run only | Marketing hero, Connect first-run |
| Title | "Where you are" — screen identity | Each surface | Exactly 1 per screen | Greeting, PageHeader, page H1 |
| Heading | A section, or the name of a thing | Shared | Section titles & card/tile names | SectionTitle, card headers, list rows |
| Body | Reading text (secondary = + muted) | Shared | All paragraphs & descriptions | everywhere |
| Caption | Supporting metadata | Shared | Timestamps, hints, helper text | captions, form hints, meta rows |
| Overline | A category kicker / eyebrow | Shared | Uppercase; above a Title/Heading | eyebrows, section kickers |

## Weight Discipline

A token owns its size, weight, line-height and letter-spacing. **Components must not override
them.** A `font-medium` / `font-bold` next to a type token is an architectural defect, not a style.

The only legal exception is a **constitutionally-approved emphasis variant**, added by amendment —
never inline. (The audit found 829 weight overrides across 189 files; these are removed, not
accommodated.)

## Global Typography

The system is **language-neutral**. **No typography rule may assume English.**

| Concern | Rule |
|---|---|
| **Primary stack** | `--font-display` (editorial serif, provisional) + `--font-text` (Inter). Covers Latin, including German & French (Latin-extended). |
| **Fallback stack (per script)** | Arabic → `Noto Naskh Arabic`. Japanese → `Noto Sans JP`. Korean → `Noto Sans KR`. Hindi → `Noto Sans/Serif Devanagari`. Telugu → `Noto Sans/Serif Telugu`. Loaded per-locale and subset — never all at once. |
| **The serif truth** | An editorial serif exists only for Latin. For non-Latin locales, Display/Title/Heading fall back to the script's Noto **serif** where it exists, else its Noto **sans**. The "serif voice" is Latin-only, and that is stated, never faked. |
| **RTL (Arabic)** | `dir` is set from the locale on `<html>`. Logical properties only (`margin-inline`, `padding-inline`, `text-align: start`, `inset-inline`); physical `left/right` is deprecated. Layout mirrors. |
| **CJK (Japanese / Korean)** | No letter-spacing. No italics (CJK has none — disable). No all-caps (meaningless). Line-height 1.6–1.8. |
| **Indic (Hindi / Telugu)** | Body line-height ≥ 1.5 (matras & conjuncts need vertical room). No tight or negative tracking. Noto for correct conjunct shaping. |
| **Dynamic Type / zoom** | The whole scale is `rem`; it respects OS text size and browser zoom, and must hold legible at 200%. `-webkit-text-size-adjust: 100%` is removed. |
| **Letter-spacing** | Latin-only. Reset to `normal` under `:lang(ar, ja, ko, zh, hi, te)`. Body is never tracked, in any script. |
| **Accessibility** | Legible floor ≈ Caption (0.8125rem). Contrast AA — Body ≥ 4.5:1 (the muted greys must pass), large text ≥ 3:1. Reduced-motion honoured. |

## Enforcement

**Typography is treated exactly like navigation architecture. Violations are architectural defects**
— linted and reported in CI, on the model of the existing nav-regression guardrail
([lib/workspace/nav.test.ts](../lib/workspace/nav.ts)).

The following are defects, not preferences:

- **Arbitrary font sizes** — any `text-[…]`, inline `fontSize`, or hardcoded CSS `font-size` outside the six tokens.
- **Arbitrary weights** — any `font-*` weight utility applied on top of a type token.
- **Component-level typography overrides** — a component changing a token's size/weight/line-height/letter-spacing.
- **Duplicate semantic roles** — two tokens communicating the same importance.
- **New typography tokens without approval** — any seventh role, or any new size, added without a constitutional amendment.

## Governance — Migration Phases

After this chapter is merged, implementation proceeds in phases. **No visual redesign is permitted
during migration; the objective is architectural convergence, not aesthetic change.** No visuals
change until each phase is approved by the founder.

1. **Design Tokens** — author the six tokens + the global foundation (`--font-display` / `--font-text`, per-script stacks, `dir`, `:lang()` resets). Nothing consumes them yet.
2. **Lint Rules** — the CI guardrail that reports the defects above.
3. **Component Migration** — move surfaces onto the six tokens; delete the px scales, the micro-labels, the weight overrides; collapse the redundant roles.
4. **Legacy Cleanup** — remove Manrope, the `.cx`/`.wsp` parallel type systems, `-webkit-text-size-adjust`, and the stale "Open Sauce One" documentation.
5. **Visual QA** — confirm convergence preserved the intended appearance (no unintended redesign).
6. **Accessibility QA** — Dynamic Type at 200%, contrast AA, per-script line-heights, RTL/CJK/Indic behaviour, reduced motion.

## Deprecation

Removed from the system by this chapter:

- **Manrope** (font family) → the two-family rule (`--font-display` + Inter).
- **The `.cx` px type scale** (`--t-hero … --t-micro`, ~10 roles + ~126 literals) → the six rem tokens.
- **The `.wsp` px additions** (10px labels, 17px input) → tokens (floor: Caption).
- **Lead, Body-sm, H4-as-separate, the micro/label floor** — four roles folded into Body / Heading / Caption.
- **The `text-[0.6rem]/[0.65rem]/[0.7rem]` micro-label pattern** (54 uses) → Caption / Overline, or removed.
- **The `.eyebrow` class + the duplicated utility string** → one Overline.
- **829 weight overrides** → deleted; tokens own weight.
- **Physical direction properties** (`ml-`/`pl-`/`text-left`, CSS `left/right`) → logical.
- **Inline `fontSize` styles** and **`-webkit-text-size-adjust: 100%`** → removed.
- **The "Open Sauce One" claim** in the design-system page → corrected to the ratified system.

## Amendment Procedure

A new semantic role, a new token, or a change of the Display serif or Interface sans is a
**constitutional amendment** — a deliberate act requiring the founder's approval, versioned with the
code, exactly as adding a Navigation Owner is. The burden for any new role is a distinct **meaning**,
never a size.

---

*Chapter 1 ratified 2026-07-19. Companion review (evidence-backed audit, the six-token reduction,
ownership matrix, the "what would Apple delete" analysis): the Typography Constitution artifact.*

---

# Chapter 2 — Color

## Objective

Color is not a palette; it is a set of **meanings**. The objective is not to standardize three
parallel palettes into one large one, but to **reduce** them to the fewest roles that carry meaning,
and to make **contrast a law rather than a hope**. Governing principle: **color tokens represent
meaning, not hue.** A token is *danger*, not *red*; *surface-inverse*, not *white*; *text-secondary*,
not *grey-500*. A new hex is never a new token — only a new meaning earns one.

## The Laws

1. **Meaning, not hue.** Tokens name a role, never a colour.
2. **One token per role.** No raw hex, no default palette (`white`/`black`/`gray-*`), no numbered
   palette, no references to undefined tokens.
3. **Contrast is law.** Every colour used for text or an interactive affordance meets WCAG AA
   (≥ 4.5:1 body, ≥ 3:1 large). A colour that fails is **decoration** and may never carry text.
4. **State is never colour alone.** Success / warning / danger always carry an icon and words too —
   for colour-blind users and because hue meaning differs across cultures.
5. **Prefer fewer.** If two tokens communicate the same meaning, one is removed.
6. **Theme-ready by role.** A theme remaps role→value and adds zero tokens.

## Ratification 1 — The Semantic Role Set (RATIFIED)

Color consists of semantic **roles**, not colours. The `.cx` private palette and the `.wsp` re-skin
collapse into this one set. **No role may be added without a distinct meaning** (constitutional
amendment). Values below are the current light-mode resolutions (HSL channels); a theme may remap
them.

| Group | Tokens | Meaning |
|---|---|---|
| **Surface** | `surface` · `surface-raised` · `surface-inverse` · `surface-accent` | Where content sits (page · card · dark panel · soft wash) |
| **Content** | `text` · `text-secondary` · `text-inverse` · `text-disabled` | Reading content by emphasis; all AA except `disabled` |
| **Brand** | `brand` · `brand-hover` · `accent` | Identity & action (`brand` AA as text; `accent` is decoration, never text) |
| **Border** | `border` | Separation — hairlines & dividers |
| **State** | `success` · `warning` · `danger` (each + `-surface`) | System feedback; AA-safe; always with icon + words |
| **Decoration** | `decor-*` (enumerated) | Dots, charts, marks — **may never carry text** |

**Collapsed by this ratification:** six greys → one `text-secondary`; three unlinked reds → one
`danger`; four borders → one `border`; the many greens → `brand` + `accent` + `success` by meaning;
the 88 raw `#fff` → the `surface-inverse` / `text-inverse` pair. **Zero new colours added.**

## Ratification 2 — Theme Governance (RATIFIED, as amended)

The system is **architected for multiple themes through the semantic role tokens** — a theme is a
remap of role→value that adds no tokens. **At launch, Light Mode is the only supported theme.** A
dark or high-contrast theme is a **reserved future amendment**; it lands as an override block that
redefines only the role tokens, under `:root[data-theme="…"]` / `prefers-color-scheme`. Components
therefore consume **only role tokens, never a raw value** — that is what makes theming a remap.

## Contrast — Constitutional, not advisory

Every content, text, brand and state token meets **WCAG AA** on its intended surface. A colour that
fails AA is **decoration**, enumerated as `decor-*`, and **forbidden as text at the lint layer**.
This removes, by rule, the two known violations (emerald 2.76:1 and faint 2.40:1 used as links /
quiet text) and any future one. State colours are AA-safe shades (the old warning `#BB8A2E` and the
raw dial reds are darkened to pass).

## Typography-parallel: Ownership, Enforcement, Governance

**Ownership Matrix** — every colour token justifies a distinct meaning, an owner and a usage rule
(surfaces are shared; brand is Brand-owned; decoration and state are shared but rule-bound). A token
that cannot name a meaning is removed.

**Enforcement (typography-parallel — violations are architectural defects, CI-linted):**
- **Raw hex** anywhere outside the token definitions.
- **Default-palette utilities** — `text-white` / `bg-white` / `text-black` / `bg-gray-*` (all bypass the tokens).
- **Numbered Tailwind palette** — `green-600`, `slate-*`, etc.
- **Undefined-token references** — e.g. the `var(--alarm)` bug that renders an invisible error state.
- **Text on a decoration or fail-AA colour.**
- **Duplicate roles**, or a **new token without a constitutional amendment.**

**Global:** colour is never the only signal (state = colour + icon + words); contrast holds in every
theme; brand green is one meaning expressed as three roles, not eight hues.

**Governance — migration phases** (identical model; founder-gated; architectural convergence, not
aesthetic change; no consumer migrates until the foundation is in place):
1. **Design Tokens** — the semantic colour roles as custom properties (`styles/design-tokens.css`),
   consumed by nothing. *(Phase 1 — shipped 2026-07-19.)*
2. **Lint Rules** — the CI guardrail reporting the defects above.
3. **Component Migration** — surfaces move onto the roles; delete the whites, the `.cx` palette, the
   duplicate greys / reds / borders.
4. **Legacy Cleanup** — remove the parallel palettes and the `--body`/`--ink` and dial-red duplicates.
5. **Visual QA** — confirm convergence introduced no unintended recolour.
6. **Accessibility QA** — AA per theme, colour-blind safety (never colour alone).

## Deprecation

- The **`.cx` private palette** (`--paper`, `--forest`, `--emerald`, `--sprout`, `--pencil`,
  `--faint`, `--hair`/`--hair2`, `--text-accent/secondary/muted`) → the semantic roles.
- **88 `text-white` / `bg-white`** → `surface-inverse` / `text-inverse`.
- **33 component hex + ~30 scoped-CSS literals** → tokens.
- **Six greys, three reds, four borders, the many greens** → collapsed by meaning.
- **`#0E2A1F` under two names** (`--ink` / `.cx --forest`) and **`--body` vs `--ink`** → one `text`.
- **`var(--alarm)`** (undefined) → `danger`.
- **`emerald` / `faint` used as text** → demoted to decoration; lint forbids text on them.

## Amendment Procedure

A new colour role, or the addition of a second theme (dark / high-contrast), is a **constitutional
amendment** requiring the founder's approval, versioned with the code. The burden for any new role
is a distinct **meaning**, never a hue.

---

*Chapter 2 ratified 2026-07-19 (theme governance amended: multi-theme architecture, Light Mode only
at launch). Companion review: the Color Constitution artifact.*
