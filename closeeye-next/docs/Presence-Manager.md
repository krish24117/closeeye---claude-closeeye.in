# Close Eye — Presence Manager Console (Module 05)

**Mission:** the operational brain of Close Eye — *not* a CRM, admin dashboard or
hospital software. Apple Mission Control + air-traffic control + Ritz-Carlton
concierge. Within five seconds a Presence Manager should know: who needs help, who is
safe, who needs follow-up, what changed, and what to do next. Everything reduces
operational stress.

Route: **`/console`** (desktop-first, `noindex`). Reuses the Design System entirely —
no new colours, type, spacing, motion, or duplicated components.

## Architecture

`app/console/layout.tsx` → **`ConsoleShell`** (`components/console/console-shell.tsx`):
- **Desktop sidebar** (lg+): logo · Dashboard · Families · Today's Visits · Guardians ·
  Messages · Escalations (badge) · Calendar · Reports · Settings · PM mini-card.
- **Topbar**: global search (families / guardians / city, live dropdown),
  notifications panel, persistent **emergency** sheet (call guardian / family / ops / 108).
- **Contextual banner**: a calm strip when families need attention (never alarming).
- **Mobile**: the sidebar collapses into a drawer; content stays usable.

## Screens

| Route | Screen | Highlights |
|---|---|---|
| `/console` | **Dashboard** | Greeting · hero stats (families / active / upcoming / high-priority) · KPI row · **FamilyHealthWidget** · Today's schedule · **AI Operations Assistant** · Recent activity |
| `/console/families` | Families | The `FamilyHealthWidget` as a searchable, filterable directory |
| `/console/families/[id]` | **Family Profile** | Live AI story, timeline, moments, photos, voice, health snapshot, wellness trend (reused from Family Space) · guardian · family requests · documents · emergency contacts · actions (Call · WhatsApp · Schedule · Assign · Escalate) |
| `/console/visits` | Today's Visits / **Live Monitor** | `LiveVisitCard` grouped by In progress · Delayed · En route · Upcoming · Completed (check-in, GPS, duration, AI status, media) |
| `/console/guardians` | Guardians | `GuardianCard` directory — availability, load, rating, training, call / message / assign |
| `/console/escalations` | Escalations | `EscalationCard` by priority with a recommended next step + resolve |
| `/console/calendar` | Calendar | Day / Week / Month agenda (`CalendarCard`) — visits, appointments, birthdays, leave, requests |
| `/console/reports` | Reports | Today / week / month — satisfaction, completion, response, family-health trends, guardian performance (plain-language bars, no charts) |
| `/console/messages` | Messages | Unified inbox — Families · Guardians · Team, search, quick-reply templates |
| `/console/settings` | Settings | Profile · notification toggles · your guardians |

## Family Health Widget (the primary hero)

`components/console/family-health-widget.tsx` — the operational heartbeat. A
**Relationship & Service Health** indicator (never a medical score) in three
categories: 🟢 On track · 🟡 Follow-up recommended · 🔴 Immediate attention. Search,
filter (all / green / yellow / red) and sort (priority / name / last visit). Each
family card carries member, guardian, last & next visit, satisfaction, wellness trend,
and quick actions (Call family · Call guardian · Open timeline · Assign follow-up).

## Connected to the ecosystem

The console reads the **same shared stores** the Guardian App writes and Family Space
reads (`useLiveFamilies`, `features/console/use-live.ts`):
- A completed Guardian visit → the family's card shows *"Just now · new report"* and the
  full report (story, timeline, media, health) appears on the Family Profile.
- A family request → the family moves to *Follow-up* with a pending-request chip.

The AI Operations Assistant (`AI_RECOMMENDATIONS`) speaks in human language, never raw
AI. Wellness scores remain family-facing only (the CLOza principle).

## Components (`components/console/`)

