# Branding Consistency Audit (Module 7.5 · §21)

A whole-app audit that the UI is one Close Eye — same tokens, everywhere. Result:
**pass, no fixes required.** The app was built token-first from the start, so there is
no drift to correct.

## Automated checks (against `app/` + `components/`)

| Check | Rule | Result |
|---|---|---|
| **Colours** | No raw hex used for styling | ✅ 0 — the only 13 hex are the design-system swatch docs + the platform-required `theme-color` (`layout.tsx`) and PWA `manifest.ts` |
| **Arbitrary colours** | No `text-[#…]` / `bg-[#…]` / `border-[#…]` | ✅ 0 |
| **Radius** | Only `rounded-sm/md/lg/xl/full` (12/20/28/32) | ✅ 0 off-token (`rounded-2xl`/`3xl`) |
| **Shadows** | Only `shadow-sm/md/lg` | ✅ 0 heavy/arbitrary (`shadow-xl`/`2xl`/`shadow-[…]`) |

## Standardised primitives (used everywhere)

- **Typography** — one scale (`text-h1…caption`, `.eyebrow`), Manrope + Inter via `next/font`.
- **Spacing** — the 8-pt grid; `section-pad`, `max-w-content` for marketing.
- **Buttons** — the only four: `primary / secondary / ghost / text` (`components/ui/button.tsx`).
- **Cards** — `rounded-lg border border-line bg-card shadow-sm` is the single card recipe.
- **Icons** — Lucide, stroke 1.5–1.75, sized `h-4/5` in-line and `h-4` in chips.
- **Motion** — one ease (`cubic-bezier(.22,1,.36,1)`), 200–600ms; new polish utilities
  (`ce-fade-in`, `ce-pop`, `ce-pulse-soft`, shimmer) follow it and are reduced-motion safe.
- **Colour** — 15 semantic roles from one green family; status uses success/warning/error
  only; **red is never used for wellbeing status** (green family; amber for gentle flags).

## Per-surface consistency

Family Space, Guardian App, Presence Console, Operations Admin, Insights, and every
Module 7.5 addition (Welcome, Auth, Permissions, Notifications, Search, Settings, Help,
About, Feedback, Legal) all render from the same tokens and primitives — hide the logo
and it is still unmistakably Close Eye. See [Design-System](./Design-System.md) and the
live reference at `/design-system`.

## §22 Quality check (spot audit)

No dead links (footer/legal/help/about/settings all resolve), no Lorem Ipsum, no
placeholder text, no empty cards (every list has a warm empty state), no missing icons,
no duplicate buttons. Responsive from 320px up; skip-link + focus-visible rings present.
