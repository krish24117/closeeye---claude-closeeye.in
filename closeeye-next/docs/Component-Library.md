# Close Eye — Component Library

Every reusable component, and where it lives. **Do not create undocumented
components** — add them here. All inherit the Design System (no new styles).

## Primitives — `components/ui/`

| Component | File | Notes |
|---|---|---|
| `Button` | `button.tsx` | The **only four**: `primary`, `secondary`, `ghost`, `text`. Sizes `sm/md/lg`. `onDark` inverts for dark sections. Radius 12. |
| `Card` | `card.tsx` | White surface, hairline border, `shadow-sm`; `interactive` adds hover-lift. |
| `Badge` | `badge.tsx` | Chip label; tones `soft` / `onDark`. |
| `FeatureIcon` | `feature-icon.tsx` | The single icon treatment — Lucide, stroke 1.5, chip container. Tones `soft`/`solid`/`onDark`. |
| `Container` | `container.tsx` | Centred 1280px content column. |
| `Section` / `SectionHeading` | `section.tsx` | Section tones `ivory`/`card`/`ink`; eyebrow→title→intro heading. |
| `Split` | `split.tsx` | Two-column media/content; `reverse` alternates. |
| `Quote` | `quote.tsx` | Editorial pull-quote; `size` `md`/`hero`. |
| `ImageFrame` | `image-frame.tsx` | Art-directed image slot / placeholder with direction note. |
| `Reveal` / `Stagger` / `StaggerItem` | `reveal.tsx` | Scroll-reveal motion, reduced-motion safe. |
| `Logo` / `LogoMark` | `logo.tsx` | Official mark + "Close Eye" wordmark. |
| `Accordion` | `accordion.tsx` | Radix-based FAQ accordion. |
| **Forms** | `field.tsx` | `Field` (label + control + error), `Input`, `Textarea`, `Label`. |
| **Choices** | `choice.tsx` | `Chip` (single-word select), `OptionCard` (rich select). |
| `ToastProvider` / `useToast` | `toast.tsx` | App-wide toast confirmations (mounted in the root layout). |

## Layout — `components/layout/`

`Navbar` (sticky, transparent→solid, mobile sheet) · `Footer` (three link groups).

## Home sections — `features/home/`

`Hero` · `Services` · `HowItWorks` · `Trust` · `Testimonials` · `Faq` ·
`FinalCta` · `FounderTeaser`. Composed by `app/page.tsx`.

## Booking (Module 02) — `features/booking/`

| Component | File |
|---|---|
| `BookingProvider` / `useBooking` | `state.tsx` (reducer + localStorage) |
| Validation + data | `schema.ts` (Zod) |
| API + WhatsApp placeholders | `api.ts`, `app/api/bookings/route.ts` |
| `Stepper` | `stepper.tsx` |
| `StepScaffold` | `step-shell.tsx` |
| Steps | `steps/service-step · family-step · purpose-step · schedule-step · contact-step · review-step · success-step` |
| `BookingWizard` | `booking-wizard.tsx` — orchestrator |

See [Booking-Flow](./Booking-Flow.md) for the flow and integration points.

## Family Space (Module 03) — `components/family/`

| Component | File | Notes |
|---|---|---|
| `FamilyShell` | `family-shell.tsx` | Desktop sidebar + mobile bottom nav + top bar, notifications & emergency sheet |
| `Avatar` | `avatar.tsx` | Initials avatar (sizes sm–xl) |
| `StatusBadge` + wrappers | `badges.tsx` | **One** badge system (fixed dims); `MoodBadge`/`MedBadge`/`VisitStatusBadge` delegate to it |
| `PageHeader` | `page-header.tsx` | Screen title + subtitle + action |
| `SectionTitle` | `section-title.tsx` | One section-header treatment (+ optional CTA link) |
| `Greeting` | `greeting.tsx` | Time-aware greeting |
| `StatusCard` | `status-card.tsx` | Today's Status |
| `ActionCard` | `action-card.tsx` | Reusable action card (icon · title · description · arrow · press) |
| `QuickActions` | `quick-actions.tsx` | 4 primary actions (built on `ActionCard`) |
| `LatestUpdate` | `latest-update.tsx` | Rich latest-visit card |
| `FamilyTimeline` | `family-timeline.tsx` | Visits as a dated journal of memories (spine + rich entries) |
| `VisitTabs` | `visit-tabs.tsx` | Upcoming/Completed/Cancelled → `FamilyTimeline` + empty state |
| `MembersManager` | `members-manager.tsx` | Client owner of the family list + add/edit state |
| `MemberCard` | `member-card.tsx` | Family profile card (`onEdit`, graceful empty states) |
| `AddMemberDialog` | `add-member-dialog.tsx` | Add / edit a family member (validated form) |
| `Overlay` | `overlay.tsx` | Reusable modal / bottom-sheet (dialogs, notifications, emergency) |
| `TrustScore` | `trust-score.tsx` | Relationship-confidence bars |
| `PresenceManagerCard` | `presence-manager-card.tsx` | Reassurance anchor |
| `MessagesThread` | `messages-thread.tsx` | Simple Family ↔ PM thread |
| `PhotoTiles` | `photo-tiles.tsx` | Art-directed photo placeholders |
| `VoiceNote` / `VoiceNoteInline` | `voice-note.tsx` | Working play/pause + waveform; real audio when `src` is given, simulated otherwise |
| `CapturedPhotos` / `CapturedVoice` | `captured-media.tsx` | Show the Guardian's **real** captured photos / voice note (from `lib/visit-reports.ts`) in the report, Latest Update and timeline; fall back to placeholders. `interactive={false}` inside links |

