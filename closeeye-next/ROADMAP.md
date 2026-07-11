# Close Eye Next — Roadmap

The production-grade rebuild in `closeeye-next/`, deployed in isolation to
`closeeye-next.vercel.app` (never the live `closeeye.in`). One design system, one
ecosystem, three personas + the founder layer + the intelligence layer.

## Principle

Each module **reuses** the Design System and existing components — never redesigns a
prior module. Shared data stores are the single Supabase swap-boundary; no duplicate
storage, no duplicate dashboards.

## Modules

| # | Module | Route(s) | Status |
|---|---|---|---|
| 0–1 | Marketing site + Design Authority | `/`, `/services`, `/membership`, `/founder`, `/become-a-companion` | ✅ |
| 2 | Booking Experience | `/book` | ✅ |
| 3 | Family Space | `/family` | ✅ |
| 3.1 | Human Presence Experience (Guardian→Family) | `/family/*` | ✅ |
| 4 | Guardian App (M1 dashboard, M2 visit journey, media capture) | `/guardian` | ✅ |
| 5 | Presence Manager Console (+ V1 operational completeness) | `/pm` | ✅ |
| 6 | Operations Admin (Founder OS) | `/admin` | ✅ |
| 7 | **Intelligence Layer (CLOza)** | `/admin/insights` | ✅ |
| 8+ | TBD — pending Product Director approval | — | ⏳ |

## Naming decision (Module 7)

**CLOza is an internal technology name only.** The UI never says "CLOza" or "AI system".
Customers and staff see **Insights · Recommendations · Daily Brief · Wellness Trends**.
CLOza remains the proprietary engine under the hood — simple, human product experience;
defensible technology story for investors.

## The ecosystem, connected

The Guardian captures a visit → a warm report flows to **Family Space** and the
**Presence Console** → **Operations Admin** sees the business impact → the **Intelligence
Layer** interprets all of it into a founder's Daily Brief and proactive recommendations.
The same shared stores (`visit-reports`, `family-requests`, `visit-ops`, `guardian-uploads`)
back every surface.

## Docs

Per-module docs live in `docs/` — Product-Bible, Design-System, Component-Library,
Family-Space, Guardian-App, Presence-Manager, Operations-Admin, and the intelligence set
(cloza-index, intelligence-engine, ai-prompts, prediction-models). Changelog tracks every
release.
