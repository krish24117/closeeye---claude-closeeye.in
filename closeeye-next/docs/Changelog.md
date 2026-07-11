# Close Eye Next — Changelog

### 2026-07-08 — Android & iOS via Capacitor (one codebase, no rewrite)
- Wrapped the existing PWA as native apps — no React Native/Flutter, no rebuilt screens.
- **Capacitor** installed (core + 11 plugins; CLI/android/ios/assets). `capacitor.config.ts`:
  appId **in.closeeye.app**, name **CloseEye**, 2 s warm-white splash, status bar, keyboard
  `resize:native`, and `server.url` → the deployed PWA (keeps `/api` + SSR working).
- **Native projects scaffolded**: `android/` (cap doctor: "looking great 👌") and `ios/`
  (needs `pod install`/Xcode on macOS). Icons + splash generated from the logo — Android 92
  (adaptive + monochrome + all densities), iOS 7, PWA 7.
- **Native bridge, all web-safe** (single codebase): `lib/native.ts`, `NativeInit`
  (splash dismiss, status-bar paint, Android back, deep-link routing), upgraded
  `lib/haptics.ts` (native Taptic) and `share-buttons` (native share sheet), safe-area
  insets on the Family/Guardian bottom bars.
- **Permissions**: Android manifest (camera/mic/location/notifications/biometric/media) +
  iOS Info.plist usage strings (camera/mic/photos/location/Face ID), all requested
  in-context via the existing `/permissions` flow.
- **Web untouched**: typecheck ✅, lint ✅ (0), build ✅ (shared JS still 102 kB), all routes
  200 after integration; `android/`/`ios/` excluded from the Vercel deploy.
- **CI/CD**: `.github/workflows/android.yml` (debug APK on PR, signed `.aab` on tag) and
  `ios.yml` (Simulator compile on PR, signed archive → TestFlight on tag) + `docs/ci-cd.md`
  (secrets, versioning, release tags, rollback). Preview builds need no secrets.
- **Docs (9)**: mobile-architecture, capacitor-setup, android-build, ios-build,
  playstore-release, appstore-release, mobile-testing, ci-cd, **Mobile-Readiness-Report**.
- Not producible on this Windows box (documented, honest): iOS build (needs a Mac), signed
  `.aab`/`.ipa` (SDK + keystore), FCM/APNS push, store screenshots, submission.

### 2026-07-08 — Membership language simplification (copy only)
- Retired the "Founding Member" concept from the marketing site. No plan, pricing,
  feature, onboarding or payment change — copy only.
- `/membership`: page title + `<title>` → **"Choose Your Membership"**; subtitle →
  "Choose the level of care that best fits your family. Every membership includes trusted
  human support, thoughtful technology, and peace of mind."; CTA → **"Choose This Membership"**;
  aside → "What every membership includes". `lib/content.ts` `MEMBERSHIP` reworded (eyebrow
  "Membership", founding-specific perks replaced with plain membership benefits).
- **Verified: zero "Founding" strings anywhere in closeeye-next** (app/components/lib/docs)
  and live on `/`, `/membership`, `/about`, `/contact`. Journey reads Landing → Choose Your
  Membership → Onboarding → Payment → Family Dashboard.
- Scope note: the **live closeeye.in** repo still uses "Founding Member" in real routes,
  the ₹100 checkout/payment flow, auth and admin (152 refs); left untouched by request —
  it's a separate live-payment system, to be handled on its own.

### 2026-07-07 — Pre-Production Polish: Trust & Credibility (additive)
- No redesign, no nav/type/colour changes — reused the design system to raise trust.
- **Footer (enhanced):** Quick Links (Home · About · Services · Pricing · Become a Guardian ·
  Become a Companion · Contact), Support, a Contact column (email · phone · WhatsApp · working
  hours · address when set), an official **social icon row** (hidden until URLs are configured),
  full legal row, copyright, **version**, "Made with care in India".
- **Social icons:** lucide dropped brand icons, so monochrome SVG glyphs live in
  `components/ui/brand-glyph.tsx`; `SocialLinks` renders only configured profiles (open in a new
  tab, `aria-label` "Follow Close Eye on …"). **No broken/mock link ever ships** — unset = hidden.
