# Close Eye — Design System

The single source of truth for tokens. Live, rendered reference: **`/design-system`**.
Tokens live in **`styles/globals.css`**; the Tailwind mapping in **`tailwind.config.ts`**.

## Principles

1. **Trust before technology.** Every screen answers: *"Would I trust these people with my own parents?"*
2. **One product.** Alternating section tones, one type scale, one component set — hide the logo and it's still Close Eye.
3. **Few tokens, used consistently.** The constraint is the point. No ad-hoc values.
4. **Layout variety, not card soup.** Full-width, split, timeline, quote and image sections carry rhythm; cards are used sparingly.

## Tokens at a glance

- **Colour** — 15 semantic roles from one green family. See [Colour-System](./Colour-System.md). No gradients (logo excepted), no neon.
- **Type** — Manrope, steps `h1 · h2 · h3 · h4 · lead · body · body-sm · caption` + `.eyebrow`. See [Typography](./Typography.md).
- **Spacing** — 8-point grid: `4, 8, 12, 16, 24, 32, 40, 56, 80, 120`. Sections use `.section-pad`. Content column caps at **1280px** (`max-w-content`).
- **Radius** — `sm 12 · md 20 · lg 28 · xl 32`. Buttons/inputs use `sm` (12); cards use `md`/`lg`.
- **Shadow** — one soft family: `sm · md · lg`. Never heavy.
- **Motion** — ease `--ease` `cubic-bezier(.22,1,.36,1)`, 200/250/600ms, ≤24px travel, reduced-motion safe. See [Motion](./Motion.md).
- **Grid** — 12 (desktop) / 8 (tablet) / 4 (mobile).

## How to extend

Never introduce a new colour, font, spacing value, button, card, or shadow in a
screen. Add it to the system here first (and to `/design-system`), or reuse what
exists. New composite components are documented in [Component-Library](./Component-Library.md).

## Multi-step & in-visit flows

Long flows (Booking, the Guardian visit journey) follow one pattern: a `useReducer` +
Context store with **localStorage auto-save** (offline-safe), a calm `Progress`
indicator, one primary action per screen, and reassuring microcopy (never *Submit /
Upload / Save*). Reuse `Progress`, `ChecklistItem`, `ObservationCard`, `VitalInput`
before building new step UI. The Guardian App is documented in
[Guardian-App](./Guardian-App.md); structured observation capture (no scores) lives in
`lib/cloza.ts`.

## Progressive enhancement across modules

Guardian outputs surface in Family Space by **enhancing existing screens in place** —
never a second dashboard. A screen reads the shared report (`lib/visit-reports.ts`); if
present it renders the rich experience, else it keeps its current content. Health
readings use **status + a subtle sparkline**, never clinical charts; wellness is shown
as **Improving / Stable / Needs attention**, never raw numbers (family-only, per CLOza).
See [Family-Space](./Family-Space.md).

## Personas share one system

Three personas, one design language — hide the logo and it's still Close Eye. Each gets
a shell tuned to its context, all from the same tokens/components:
- **Family Space** (`/family`) — mobile-first, reassurance-first (bottom nav + sidebar).
- **Guardian App** (`/guardian`) — mobile-first, one-handed field app (console header + bottom nav).
- **Presence Console** (`/pm`) — **desktop-first** operations (left sidebar + topbar).

The console reuses the Family Space experience components verbatim (`AIStoryCard`,
`PhotoGallery`, `VoicePlayer`, `HealthSnapshot`, …) and semantic colours for
relationship health (success / warning / error) — no new tokens. See
[Presence-Manager](./Presence-Manager.md).