| Component | File | Notes |
|---|---|---|
| `ConsoleShell` | `console-shell.tsx` | Sidebar + topbar + search + notifications + emergency + banner |
| `FamilyHealthWidget` | `family-health-widget.tsx` | The hero — 3 categories, live status, filter/search/sort |
| `HealthBadge` (+ `HEALTH`) | `health-badge.tsx` | Green / yellow / red relationship-health badge |
| `OperationsKPICard` | `kpi-card.tsx` | One calm operational metric |
| `AIRecommendationCard` | `ai-recommendation.tsx` | AI Operations Assistant line (human language) |
| `GuardianCard` | `guardian-card.tsx` | Directory card — status, load, rating, training |
| `LiveVisitCard` | `live-visit-card.tsx` | Live monitor card — check-in, GPS, progress, AI status, media |
| `EscalationCard` | `escalation-card.tsx` | Priority, issue, recommended action, resolve |
| `ActivityItem` | `activity-item.tsx` | Operational activity feed line |
| `CalendarCard` | `calendar-card.tsx` | Agenda entry (visit / appointment / birthday / leave / request) |
| `ConsoleFamilyProfile` | `family-profile.tsx` | The full profile (reuses Family Space experience components) |
| `ConsoleGreeting` | `console-greeting.tsx` | Time-aware PM greeting |

## Data model & realtime

`lib/console-data.ts` is the single swap boundary: `ConsoleFamily` (with `HealthStatus`),
`ConsoleGuardian`, `ConsoleVisit`, `Escalation`, `ActivityItem`, `AIRecommendation`,
plus `KPIS` / `STATS`. The live join (`useLiveFamilies`) layers the shared stores
(`visit-reports`, `family-requests`) on top and listens to `storage` events.

**Realtime events** (today localStorage + a `storage` listener → swap for Supabase
realtime subscriptions on the visit / request / escalation tables):
`guardian.checked_in` · `guardian.delayed` · `visit.completed` · `media.uploaded` ·
`voice.uploaded` · `family.request_created` · `escalation.raised` · `emergency.raised`.
No duplicate tables — reuse the existing visit, upload and auth tables; the console is a
read/act surface over them.

## V1 operational completeness

- **Care Team** (Guardians + Companions). `role` + skills on `ConsoleGuardian`;
  Companions carry service skills (Conversation, Walk, Reading, Hospital Companion,
  Shopping Assistance). `CareTeamDirectory` adds tabs (All / Guardians / Companions),
  a role badge on each card, and filters (availability · location · experience · name).
  One `GuardianCard`, reused.
- **Visit statuses** — Scheduled · Upcoming · En route · On site · Completed · Delayed ·
  Cancelled · Rescheduled · Missed, each with a distinct look (`VisitStatusBadge`,
  `VISIT_STATUS`), built from the design system's semantic tones only.
- **Cancellation & reschedule** — `lib/visit-ops.ts` + `useVisitOps` (broadcasts a
  same-tab `ce-visit-ops` event so board, metrics and profile stay in sync). Cancel
  requires a reason; reschedule offers a date/time + reassignment (Guardian or
  Companion) with an availability check. On confirm: family + Guardian notified,
  calendar / metrics update, and the visit is preserved in history — **cancelled visits
  never disappear** (their own *Cancelled today* / *Rescheduled today* sections on the
  live monitor).
- **Live dashboard metrics** — Completed · Upcoming · Delayed · Cancelled · Rescheduled ·
  No-show (`DashboardMetrics`, `visitMetrics`), updating the instant a visit changes.
  Compact **Family Health Overview** uses the Reports stacked-bar styling.
- **Auto-escalation** — `autoEscalations` raises an escalation when a high-priority visit
  is cancelled (with a recommended action); merged into the Escalations page live.
- **Calendar** — visit-type colours + a legend (Wellbeing · Hospital · Companion ·
  Emergency · Birthday · Video · Cancelled · Rescheduled).
- **Messages** — Companions tab + status filter chips (Unread · Needs reply · Resolved),
  instant search. **Reports** — "Care Team performance" (Guardians + Companions).
- **Family profile** — a Visit-history timeline (scheduled / completed / cancelled /
  rescheduled + report events).

**Public Companion recruitment** (NOT in the console): a marketing page at
`/become-a-companion` (Apply → Background verification → Interview → Training →
Certification → Available → Start supporting families) with an application form.
Applicants are stored separately (`lib/companion-applicants.ts`; no admin recruitment
module in V1). A "Become a Companion" link sits in the website footer.

New components: `VisitStatusBadge`, `CareTeamDirectory`, `DashboardMetrics`,
`FamilyHealthOverview`, `TodaysVisitsBoard`, plus `components/marketing/companion-application.tsx`.
New data/logic: `lib/visit-ops.ts`, `features/console/use-visit-ops.ts`,
`lib/companion-applicants.ts`.