- **Trust & Safety (§3):** `components/marketing/trust-safety.tsx` — "Why families trust Close Eye",
  eight premium cards. Placed on the About page.
- **New pages:** `/contact` (phone · email · WhatsApp · hours · address/map when set · support form
  routing to WhatsApp · emergency escalation card) and `/become-a-guardian` (Apply → Background
  Verification → Interview → Training → Certification → Live Assignment + who-we-look-for + apply).
- **About (enhanced):** added Why Close Eye Exists, Human-Presence Philosophy, Our Promise, the
  Trust & Safety grid, and a Guardian recruitment link. **Become a Companion:** added an explicit
  "Who can become a Companion" note.
- **Social sharing (§9):** `ShareButtons` (native share + WhatsApp/X/Facebook/LinkedIn/copy),
  monochrome, on the Founder Story. **Marketing site only — never in any dashboard.**
- **SEO/PWA:** OG/Twitter/canonical + favicon/app-icon/manifest already in place (verified);
  sitemap extended with `/contact` and `/become-a-guardian`.
- **Config:** `SITE.social`, `SITE.address/hours/mapsUrl`, `SITE.version` — all env-overridable,
  empty values hide gracefully. **Gates:** typecheck ✅, lint ✅ (0), build ✅ (0), routes 200,
  0 CSP/console errors on the new client components (headless-verified).

### 2026-07-07 — Module 8: Production Audit & Launch (audit + harden only)
- No new features, no redesign, no logic/workflow changes. Full report in
  `docs/Production-Audit-Module-8.md` (all 22 sections, honest front-end vs. backend-
  swap-boundary split, Final QA scores + Go-Live checklist).
- **Security fix (real bug):** `Permissions-Policy` was `camera=(), microphone=(),
  geolocation=()` — an empty allowlist that **disabled the Guardian voice recorder and
  permission priming** in production. Corrected to `=(self)`.
- **Hardening:** added a **Content-Security-Policy** (`default-src 'self'`, `object-src
  'none'`, scoped img/media/connect, `upgrade-insecure-requests`, `frame-ancestors 'self'`)
  and **HSTS** (`max-age=31536000; includeSubDomains`). Verified live: **0 CSP violations /
  0 console errors** across 8 JS-heavy pages (headless Chrome).
- **Dependencies:** removed 2 unused (`react-hook-form`, `@hookform/resolvers`); patched the
  PostCSS advisory via `overrides` → **`npm audit` = 0 vulnerabilities**.
- **Hygiene:** 0 `console.*`, 0 TODO comments (3 reworded to swap-boundary notes), 0 dead
  code, 0 unused assets. Expanded `sitemap.ts` (+`/about`, `/become-a-companion`, `/help`).
- **Gates:** typecheck ✅, lint ✅ (0 warnings), build ✅ (0 errors), all routes 200,
  headers live-verified. Front-end **production-ready**; backend wiring itemized in the report.
- **Brand consistency (follow-up):** unified the wordmark to the lowercase "close eye" lockup
  everywhere (splash, onboarding, auth, permissions, console/admin/guardian shells) so it
  matches the homepage. Fixed the **Founder Story dark masthead**, where the transparent navbar
  rendered its dark wordmark + menu invisibly on `bg-ink` — the bar now goes light over dark
  heroes (`DARK_HERO_ROUTES`), so "close eye" + controls stay legible.

### 2026-07-07 — Module 7.5: Product Completion & Experience Polish (additive)
- No redesign, no changed logic — only completed the missing production experiences,
  reusing the design system.
- **Welcome**: `/welcome` splash (logo · pulse · "Care beyond presence") → 4-screen
  onboarding carousel (swipe, dots, Skip, Get started).
- **Reusable states kit** (`components/ui/`): `EmptyState`, `SuccessState`, `ErrorState`
  (premium `ce-pop`/`ce-fade-in`), `Skeleton*` (shimmer via `.ce-skeleton`), `OfflineBanner`
  (mounted globally). Haptics util (`lib/haptics.ts`).
