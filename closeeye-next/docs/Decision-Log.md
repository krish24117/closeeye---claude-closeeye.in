# Close Eye — Decision Log

Why key choices were made. Append new decisions; don't rewrite history.

### 2026-07-07 · Design Authority v1.0 adopted
Krishna issued the permanent Design Authority. The `closeeye-next` app was brought
into full compliance (name, font, logo, buttons, colour roles, spacing, radius,
banned words, `/docs`).

### 2026-07-07 · Font → Manrope
The Authority mandates **Manrope** (fallback Inter). This supersedes the earlier
Open Sauce One rule, which now applies only to the legacy Vite site. Loaded via
`next/font/google` for zero layout shift.

### 2026-07-07 · Name is "Close Eye"
Every occurrence normalised to **Close Eye** (two words). Confirmed against the live
site's title. The logo wordmark reads "Close Eye".

### 2026-07-07 · Logo asset
The official raster (`ce-logo.png`) has a **white background** (RGB, no alpha), so it
can't sit inline on ivory/dark. We render a transparent **vector of the same mark**
(`logo.tsx`) — the same logo, not a redesign. **TODO:** replace with an official
transparent SVG/PNG from the founder when available.

### 2026-07-07 · Four buttons
Added `ghost` and renamed `link` → `text` to match the Authority's exact four:
Primary, Secondary, Ghost, Text. Buttons moved from pill to 12px radius (matches the
Stripe/Linear/Notion register the Authority cites).

### 2026-07-07 · Banned words scrubbed
Removed "platform" and "world's most" from all copy. The eyebrow/footer/manifest now
say "a trusted human presence" instead.

### 2026-07-07 · Booking = primary funnel (`/book`)
Primary "Check on My Family" / "Book a visit" CTAs across the site now route to the
Module 02 booking flow. WhatsApp remains a secondary channel everywhere.

### 2026-07-07 · Booking architecture
Chose a `useReducer` + Context store with `localStorage` persistence (progress
survives refresh — a trust feature) over URL-step routing, to keep the flow one
self-contained, testable client module. Validation is per-step Zod.

### 2026-07-07 · Colour role mapping
Implemented all 15 Authority colour roles. "Primary Dark" is expressed via `--ink`
and its darker hover tint rather than a near-duplicate token, to keep the palette tight.

### 2026-07-07 · Route groups for app vs marketing (Module 03)
Split the root layout: `app/(marketing)/` keeps the Navbar/Footer chrome; the root
layout went lean. **Family Space** (`app/family/`) gets its own `FamilyShell` (sidebar +
bottom nav) with no marketing chrome. URLs are unchanged (route groups don't affect paths).

### 2026-07-07 · Family Space is a home, not a dashboard
Reassurance-first: Today's Status leads with plain-language wellbeing; **red is never
used for status** (warm greens; amber only for gentle flags). The **Trust Score**
measures *relationship confidence*, not health — shown as calm bars, never clinical.
All content flows from `lib/family-data.ts`, the single backend-swap boundary; the
interactive pieces hold local state ready to bind to real endpoints.

### 2026-07-07 · Module 03 — Iteration 2 (refinement, not redesign)
Consistency + polish pass, journey unchanged. Unified all status chips into one
`StatusBadge` (identical height/padding/radius/type); extracted `ActionCard` +
`SectionTitle` for reuse; elevated the Presence Manager into the product's hero
trust card (online state, response time, next visit, WhatsApp/Call, personal intro);
reframed Visits as a `FamilyTimeline` of dated memories (spine + rich entries) and
defaulted it to Completed; added personality ("what makes them, them") to family
profiles; standardised card treatment (rounded-lg + hairline + shadow-sm) and
hover/press feedback. Removed `VisitItem` (superseded by the timeline). Logo remains
the single `Logo` component everywhere — recommend the founder supply an official
transparent wordmark SVG to fully lock it (currently mark SVG + "Close Eye" text).

### Deployment note
`closeeye-next` deploys as its **own** Vercel project (`closeeye-next.vercel.app`),
isolated from the legacy production site (`closeeye.in`), which stays untouched.
