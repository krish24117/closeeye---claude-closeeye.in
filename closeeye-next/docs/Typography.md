# Close Eye — Typography

**Primary font: Manrope.** Fallback: Inter → system-ui. Loaded via `next/font/google`
in `app/layout.tsx` (self-optimised, no layout shift). One family only — never mix fonts.

## The scale

The only steps allowed. Defined in `tailwind.config.ts` under `fontSize`.

| Step | Class | Size (clamp) | Weight | Use |
|---|---|---|---|---|
| Hero / H1 | `text-h1` | 44 → 68px | 700 | Page hero headline |
| H2 | `text-h2` | 32 → 48px | 700 | Section headings |
| H3 | `text-h3` | 24 → 32px | 600 | Sub-sections, step titles |
| H4 | `text-h4` | 20px | 600 | Card titles, list headers |
| Body Large / Lead | `text-lead` | 19px | 400 | Intros, standfirsts |
| Body | `text-body` | 17px | 400 | Default reading text |
| Small | `text-body-sm` | 15px | 400 | Secondary text, form hints |
| Caption | `text-caption` | 13px | 500 | Meta, labels |
| Eyebrow | `.eyebrow` | 13px, 0.12em tracked, uppercase | 600 | Above section headings |
| Button | inherits `font-semibold` | 15–17px | 600 | Button labels |

## Rules

- Headings: tight tracking (`-0.02em`), colour `--ink`, `text-wrap: balance`.
- Body: 1.7 line-height for comfort; `text-wrap: pretty`.
- Never invent a size or weight outside the scale. If a new need appears, add it here first.
- Reading measure caps at ~38rem (`max-w-prose`) for long-form text.