- **Content & legal**: Help Center (`/help`, FAQ), About (`/about`), Feedback (`/feedback`,
  rating + NPS + bug/idea), Notification Center (`/notifications`, categories · unread ·
  mark-all-read · archive/delete · deep links), and six policy pages (Terms, Refund,
  Cancellation, Consent, Medical Disclaimer, Cookies) via a shared `LegalPage`.
- Footer wired with the new pages + a legal-links row. Animations added to `globals.css`
  as new utilities only (shimmer/fade/pulse/pop), reduced-motion safe.
- App icons / favicon / PWA manifest / SW already existed (verified). Accessibility skip-link
  + focus states already in place.
- **Authentication** (`/auth`, §3): sign in / create account · phone or email · OTP with a
  resend timer · forgot / reset password (show-hide) · Remember-this-device · Face ID &
  Fingerprint · session-timeout state (`?timeout=1`) · device management + multi-device
  sign-in detection + logout · loading / success / error states throughout.
- **Settings** (`/settings`, §11): full account settings — profile · account & security
  (password, biometric, devices) · notifications · language + **dark-mode (prepared)** ·
  emergency contacts · membership & billing · export data · **delete account** (confirm) ·
  privacy/about/help · version.
- **⌘K global search**: a global launcher (`CommandK` in root layout) opens `/search` from
  anywhere, incl. the Presence Console & Operations Admin, which now show a ⌘K hint.
- **Branding audit** (§21): whole-app consistency check — **passes** (0 raw hex/arbitrary
  colours/off-token radii/heavy shadows). Documented in `docs/Branding-Audit.md`.
- **Global search** (`/search`, §10): one search across the whole app — Families,
  Guardians, Companions, Invoices, Visits, Reports, Doctors, Medicines, Memberships,
  Care tickets and Operations — grouped, deep-linked, with AI suggestions and recent
  searches (localStorage). Built from existing data via `lib/global-search.ts`.
- **Permissions** (`/permissions`, §4): graceful, ONE-at-a-time priming — Location,
  Notifications, Camera, Microphone, Photo library, Calendar, Contacts (optional) — each
  explaining WHY, wired to the real browser prompt where one exists, with a friendly
  fallback. Never all requested at once.
- **Loading states** (§6): route-level `loading.tsx` for console (dashboard + family
  detail) and admin (dashboard, finance, insights, bookings) render a calm shimmer
  `PageSkeleton` (`components/ui/page-skeleton.tsx`) — no spinners; the only `animate-spin`
  left are intentional in-button submit spinners.
- **Error states** (§7/§8): warm, never-technical error boundaries — added `error.tsx` for
  console + admin (shared `RouteError` → `ErrorState`, offers *Try again*) plus a root
  `global-error.tsx`; the branded 404 and Family boundary already existed. Success is
  celebrated via `SuccessState` across booking / auth / permissions / feedback.
- **Accessibility** (§14): link `:focus-visible` rings and a `prefers-contrast: more`
  block (stronger hairlines + heavier focus) added to `globals.css`; skip-link, dynamic
  (rem) type, large tap targets and reduced-motion were already in place.
- **Quality check** (§22): automated sweep — **0 user-facing placeholders / Lorem**, **0
  dead (`#`/empty) links**, and every internal + data-driven link resolves to a real route
  (dynamic ids included). No empty cards (warm empty states everywhere), no duplicate
  buttons.
- **Final polish** (§23): gentle `ce-fade-in` entrances on the new standalone pages
  (Settings, Search, Notifications) — Apple-calm, reduced-motion safe. The experience now
  reads as one warm, premium Close Eye end to end.

### 2026-07-07 — Module 07 V2: Executive Intelligence (additive)
- Layered executive dashboards onto `/admin/insights` — **no existing section removed**,
  same design language throughout.
- Added: **Executive KPI strip** (12, scrollable), **Today's top priorities** (5 with
  one-click actions), **Cancellation**, **Revenue**, **Financial health**, **Companion**,
  **Care team**, **Guardian capacity**, **Zone** (city heatmap) and **Growth**
  intelligence, plus **Connected insights** (cross-module correlations).
- Extended AI search (Guardian utilisation · Companion availability · failed payments ·
  pending renewals · open Care Team tickets · which Guardian needs help).
