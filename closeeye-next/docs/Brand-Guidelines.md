# Close Eye — Brand Guidelines

> The umbrella document. It restates the **Close Eye Design Authority v1.0** (the
> permanent source of truth) and points to the detailed docs. Update only when
> Krishna (Founder & CEO) explicitly instructs.

## What Close Eye is

**Close Eye is a Trusted Human Presence Company.** Families who live away from
their parents need someone trustworthy to physically *be there* during life's
important moments. The product is **trust**; technology only enables it.

Close Eye is **not** a healthcare marketplace, an app, a booking portal, an
insurance site, or an elder-care listing. Every screen communicates: trust,
humanity, calmness, presence, reliability, premium quality.

## The name

Always written **"Close Eye"** — two words, both capitalised. Never `CloseEye`,
`closeeye`, or `close eye`. This is mandatory in all copy.

## The logo

Never recreate or redesign the logo. Official assets (per the brand sheet):
`closeeye-icon.svg` (the green gradient star + dot), `closeeye-wordmark.svg`, and
`closeeye-logo.svg` (full lockup) — to be stored in **`public/brand/`** and rendered
via the single `Logo` component (`components/ui/logo.tsx`).

- **The wordmark is lowercase "close eye"** — a space, rounded type. This lowercase
  form is the **logo only**.
- **In copy**, the name is always title-case **"Close Eye"** (never `CloseEye` /
  `closeeye`). Logo casing and copy casing are intentionally different.
- On dark surfaces the wordmark inverts to white; the icon keeps its green gradient.

Until the official SVGs are dropped in `public/brand/`, `Logo` renders the faithful
icon vector + the lowercase wordmark to match.

## Personality

Warm · Elegant · Minimal · Premium · Human · Trustworthy · Calm · Timeless.
Never loud, never flashy, never salesy. Inspiration (never copied): Apple,
Airbnb, Stripe, Headspace, Aesop, Linear, Notion.

## The detailed docs

| Doc | Covers |
|---|---|
| [Design-System](./Design-System.md) | Tokens, principles, the one-product rule |
| [Colour-System](./Colour-System.md) | The 15 colour roles |
| [Typography](./Typography.md) | Manrope, the type scale |
| [Photography](./Photography.md) | Editorial, real Indian families |
| [Motion](./Motion.md) | Subtle, 250ms, ease-out |
| [Writing](./Writing.md) | Voice, banned/approved words, microcopy |
| [Component-Library](./Component-Library.md) | Every reusable component |
| [Booking-Flow](./Booking-Flow.md) | Module 02 — the booking experience |
| [Product-Bible](./Product-Bible.md) | Product truths, mission, services |
| [Decision-Log](./Decision-Log.md) | Why key choices were made |
| [Changelog](./Changelog.md) | What shipped, when |

## The master rule

Close Eye is one unified product, not a collection of pages. If the logo were
hidden, the typography, colour, spacing, photography, components, writing and
motion should still make it instantly recognisable. Every future screen — Website,
PWA, Booking Flow, Family Space, Guardian App, Presence Manager Portal, Admin
Portal — inherits from this system.
