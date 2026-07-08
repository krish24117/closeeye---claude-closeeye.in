# Close Eye — Operations Admin (Module 06)

**Mission:** the **Founder Operating System** — the business layer for Founders,
Business Heads and Operations Leadership. Every screen answers three questions in
order: **What happened? · What needs attention? · What should I do next?** A founder
should understand the business in 30 seconds.

Route: **`/admin`** (desktop-first, `noindex`). Reuses the Design System and the
Presence Console primitives (`OperationsKPICard`, `AIRecommendationCard`, `HealthBadge`,
`Avatar`, `Overlay`, `DownloadButton`). It is the **business** layer — distinct from the
Presence Console (Module 5, care operations); it does not duplicate Module 5, and
cross-links to it where operational detail belongs.

## Architecture

`app/admin/layout.tsx` → **`AdminShell`** (`components/admin/admin-shell.tsx`):
- Desktop sidebar: Dashboard · Operations · Finance · Bookings · Care Team · Families ·
  Memberships · Coverage · Content · Audit Logs · Settings · a **Presence Console**
  cross-link + the founder card.
- Topbar: global search (families / invoices / city) + **Attention Center** panel.

## Screens

| Route | Screen | Highlights |
|---|---|---|
| `/admin` | **Executive Dashboard** | Financial · Operational · Growth KPI tiles (with deltas) · **Attention Center** (alerts + recommended actions) · **Business Assistant** (human-language recs) · **Business Insights** (revenue by city / service / membership / Guardian / Companion + highlights) |
| `/admin/operations` | Operations | Today's KPIs · care-team availability · coverage health · **Cancellation Center** (today/week/month · reasons · trend · suggested actions) |
| `/admin/finance` | Finance | Summary tiles (gross/net/GST/payouts/collection) · **revenue chart** (daily/weekly/monthly/yearly) · invoices · refunds · payouts · taxes & exports |
| `/admin/bookings` | Booking Analytics | Completed / cancelled / rescheduled / no-show · completion rate · avg duration · conversion · outcome bar · booking sources |
| `/admin/care-team` | Care Team | Verification · training · performance · revenue per member (management view) |
| `/admin/families` | Families | Membership status (active/trial/expired/priority/renewals) · search · **bulk actions** |
| `/admin/memberships` | Memberships | Plans & pricing · trials/renewals/upgrades · coupons |
| `/admin/coverage` | Coverage | Cities · zones · pincodes · supply health · operating hours · holidays |
| `/admin/content` | Content | Website · FAQs · email/SMS templates · notifications · legal pages |
| `/admin/audit` | Audit Logs | Every action (actor · action · target · time) with kind filters |
| `/admin/settings` | Settings | Business · security · roles · API keys · integrations · emergency contacts |

## Components (`components/admin/`)

| Component | File | Notes |
|---|---|---|
| `AdminShell` | `admin-shell.tsx` | Sidebar + topbar + global search + Attention Center |
| `KpiTile` | `kpi-tile.tsx` | Headline number + period-over-period delta (coloured by whether the move is good) |
| `BarChart` / `TrendArea` | `charts.tsx` | Calm SVG bar chart + area sparkline (tokens only, no libraries) |
| `RevenueChart` | `revenue-chart.tsx` | Revenue with a daily/weekly/monthly/yearly toggle |
| `InsightBars` | `insight-bars.tsx` | Ranked horizontal bars (revenue-by-X, sources, reasons) |
| `AlertCard` | `alert-card.tsx` | Attention-Center item with severity + recommended action |

Reused: `OperationsKPICard`, `AIRecommendationCard` (the Business Assistant — `BizRec`
is structurally the recommendation type), `HealthBadge`, `Avatar`, `Overlay`,
`DownloadButton`, `SettingsToggle`.

## Data model

`lib/admin-data.ts` — the single business swap boundary: KPIs (revenue, MRR/ARR,
outstanding, churn…), `AdminAlert[]`, revenue-by insight rows, `BizRec[]`, revenue
series per period, invoices / refunds / payouts, booking + cancellation analytics,
membership plans + coupons, coverage zones, content, audit log, roles & integrations.
Reuses `FAMILIES` / `GUARDIANS` from `console-data`. `fmtINR` formats Indian currency
(₹k / ₹L / ₹Cr). Wire to the finance (Razorpay), subscription and booking tables — no
duplicate tables.

## AI Business Assistant

`AI_BUSINESS` — proactive, human-language recommendations (revenue trend, Guardian
shortage, churn, collection). Never raw AI output; each carries an optional action link.