- New: `lib/exec-intel.ts`; `components/insights/{exec-kpi-strip, priority-list, zone-intel,
  exec-dashboards, intel-panel, intel-actions}.tsx`. Reused KpiTile/BarChart/TrendArea/
  InsightBars/AIRecommendationCard — no new design language. Kept CLOza internal; UI stays human.

### 2026-07-07 — Module 07: Intelligence Layer (CLOza)
- The intelligence layer at `/admin/insights` ("Insights") — interprets existing data
  (no new collection, no duplicate dashboards, no duplicate storage).
- **Naming decision**: CLOza is now an INTERNAL engine name only; the UI speaks human —
  Insights · Recommendations · Daily Brief · Wellness Trends.
- Engine `lib/cloza-engine.ts` (pure, deterministic, model-swappable) produces all 5
  pillars: **Wellness trends** (7/30/90), **Relationship insights**, **Care quality**
  coaching, **What's coming** (operational predictions), **Daily brief** (business/ops/
  family/revenue/risk + top recommendations); plus **proactive alerts**, **natural-language
  search**, and the **AI Story Engine** (one visit → Family / Doctor / PM / Founder).
- New components (`components/insights/*`): StatusPill, DailyBrief, WellnessTrends,
  RelationshipInsights, CareQuality, OperationalIntelligence, StoryStudio, InsightSearch.
  Reused AlertCard / AIRecommendationCard / Avatar / tokens — no new design language.
- Docs: cloza-index, intelligence-engine, ai-prompts, prediction-models + ROADMAP.md.

### 2026-07-07 — Module 06: Operations Admin (Founder Operating System)
- The business layer at `/admin` (desktop-first) — Founders / Business Heads / Ops
  Leadership. Distinct from the Presence Console (care ops); cross-links to it.
- **Executive Dashboard**: Financial / Operational / Growth KPI tiles with deltas,
  **Attention Center** (alerts + recommended actions), **Business Assistant** (human
  language), **Business Insights** (revenue by city/service/membership/Guardian/Companion).
- Screens: Operations (+ Cancellation Center), Finance (revenue chart + invoices/refunds/
  payouts/taxes/exports), Booking Analytics, Care Team (verification/performance),
  Families (membership status + bulk actions), Memberships, Coverage, Content, Audit
  Logs, Settings — every nav item real.
- New components (`components/admin/*`): `AdminShell`, `KpiTile`, `BarChart`/`TrendArea`,
  `RevenueChart`, `InsightBars`, `AlertCard`. Reused `OperationsKPICard`,
  `AIRecommendationCard`, `HealthBadge`, `DownloadButton`, `SettingsToggle`.
- Data: `lib/admin-data.ts` (business/finance mock; `fmtINR`; reuses console FAMILIES/
  GUARDIANS). Design system untouched — reused, not redesigned. Docs: new Operations-Admin.md.

### 2026-07-07 — Presence Console V1 · operational completeness
- **Care Team** (Guardians rename): tabs All / Guardians / Companions, role badges,
  Companion skills, and filters (availability · location · experience · name). Companions
  added to the roster; one `GuardianCard` reused.
- **Visit statuses** extended (Scheduled / En route / On site / Rescheduled / Missed …),
  each with a distinct `VisitStatusBadge` — no new colours.
- **Cancellation & reschedule flows** (`lib/visit-ops.ts` + `useVisitOps`): reason-required
  cancel, reschedule with reassignment + availability check, notify family & Guardian,
  calendar/metrics update, history preserved. **Cancelled today / Rescheduled today**
  sections on the live monitor; **live dashboard metrics** (Completed…No-show).
- **Auto-escalation** when a high-priority visit is cancelled; merged into Escalations.
- **Dashboard**: compact Family Health Overview (Reports styling) + live metrics.
- **Calendar** visit-type legend + colours; **Messages** Companions tab + status chips;
  **Reports** → Care Team performance (Guardians + Companions); **Family profile**
  visit-history timeline.
- **Public Companion recruitment**: `/become-a-companion` (Apply → … → Start supporting
  families) + application form + separate applicant store + website footer CTA.
- Design language untouched — extended only. Docs: Presence-Manager updated.

