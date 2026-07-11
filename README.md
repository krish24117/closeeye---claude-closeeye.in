# Close Eye

A trusted human presence for the people you love — home wellbeing visits, hospital companionship, and ongoing family support across India (launching in Hyderabad).

## The codebase

The single, authoritative product application lives in **[`closeeye-next/`](closeeye-next/)** — a Next.js 15 (App Router) app deployed to Vercel and served at **[closeeye.in](https://closeeye.in)**. Every surface (marketing site, customer portal, Guardian app, Presence Console, Admin, PWA, and the native Capacitor Android/iOS shells) is built from it.

This repository root holds **shared infrastructure only**:

| Path | What |
|---|---|
| [`closeeye-next/`](closeeye-next/) | **The product app** — web · PWA · native shells |
| [`supabase/`](supabase/) | Backend — migrations + edge functions |
| [`e2e/`](e2e/) | Production end-to-end tests (Playwright, against closeeye.in) |
| [`tests/`](tests/) | Unit tests for closeeye-next pure helpers (`node --test`) |
| [`.github/workflows/`](.github/workflows/) | CI — Android/iOS builds (run inside `closeeye-next/`) |
| [`scripts/`](scripts/) | Dev scripts — founder-story captions, DB seed |

## Develop

```bash
cd closeeye-next
npm install
npm run dev
```

From the repo root: `npm test` (unit tests) · `npm run e2e` (production E2E).

> The legacy Vite app has been retired and removed. **closeeye-next is the only Close Eye product codebase** — do not create parallel app implementations.