### Human Presence Experience — `components/family/` (Guardian integration)

The completed Guardian visit rendered as a warm experience. All reuse the design
system; each shows only when a real report exists (else the existing content stands).

| Component | File | Notes |
|---|---|---|
| `VisitExperience` | `visit-experience.tsx` | Orchestrates the visit report — rich experience when a report exists, existing static body otherwise (no duplication) |
| `AIStoryCard` | `ai-story-card.tsx` | The hero — human story first, mood, wellness label, Share (Web Share/clipboard), Download PDF |
| `OverviewStory` | `overview-story.tsx` | Renders `AIStoryCard` on the overview when a report exists |
| `TimelineEvent` / `VisitStoryTimeline` | `visit-timeline-story.tsx` | The visit moment-by-moment — icon, time, description, attachment chips |
| `MomentGallery` | `moment-gallery.tsx` | The family's memory book — the moments shared (tea, walk, memories, call…) |
| `PhotoGallery` | `photo-gallery.tsx` | Grid → expand → swipe (touch/keys) → download / share |
| `VoicePlayer` | `voice-player.tsx` | Waveform, seek, playback speed, transcript placeholder, download |
| `HealthSnapshotCard` / `HealthSnapshot` | `health-snapshot.tsx` | Reading + status (Normal/Watch/Needs attention) + subtle sparkline — never a clinical chart |
| `WellnessTrendCard` | `wellness-trend.tsx` | The week in plain words (Improving / Stable / Needs attention) |
| `FamilyRequestCard` | `family-request-card.tsx` | Family prepares asks for the next visit → the Guardian receives them |
| `FamilyRequestsInbox` | `components/guardian/family-requests-inbox.tsx` | Guardian-side: the family's requests on the visit brief |

Data & logic: `lib/visit-reports.ts` (bridge + full report shape), `lib/family-report.ts`
(compose + wellness score, story, timeline, health snapshot, wellness trend, moments),
`lib/family-requests.ts` (requests store). Wellness scores are family-facing only.

## Presence Manager Console (Module 05) — `components/console/`

The operational brain. Desktop-first; reuses the design system and the Family Space
experience components. See [Presence-Manager](./Presence-Manager.md).

| Component | File | Notes |
|---|---|---|
| `ConsoleShell` | `console-shell.tsx` | Desktop sidebar + topbar (global search, notifications, emergency) + contextual banner |
| `FamilyHealthWidget` | `family-health-widget.tsx` | The hero — 3 categories (🟢🟡🔴), live status, filter/search/sort, quick actions |
| `HealthBadge` (+ `HEALTH`) | `health-badge.tsx` | Relationship & service health badge (green/yellow/red) — never a medical score |
| `OperationsKPICard` | `kpi-card.tsx` | One calm operational metric |
| `AIRecommendationCard` | `ai-recommendation.tsx` | AI Operations Assistant, in human language |
| `GuardianCard` | `guardian-card.tsx` | Guardian directory card |
| `LiveVisitCard` | `live-visit-card.tsx` | Live monitor card (check-in, GPS, progress, AI status, media) |
| `EscalationCard` | `escalation-card.tsx` | Priority + issue + recommended action + resolve |
| `ActivityItem` | `activity-item.tsx` | Operational activity feed line |
| `CalendarCard` | `calendar-card.tsx` | Agenda entry (visit / appointment / birthday / leave / request) |
| `ConsoleFamilyProfile` | `family-profile.tsx` | Full profile — reuses `AIStoryCard`, `VisitStoryTimeline`, `MomentGallery`, `PhotoGallery`, `VoicePlayer`, `HealthSnapshot`, `WellnessTrendCard` |
| `ConsoleGreeting` | `console-greeting.tsx` | Time-aware PM greeting |