### 2026-07-07 — Module 05: Presence Manager Console
- The operational brain at `/pm` (desktop-first) — not a CRM. `ConsoleShell`:
  sidebar + topbar (global search, notifications, emergency) + contextual banner.
- **Dashboard**: greeting + hero stats + KPI row + **FamilyHealthWidget** (the hero:
  🟢🟡🔴 relationship-health, filter/search/sort, quick actions) + Today's schedule +
  **AI Operations Assistant** (human language) + Recent activity.
- Screens: Families, Family Profile (reuses the Family Space experience components),
  Today's Visits / Live Monitor, Guardians, Escalations, Calendar, Reports, Messages,
  Settings — every nav item real, no dead ends.
- **Connected to the ecosystem**: `useLiveFamilies` reads the same shared stores — a
  completed Guardian visit and a family request surface live in the widget and profile.
- New components (`components/console/*`): FamilyHealthWidget, HealthBadge,
  OperationsKPICard, AIRecommendationCard, GuardianCard, LiveVisitCard, EscalationCard,
  ActivityItem, CalendarCard, ConsoleFamilyProfile. Data: `lib/console-data.ts`.
- Reused the design system entirely — no new colours / type / spacing / motion. Docs:
  new Presence-Manager.md + Component-Library, Design-System, Product-Bible.

### 2026-07-07 — Family Space: the Human Presence Experience (Guardian integration)
- Every completed Guardian visit now becomes a warm family experience across the
  **existing** Family Space screens — no new dashboard, no new nav/colours/type.
- New family components: `AIStoryCard` (hero story · Share · Download PDF),
  `VisitStoryTimeline`/`TimelineEvent` (moment-by-moment), `MomentGallery` (memory book),
  `PhotoGallery` (expand · swipe · download · share), `VoicePlayer` (waveform · speed ·
  transcript placeholder · download), `HealthSnapshot` (reading · status · subtle trend,
  no clinical charts), `WellnessTrendCard`, `FamilyRequestCard`. `VisitExperience`
  orchestrates the report (rich when data exists, existing body otherwise).
- **Family requests** loop: family prepares asks → Guardian sees them on the brief
  (`FamilyRequestsInbox`) → Presence Manager can review. PM card gains **Escalate**.
- Extended the bridge to the **full** report (story, mood, wellness score, scales,
  moments, vitals, media, timings) — `lib/visit-reports.ts` + `lib/family-report.ts`
  (compose + all derivations) + `lib/family-requests.ts`. Wellness scores are
  family-only (Guardians never see a score — the CLOza principle).
- Verified end-to-end: family request → Guardian brief → rich visit capture → full
  Human Presence Experience on the family report + overview. Docs updated
  (Family-Space, Component-Library, Product-Bible, Design-System).

