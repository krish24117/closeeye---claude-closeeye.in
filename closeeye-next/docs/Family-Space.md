# Close Eye — Family Space (Module 03)

**Mission:** Family Space is *not* a dashboard — it's the family's digital home.
Opening it should make someone feel *"My parents are okay. My family is connected.
I know what's happening."* Calm, human, premium, warm, personal. Never admin
software, never hospital software.

Route: **`/family`** (private, `noindex`). Reachable via **Sign in** in the navbar
and the footer. Everything inherits the Design System — no new colours, type,
spacing, or patterns.

## Architecture

The app is split by route group so Family Space gets its own shell:
- `app/(marketing)/layout.tsx` — public site chrome (Navbar + Footer).
- `app/family/layout.tsx` → `FamilyShell` — desktop sidebar + mobile bottom nav +
  top bar (notifications + emergency). No marketing chrome.

## Information architecture

- **Desktop sidebar:** Overview · Family · Visits · Documents · Membership · Messages · Settings — plus a Presence Manager mini-card and an Emergency button.
- **Mobile bottom nav:** Home · Family · Visits · Messages · Profile. Top bar carries the logo, notifications bell, and emergency.

## Screens

| Route | Screen | Highlights |
|---|---|---|
| `/family` | Home / Overview | Greeting · **Today's Status** · Quick Actions · **Latest Update** · next visit · Presence Manager · **Trust Score** |
| `/family/members` | Family | Profile cards: photo, relationship, medical notes, preferences, emergency contacts, care team, edit |
| `/family/visits` | Visits | Tabs: Upcoming / Completed / Cancelled → each opens a report |
| `/family/visits/[id]` | Visit report | Arrival/departure, photos, voice note, conversation, wellbeing, medication, recommendations, Guardian note, PM review, follow-up |
| `/family/messages` | Messages | Simple Family ↔ Presence Manager thread (text/voice/photo), WhatsApp handoff. Not a complex chat. |
| `/family/documents` | Documents | Secure vault grouped: Insurance, Medical, Prescriptions, Identity, Emergency, Reports |
| `/family/membership` | Membership | Status, usage, benefits, invoices, referral placeholder |
| `/family/profile` | Profile & settings | Personal, communication, family & privacy prefs, security, sign out |

## Signature elements

- **Today's Status** — the first thing seen: *"Ramesh is doing well today"* with last
  visit, mood, medication, next visit. Reassurance-first; **red is never used** for
  status (warm greens; amber only for gentle flags).
- **Trust Score** — relationship confidence (Guardian consistency, visit completion,
  family satisfaction, communication, response time). **Not** a medical score; shown
  as calm progress bars, never clinical.
- **Emergency** — an always-available button opening a sheet: call Presence Manager,
  emergency contacts, nearest hospital, location, medical notes.
- **Notifications** — friendly and human ("Lakshmi enjoyed her evening visit — 4 new photos").

## States

- **Empty:** warm and guiding ("No upcoming visits right now — and that's perfectly okay").
- **Error** (`app/family/error.tsx`): *"We couldn't load today's update. Please try again or contact your Presence Manager."*
- **Loading** (`app/family/loading.tsx`): calm skeleton.

## Data & backend readiness

All content comes from **`lib/family-data.ts`** — the single swap boundary. Replace
those exports with real API calls / server-component fetches and every screen keeps
working. Interactive pieces (messages composer, settings toggles, visit tabs) hold
local state and are ready to bind to endpoints.

## The Human Presence Experience (Guardian integration)

Every completed Guardian visit flows into Family Space as a warm, human experience —
never a reporting dashboard. When a report exists for a loved one (`lib/visit-reports.ts`),
the **existing** screens upgrade in place; when it doesn't, they fall back to the
current content. No new screen, no new nav.

- **AI Visit Story** (`AIStoryCard`) — the hero. A human summary first (never raw
  observations), with mood, a gentle wellness label, Share and Download PDF. Shown on
  the overview (`OverviewStory`) and atop the visit report.
- **Visit report** (`/family/visits/[id]` → `VisitExperience`) becomes the full
  experience: story → **moment-by-moment timeline** (`VisitStoryTimeline`) → **Moments**
  memory book (`MomentGallery`) → **Photos** (`PhotoGallery`: expand, swipe, download,
  share) → **Voice note** (`VoicePlayer`: waveform, speed, transcript placeholder,
  download) → **Health snapshot** (`HealthSnapshot`: reading, Normal/Watch/Needs
  attention, subtle trend — never a clinical chart) → **Wellness this week**
  (`WellnessTrendCard`) → Guardian note → Presence Manager review → **Downloads**
  (report, photo package, health summary).
- **Family requests** (`FamilyRequestCard`, `lib/family-requests.ts`) — the family
  prepares gentle asks before the next visit; the Guardian sees them on the visit brief
  (`FamilyRequestsInbox`) and the Presence Manager can review. Closes the loop.
- **Presence Manager** card gains **Escalate a concern**.

Wellness scores are computed for the **family only** — Guardians never see a score
(the CLOza principle). Derivations live in `lib/family-report.ts`. Data flows via
`lib/visit-reports.ts` (the guardian→family bridge; swap for the Supabase visit tables).

## Microcopy

Family (not customer) · Visit (not task) · Update (not record) · Support/Care/Presence.
Warm, never robotic — see [Writing](./Writing.md).
