# Intelligence Engine

The engine is `lib/cloza-engine.ts` (internal name CLOza). It is a **pure interpretation
layer** over existing data — deterministic today, swappable for a real model later
without changing the outputs' shape or tone.

## Inputs (read-only, no new storage)

`console-data` (families, guardians, zones, cancellations, KPIs) · `admin-data`
(revenue, memberships, coverage, alerts) · `visit-reports` (the live captured report) ·
`family-requests` · `cloza.ts` (observation scales). Nothing is written back.

## Outputs & UI mapping

| Function | UI component | Route |
|---|---|---|
| `wellnessTrends(period)` | `WellnessTrends` | `/admin/insights` |
| `relationshipInsights()` | `RelationshipInsights` | " |
| `careQuality()` | `CareQuality` | " |
| `operationalIntelligence()` | `OperationalIntelligence` | " |
| `dailyBrief()` | `DailyBrief` | " |
| `audienceSummary(report, audience)` | `StoryStudio` | " |
| `proactiveAlerts()` | `AlertCard` (reused) | " |
| `search(query)` | `InsightSearch` | " |

## Verdicts

Three levels only, always in words: **Improving · Stable · Needs attention** (`Level`).
Never a number, never a score.

## Components (`components/insights/`)

`StatusPill` · `DailyBrief` · `WellnessTrends` (7/30/90 toggle) · `RelationshipInsights`
· `CareQuality` · `OperationalIntelligence` · `StoryStudio` (audience tabs) ·
`InsightSearch`. Reused from earlier modules: `AlertCard`, `AIRecommendationCard`,
`Avatar`, tokens/charts. No new design language.

## Design guardrails

- Interpretation, not re-display — the hub never re-lists an operational table.
- Human language only; every insight ends with a recommended action.
- One surface (`/admin/insights`) — no duplicate dashboards.
- Backend swap: replace the deterministic bodies with model calls; the UI is agnostic.

## V2 · Executive intelligence dashboards (additive)

Layered onto the same `/admin/insights` surface (no existing section removed), all
reusing the design language and the `KpiTile` / `BarChart` / `TrendArea` / `InsightBars`
primitives via shared `IntelCard` / `MetricGrid` / `IntelActions`:

- **Executive KPI strip** (12, horizontally scrollable) · **Today's top priorities** (5,
  one-click actions) · **Connected insights** (cross-module correlations) ·
  **Cancellation**, **Revenue**, **Financial health**, **Care team**, **Companion**,
  **Guardian capacity**, **Zone**, **Growth** intelligence.
- Data: `lib/exec-intel.ts` (the additive swap boundary). Components:
  `components/insights/exec-*.tsx`, `intel-panel.tsx`, `intel-actions.tsx`, `priority-list.tsx`,
  `zone-intel.tsx`.
- AI search extended: Guardian utilisation, Companion availability, failed payments,
  pending renewals, open Care Team tickets, "which Guardian needs help".
- Cross-module correlation (`CROSS_MODULE`): e.g. *"cancellations high in Hyderabad West
  because the zone is short on Guardians — hire one to fix both."*
