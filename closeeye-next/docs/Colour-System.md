# Close Eye — Colour System

One green family, drawn from the official logo. **Nothing outside this palette** —
no ad-hoc greens, no gold, no neon, no gradients (the logo mark excepted).
All values are CSS variables in `styles/globals.css`, surfaced as Tailwind classes.

## The 15 roles

| Role | Token | Tailwind | Hex | Use |
|---|---|---|---|---|
| Primary | `--ink` | `ink` | `#0E2A1F` | Headings, primary buttons, dark sections, body ink |
| Primary Dark | `--primary-dark`¹ | `ink` (darker via hover) | `#0A1F14` | Deepest ink, active states |
| Primary Light | `--green` | `green` | `#1F5137` | Eyebrows, links, accents |
| Accent | `--accent` | `accent` | `#A6D4B4` | Soft marks, on-dark accents |
| Accent Soft | `--accent-soft` | `accent-soft` | `#E4F0E7` | Icon chips, fills, panels |
| Success | `--success` | `success` | `#069953` | Confirmation only (checks, live dot) |
| Warning | `--warning` | `warning` | `#BB8A2E` | Flags, emergency labels (rare) |
| Error | `--error` | `error` | `#B0463B` | Form validation only |
| Background | `--ivory` | `ivory` | `#F6F3EC` | Warm page background |
| Surface | `--card` | `card` | `#FFFFFF` | Cards, inputs |
| Border | `--line` | `line` | `#E7E1D6` | Hairlines, dividers |
| Text / Typography | `--ink` / `--body` | `ink` / body | `#0E2A1F` / `#233A2E` | Headings / body copy |
| Muted Text | `--muted` | `muted` | `#5B6B62` | Captions, meta |
| Disabled | `--disabled` | `disabled` | `#ACB6B0` | Inert controls |
| Hover / Active | `--green-hover` | `green-hover` | `#16402B` | Pressed/hover of primary |

¹ Primary Dark is expressed through `--ink` at full strength and its darker hover tint; the palette intentionally avoids a near-duplicate token.

## Rules

- Dark sections use `ink` background with `text-white` + white opacities for muted text.
- Success green is reserved for confirmation — never decoration.
- Body text colour is applied globally on `<body>`; override with `text-ink` / `text-muted` / `text-white`.
- Contrast meets WCAG AA (ink on ivory ≈ 13:1; muted on ivory ≈ 4.7:1).
