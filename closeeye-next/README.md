# Close Eye Next

> **When you can't be there, Close Eye can.**
> The next-generation marketing experience for Close Eye — the world's most trusted presence platform.

A production-grade, standalone Next.js application built to eventually replace the
current Close Eye website. It does **not** touch the existing production site — it
lives beside it in its own folder with its own dependencies.

---

## Tech stack

| Concern         | Choice                                                            |
| --------------- | ----------------------------------------------------------------- |
| Framework       | **Next.js 15** (App Router) + **React 19** + **TypeScript** (strict) |
| Styling         | **Tailwind CSS** with a token-driven design system                |
| Components      | **shadcn/ui-style** primitives (Radix + CVA) in `components/ui`    |
| Animation       | **Framer Motion** (fade / slide / scale — subtle, reduced-motion aware) |
| Icons           | **Lucide**                                                        |
| Forms           | **React Hook Form** + **Zod** (installed, ready for lead capture)  |
| PWA             | Web manifest + service worker (offline fallback, precached shell) |
| SEO             | Metadata API, OpenGraph, Twitter cards, schema.org JSON-LD, sitemap, robots |
| A11y            | WCAG-AA colour contrast, keyboard nav, skip-link, ARIA, focus rings |

Everything renders **statically** (`○ Static` on every route) for sub-second loads.

---

## Project structure

```
closeeye-next/
├─ app/                     # App Router: routes, layout, metadata files
│  ├─ layout.tsx            #   root shell + full SEO/PWA metadata
│  ├─ page.tsx              #   homepage (composes the home feature sections)
│  ├─ founder-story/        #   /founder-story
│  ├─ privacy/              #   /privacy
│  ├─ offline/              #   PWA offline fallback
│  ├─ manifest.ts           #   /manifest.webmanifest
│  ├─ robots.ts · sitemap.ts
│  └─ not-found.tsx
├─ components/
│  ├─ ui/                   # Design-system primitives (Button, Card, Accordion,
│  │                        #   Badge, Section, Container, Reveal, Logo)
│  ├─ layout/               # Navbar, Footer
│  └─ pwa/                  # Service-worker registration
├─ features/
│  └─ home/                 # One component per homepage section
├─ hooks/                   # use-scrolled, …
├─ lib/                     # site config, content, schema.org, utils (cn)
├─ types/                   # shared TypeScript types
├─ styles/globals.css       # design tokens (CSS variables) + base layer
├─ public/                  # brand assets, icons, sw.js, fonts/
└─ tailwind.config.ts       # tokens mapped to Tailwind theme
```

### Design system & docs
This project follows the **Close Eye Design Authority v1.0**. The full design
language is documented in [`/docs`](./docs) (Brand-Guidelines, Design-System,
Colour-System, Typography, Photography, Motion, Writing, Component-Library,
Booking-Flow, Product-Bible, Decision-Log, Changelog) and rendered live at
**`/design-system`**.

### Design tokens
All colour, radius, shadow, and motion values live in **`styles/globals.css`** as CSS
variables and are surfaced through **`tailwind.config.ts`**. Change a brand colour in
one place and it flows through the entire app. Nothing hardcodes spacing — sections
use the `.section-pad` rhythm and the `Container` max-width (1280px).

### Brand font
The brand typeface is **Manrope** (fallback Inter → system-ui), loaded via
`next/font/google` in `app/layout.tsx` — self-optimised, no layout shift.

---

## Run locally

```bash
cd closeeye-next
npm install            # already run if node_modules exists
cp .env.example .env.local   # then edit values (WhatsApp number, site URL)

npm run dev            # http://localhost:3000
```

Other scripts:

```bash
npm run build          # production build (also type-checks)
npm run start          # serve the production build
npm run lint           # ESLint (next/core-web-vitals + next/typescript)
npm run typecheck      # tsc --noEmit
```

---

## Deploy to Vercel

This app is a **subdirectory** of the repo, so point Vercel at it:

1. **Import the repo** in Vercel (or `vercel link` from `closeeye-next/`).
2. **Set the Root Directory** to `closeeye-next` in
   *Project → Settings → Build & Deployment → Root Directory*.
   (The framework preset auto-detects **Next.js** — no build config needed.)
3. **Add environment variables** (*Project → Settings → Environment Variables*):
   - `NEXT_PUBLIC_SITE_URL` → `https://closeeye.in`
   - `NEXT_PUBLIC_WHATSAPP_NUMBER` → your number, digits only
4. **Deploy.** Preview URLs are created per push; promote to production when ready.

CLI alternative:

```bash
cd closeeye-next
vercel            # first run links + configures the project (preview deploy)
vercel --prod     # production deploy
```

Because every route is static, it serves from Vercel's edge cache with no cold starts.

---

## Notes for the team

- **Testimonials** render from `lib/content.ts` and are clearly marked *Placeholder* —
  replace the three entries with real quotes and the section updates itself.
- **Services / FAQs / journey steps / trust pillars** are all data-driven in
  `lib/content.ts`; edit copy there, never in JSX.
- **Sections animate on scroll** via the `Reveal` / `Stagger` primitives, which
  automatically fall back to a static render when the OS requests reduced motion.
- The homepage is intentionally **not** wired to the legacy Supabase backend — it is a
  clean marketing surface. Lead-capture wiring (RHF + Zod) can drop into the CTA/contact
  section when the endpoint is ready.
