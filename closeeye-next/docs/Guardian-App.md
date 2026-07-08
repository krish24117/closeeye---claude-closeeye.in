# Close Eye — Guardian App (Module 04)

The field app the **Guardian** carries into every home. Mobile-first, one-handed,
offline-capable, minimal typing. It reuses the Close Eye Design System exactly —
nothing here looks like CRM or hospital software.

> **Emotional principle.** The Guardian isn't completing a task. They're caring for
> a human being. Every screen reinforces dignity, trust and calm. Microcopy never
> says *Submit / Upload / Save* — it says *Continue · Start Visit · Complete Visit ·
> Everything has been saved.*

Routes live under `app/guardian/`. The console chrome (header + sync strip + bottom
nav + emergency) is `components/guardian/guardian-shell.tsx`. Data is mocked in
`lib/guardian-data.ts` (the single backend-swap boundary); structured observations
use the CLOza foundation in `lib/cloza.ts`.

---

## Milestone 1 — Dashboard & brief (approved)

- **Login** (`/guardian/login`) — OTP + biometric mock, remember-device, offline note. Shell-less.
- **Today** (`/guardian`) — warm greeting, motivational progress ("N families are
  waiting for you today"), "Before you visit", relationship-first Presence Manager
  card, family messages, chronological route (Morning / Afternoon), end-of-day thanks.
- **Visit brief** (`/guardian/visits/[id]`) — the read-only pre-visit brief, now the
  journey's **Screen 1 (Visit Details)**: Today's objective, location + ETA + directions,
  call family, special notes, medical, instructions, preferences, conversation ideas,
  things to observe, last visit, emergency contacts. Primary CTA → **Begin check-in**.
- **Notifications & Emergency** — typed operational updates; 108 + Presence Manager.

## Milestone 2 — The visit journey

The Guardian's actual visit, start to finish. A stateful, offline-persisted wizard at
**`/guardian/visits/[id]/visit`** (`features/guardian/visit-journey.tsx`). The
**Check In** tab (`/guardian/check-in`) is the launchpad — it surfaces the next visit.

Everything **auto-saves continuously** to `localStorage` (`VisitProvider`), so a
refresh, a locked phone, or going offline never loses a visit. Swap the storage layer
for IndexedDB + background sync later; the state shape is unchanged.

| # | Step | File | What happens |
|---|------|------|--------------|
| 1 | Visit Details | `visits/[id]/page.tsx` | Understand everything before arriving; **Begin check-in** |
| 2 | Arrive | `steps/arrive.tsx` | Returned from Maps — "You've arrived", **I'm here** |
| 3 | GPS Check-in | `steps/checkin.tsx` | Calm location confirm (address · time · accuracy); graceful *GPS unavailable → retry / PM approval* |
| 4 | Before You Enter | `steps/prep.tsx` | A mindful ritual — smile, introduce, confirm, review objective, phone silent, contacts. All checked → **Start visit** (starts the timer) |
| 5 | Start Visit | `steps/start.tsx` | Minimal, calming: name · live timer · objective · care preview · Emergency / Message PM / Call family |
| 6 | Care Checklist | `steps/checklist.tsx` | **The core.** CLOza scales grouped (Wellbeing · Mobility & medication · Conversation & connection + moments · Home & safety). Chip taps, optional notes, concern-aware. Nothing mandatory |
| 7 | Observations | `steps/observations.tsx` | Free words + soft prompts + **real photo capture & voice recording**; a small win; a private flag for the Presence Manager (never the family) |
| 8 | Vitals | `steps/vitals.tsx` | **Only when requested** (auto-derived from the brief). Large inputs, skippable |
| 9 | Complete | `steps/complete.tsx` | Review summary → **Complete visit** → confirmation + a preview of the warm, family-safe report (`processVisit`) |
| 10 | Post Visit | `steps/post.tsx` | Gentle rating + optional issue flags + Message PM; clears the saved journey |

### Design rules honoured
Premium, Apple-inspired calm · soft corners · large touch targets (Navigate 52px,
actions 48px, nav 76px) · minimal borders · generous whitespace · no new colours ·
no Material Design · no random shadows · offline-first with visible sync state.

### Media capture (photos & voice)
`PhotoCapture` opens the camera/library, compresses each image client-side, shows
live upload progress, and supports remove / retry / lightbox. `VoiceRecorder` records
via `MediaRecorder` with a timer, pause/resume/stop, playback, and delete/re-record.
Both auto-save with the visit (offline-safe, debounced), disable **Continue** while
uploading, retry gracefully when offline, and surface on the Review screen with
tap-to-preview. Uploads are mocked until storage is configured — see
`lib/guardian-uploads.ts`.

**Guardian → Family.** On **Complete visit**, a warm report (summary + the real
photos and voice note) is written to a shared store (`lib/visit-reports.ts`, keyed by
the loved one's name). Family Space reads it and shows the **real** captured media in
the visit report, the overview Latest Update, and the timeline — via
`components/family/captured-media.tsx` (`CapturedPhotos` / `CapturedVoice`), which
fall back to the warm placeholders when no report exists. localStorage stands in for
the shared backend; swap `visit-reports.ts` for an API and both apps keep working.

### The CLOza principle
The Guardian answers intuitive questions; they **never see or calculate a score**.
Each observation is stored as its own structured, queryable field (`VisitObservations`).
The family receives only warm human language — `processVisit()` composes the summary,
while risk flags and follow-ups go to the Presence Manager. See `lib/cloza.ts`.

Reusable components introduced here (`Progress`, `ChecklistItem`, `ObservationCard`,
`VitalInput`) are documented in [Component-Library](./Component-Library.md) for future
modules to reuse rather than re-create.