### 2026-07-07 — Guardian → Family media bridge
- A completed Guardian visit now hands the family its real captured media. On
  **Complete visit**, a warm report (summary + photos + voice note) is saved to a
  shared store (`lib/visit-reports.ts`, keyed by the loved one's name).
- Family Space shows the **real** photos + playable voice note in the visit report,
  the overview Latest Update, and the timeline — via `CapturedPhotos` / `CapturedVoice`
  (`components/family/captured-media.tsx`), falling back to placeholders otherwise.
- localStorage is the stand-in shared backend (swap `visit-reports.ts` for an API).
  Verified end-to-end: capture on the Guardian side → view on the Family side.

### 2026-07-07 — Module 04: Guardian App — Functional media capture
- "Add a photo" and "Record a voice note" are now fully functional (were mock).
- New `PhotoCapture`: camera/library, client-side compression, thumbnail previews,
  "N photos attached", live upload progress, remove, retry, lightbox preview.
- New `VoiceRecorder`: mic permission, live timer, pause/resume/stop, playback,
  delete/re-record, upload with progress + graceful offline retry.
- New `lib/guardian-uploads.ts`: attachment types, image compression, blob⇄dataURL,
  and the `uploadBlob` seam (mock now → real Supabase Storage with no UI change).
- Observations model upgraded (`photos: PhotoAttachment[]`, `voiceNote: VoiceAttachment`);
  reducer + **debounced** localStorage persistence so media survives back-nav / offline.
- Continue disabled while uploads run; Review screen shows photo count + voice
  duration with tap-to-preview; family-safe summary now mentions attached photos.

### 2026-07-07 — Module 04: Guardian App — Milestone 2 (Visit Journey)
- The Guardian's full in-visit journey at `/guardian/visits/[id]/visit`: Arrive →
  GPS Check-in → Before You Enter → Start Visit → Care Checklist → Observations →
  Vitals → Complete → Post Visit (10 screens, `features/guardian/steps/*`).
- Offline-first `VisitProvider` (`useReducer` + Context + localStorage auto-save) —
  a visit survives refresh / lock / offline; nothing is ever lost.
- Care Checklist is powered by the CLOza foundation (`lib/cloza.ts`) — structured
  chip observations, warm family-safe summary via `processVisit`, no scores shown.
- 4 new reusable components: `Progress`, `ChecklistItem`, `ObservationCard`,
  `VitalInput`. Vitals appear **only when requested** (auto-derived from the brief).
- Visit Details (Screen 1) enhanced: Today's objective, ETA + directions, call
  family, Begin check-in. Check In tab rebuilt as the journey launchpad.
- Fixed CLOza summary grammar (`joinNaturally` now adds "and"); docs updated
  (Design-System, Component-Library, new Guardian-App.md).

### 2026-07-07 — Module 03: Family Space (Iteration 2 — refinement)
- Unified status system: one `StatusBadge` (all mood/med/visit chips delegate to it).
- New reusable `ActionCard` + `SectionTitle`; Quick Actions upgraded (icon · title · description · arrow · press).
- Presence Manager elevated to the hero trust card (online, response time, next visit, WhatsApp/Call, intro).
- Visits reframed as a `FamilyTimeline` — dated journal of memories (spine, photos, voice, activity chips, follow-ups).
- Family profiles gained personality ("what makes them, them").
- Consistency lock: standardised card radius/border/shadow + hover/press feedback across every screen.

### 2026-07-07 — Module 03: Family Space
- The family's digital home at `/family` (private) with its own app shell (desktop
  sidebar + mobile bottom nav), split from marketing via route groups.
- Screens: Overview, Family members, Visits + premium visit reports, Messages,
  Documents vault, Membership, Profile/Settings — plus error & loading states.
- Signature elements: Today's Status, Latest Update, Trust Score, Emergency sheet,
  friendly notifications. 16 new reusable `components/family/*`.
- Data-driven via `lib/family-data.ts` (backend-swap boundary). Reachable via Sign in.

### 2026-07-07 — Module 02: Booking Experience
- New `/book` flow: 6 steps + reassuring success. Service → Family → Details →
  Date & time → Contact → Review (Presence Manager + payment) → Success.
- Booking state (`useReducer` + Context + localStorage), per-step Zod validation.
- Form primitives (`Field`, `Input`, `Textarea`, `Chip`, `OptionCard`), `Stepper`, `StepScaffold`.
- Loading / error / success states with brand microcopy.
- API placeholder `POST /api/bookings`; WhatsApp confirmation placeholder.
- Primary CTAs across the site routed to `/book`.

### 2026-07-07 — Design Authority v1.0 compliance
- Font → **Manrope** (fallback Inter) via `next/font/google`.
- Name normalised to **Close Eye** everywhere; wordmark updated.
- **Four** buttons (Primary, Secondary, Ghost, Text); radius set 12/20/28/32; 1280px width.
- Colour roles completed (Warning, Error, Disabled added); gold removed earlier.
- Banned words scrubbed ("platform", "world's most").
- WhatsApp number wired (`919000221261`).
- Full `/docs` documentation set created.

### 2026-07-07 — Homepage V2 (rebuild)
- Documented design system + `/design-system` reference page.
- Shorter homepage with layout variety (unified service panel, dark timeline,
  editorial trust split, featured testimonial). Founder story after trust.
- Dedicated `/services`, `/membership`, `/founder`, `/privacy` pages.

### 2026-07-06 — Homepage V1 (initial)
- First Next.js 15 / React 19 build of Close Eye Next: full homepage, design tokens,
  SEO, PWA, deployed to `closeeye-next.vercel.app`.