Data: `lib/console-data.ts` (roster + KPIs + escalations + AI recs). Live join:
`features/console/use-live.ts` (`useLiveFamilies`) reads the shared stores so completed
visits and family requests surface in the console instantly.
| `SettingsToggle` | `settings-toggle.tsx` | Accessible switch |
| `DocumentsVault` | `documents-vault.tsx` | Documents list + working file upload |
| `DownloadButton` | `download-button.tsx` | Downloads a generated branded doc + toast |
| Profile actions | `profile-actions.tsx` | `RequestDataButton` (data export), `ManageSessionsButton` |

Downloads use `lib/download.ts` (`downloadFile`, `brandedDocument`). Account/care
changes (Manage plan, Reschedule, Edit profile) route to WhatsApp — the Presence
Manager handles them — which is both functional and on-brand.

Data: `lib/family-data.ts` (the backend-swap boundary). See [Family-Space](./Family-Space.md).

## Guardian App (Module 04) — `components/guardian/` + `features/guardian/`

The Guardian's field app: dashboard, visit brief, and the full in-visit journey.
Mobile-first, one-handed, offline-capable. See [Guardian-App](./Guardian-App.md).

### Shared UI — `components/guardian/`

| Component | File | Notes |
|---|---|---|
| `GuardianShell` | `guardian-shell.tsx` | Console header + sync strip + bottom nav + notifications & emergency sheets |
| `SyncStatus` | `sync-status.tsx` | Meaningful sync state ("Synced just now" / "Offline ready · saved locally") — not a bare "Online" |
| `GuardianGreeting` | `guardian-greeting.tsx` | Warm, time-aware greeting |
| `VisitCard` | `visit-card.tsx` | Route card — time-first, visit-type badge, travel time, Navigate-primary action hierarchy |
| `Progress` | `progress.tsx` | **Reusable** calm segmented step indicator (`value` of `total`, soft label). Used by prep, checklist, any multi-step flow |
| `ChecklistItem` | `checklist-item.tsx` | **Reusable** checklist row. `scale` mode (chips + optional note, concern-aware) or `check` mode (tap-to-confirm). Powers the Care Checklist and "Before You Enter" |
| `ObservationCard` | `observation-card.tsx` | **Reusable** free-text observation with soft prompts. Auto-saves; nothing mandatory |
| `PhotoCapture` | `photo-capture.tsx` | **Reusable** real photo attachment — camera/library, client compression, thumbnails, live upload progress, remove, retry, lightbox preview |
| `VoiceRecorder` | `voice-recorder.tsx` | **Reusable** real voice note — mic permission, timer, pause/resume/stop, playback (via `VoiceNote`), delete/re-record, upload + retry |
| `VitalInput` | `vital-input.tsx` | **Reusable** large touch-friendly reading input; `requested` badge, numeric keypad. Shown only when asked for |
| `ComingSoon` | `coming-soon.tsx` | Milestone stub (Messages / Profile tabs) |

### Visit journey — `features/guardian/`

| Piece | File | Notes |
|---|---|---|
| `VisitJourney` | `visit-journey.tsx` | Orchestrator — context bar (person · live timer · back), animated step switch |
| `VisitProvider` / `useVisit` | `visit-state.tsx` | Journey state (`useReducer` + Context + **localStorage auto-save**, offline-safe). One store per visit id |
| `VisitTimer` | `visit-timer.tsx` | Live gentle visit timer + `useClockLabel` |
| Steps | `steps/*.tsx` | `arrive · checkin · prep · start · checklist · observations · vitals · complete · post` |
| Derivations | `derive.ts` | `objectiveOf(visit)` (Today's objective) · `requestedVitals(visit)` (which readings the family asked for) |

Structured observations use the **CLOza foundation** (`lib/cloza.ts`) — the Guardian
answers intuitive chip questions; `processVisit()` turns them into the warm,
family-safe summary. No scores are ever shown. Data: `lib/guardian-data.ts`
(backend-swap boundary).

**Media** (`lib/guardian-uploads.ts`) — attachment types (`PhotoAttachment`,
`VoiceAttachment`), client-side image compression, blob⇄dataURL helpers, and the
`uploadBlob` seam. Uploads are simulated with realistic progress until storage is
configured (`NEXT_PUBLIC_SUPABASE_URL` + anon key + media bucket); the UI never
changes when the real backend lands. Media persists with the visit via the offline
auto-save (debounced).
