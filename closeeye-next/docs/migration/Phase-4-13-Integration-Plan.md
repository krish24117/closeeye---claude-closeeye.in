# Phases 4–13 — Service Integration Plan

How V2 (`closeeye-next/`) connects to the **existing** backend. This is the wiring **plan**
— what maps to what, in what order, verified on **staging only**. No credentialed calls are
made here; the actual wiring is executed on staging after approval.

## Principle — the stores are the seam

V2 already isolates persistence behind a handful of modules. Wiring = introduce **one**
Supabase data layer (`lib/supabase.ts`) and replace each store's read/write with a Supabase
query or an Edge Function call. UI, routes and design are untouched.

## Master mapping (V2 module → real backend)

| V2 module (today: mock/localStorage) | Real table(s) | Real Edge Function(s) / bucket |
|---|---|---|
| `app/auth/*` (mock UI) | `profiles`, roles | Supabase Auth (GoTrue) |
| `lib/family-requests.ts` | `booking_requests`, `booking_status_history` | `submit-booking-request` |
| `features/booking` + `app/api/bookings` | `booking_requests`, `payments` | `create-booking-payment-order`, `razorpay-create-order`, `razorpay-verify-payment`, `razorpay-webhook` |
| `lib/visit-ops.ts` | `visits`, `booking_status_history` | `send-visit-reminder`, `check-overdue-bookings`, `sla-escalation` |
| `lib/visit-reports.ts` | `visit_reports`, `vitals`, `care_flags` | `send-visit-whatsapp`, `send-monthly-summary`; buckets `visit-photos`, `visit_reports` |
| `lib/guardian-uploads.ts` | — | buckets `visit-photos`, `companion-photos` |
| `lib/companion-applicants.ts` | `companion_applications` | — |
| `lib/console-data.ts` / `admin-data.ts` | `visits`, `bookings`, `memberships`, `payments`, `companions`, `companion_locations` | dashboards read via RLS |
| `lib/family-data.ts` / `guardian-data.ts` | `elder_profiles`, `family_members`, `visits`, `visit_reports` | — |
| membership | `memberships`, `subscriptions` | `razorpay-create-membership`, `-create-subscription`, `-verify-membership`, `-manage-subscription` |

---

## Phase 4 — Authentication (reuse Supabase Auth)

- Add `lib/supabase.ts` (browser client, anon key) + a session provider mirroring
  `src/lib/auth-context.tsx` roles: Family, Guardian/Companion, Presence Manager, Operations,
  Super Admin.
- **Existing users log in unchanged** — same GoTrue users, same JWT. No re-registration.
- Session persistence via the client's storage; on native, back it with `secureStore`
  (`lib/native.ts` → Keychain/EncryptedSharedPreferences) for "Remember me" + biometric unlock.
- OTP: reuse the existing phone/WhatsApp OTP path (Twilio); the V2 `/auth` OTP screen calls it.
- Gate routes by role (add server/middleware checks — the audit's #1 backend task).
- **Staging check:** log in as each role with a real staging user; confirm the right dashboard.

## Phase 5 — Payments (reuse Razorpay)

- Booking pay: `features/booking` → `create-booking-payment-order` → Razorpay Checkout →
  `razorpay-verify-payment`; webhook `razorpay-webhook` writes `payments`.
- Membership/subscription: the `razorpay-create-membership/-subscription/-verify/-manage`
  functions; renewal + refund + failure paths already exist.
- V2 replaces the **mock** `app/api/bookings` with calls to these functions.
- **Staging = Razorpay TEST keys only.** Verify: purchase, booking pay, renewal, refund,
  failure, webhook receipt, invoice/receipt. Never touch live payments.

## Phase 6 — WhatsApp (reuse Twilio)

- Triggers already server-side: booking confirmation, guardian/companion assignment, visit
  reminder/completion, membership reminder, emergency (SOS), support. Logged to
  `whatsapp_messages`.
- V2 just invokes the same functions (`send-visit-whatsapp`, `admin-send-whatsapp`, …) at the
  same lifecycle points. Templates + retry/logging already exist.
- **Staging:** Twilio sandbox / test number; verify each template + the `whatsapp_messages` log.

## Phase 7 — Email (reuse Resend)

- Welcome, OTP, booking, payment, invoice, visit report, membership, support, password reset —
  routed through the functions that already call Resend.
- **Staging:** `RESEND_*` test sender; verify deliverability + templates.

## Phase 8 — SMS (reuse Twilio)

- OTP, emergency, booking, payment, guardian-arrival via the same Twilio account/templates.
- **Staging:** Twilio test credentials; verify each.

## Phase 9 — Storage (reuse Supabase Storage)

- Buckets: `elder-photos`, `visit-photos`, `visit_reports`, `companion-photos`,
  `companion-documents` (32 policies already).
- Wire `guardian-uploads.ts` + document/report flows to `supabase.storage.from(bucket)`:
  upload (with client compression — already in V2), download, preview, delete, all under RLS.
- **Staging:** upload/download/delete as each role; confirm a Family can't read another
  family's objects.

## Phase 10 — Push notifications (the one NEW piece)

- **Not wired server-side today.** Add an FCM/APNS dispatch Edge Function + a `device_tokens`
  table (register on login; the mobile module already prepares the client registration).
- Route existing events (visit assigned/completed, report ready, emergency, membership,
  booking, payment) to push in addition to WhatsApp.
- **Staging:** FCM/APNS **test** projects; send each event type to a test device.

## Phase 11 — Maps (reuse Google Maps)

- Reuse `@react-google-maps/api` + `companion_locations` for guardian tracking, ETA,
  distance, directions; V2 `useGeolocation` mirrors `src/lib/useGeolocation.ts`.
- **Staging:** a **referrer-restricted** browser key (staging domain); verify tracking + ETA.

## Phase 12 — Analytics

- Consolidate to one client `track(event, props)` shim wired to the existing provider
  (PostHog/Mixpanel/Vercel). Events (already named in the mobile module): signup, login,
  booking, payment, guardian/companion assigned, visit completed, membership, renewal,
  cancellation, refund, support request.
- **Staging:** a separate analytics project so staging traffic never pollutes prod metrics.

## Phase 13 — Monitoring

- Sentry (already referenced) for crash/error on web + native; Supabase dashboards for
  DB/API logs; health-check endpoint + uptime monitor; error alerts → Slack.
- **Staging:** a separate Sentry environment tag (`staging`).

---

## Suggested wiring order (dependency-first)

1. **Auth + Supabase client** (everything else needs a session).
2. **Storage** + **read paths** (dashboards render real data).
3. **Booking → Payments** (the revenue path; Razorpay test).
4. **Messaging** (WhatsApp/Email/SMS) at the lifecycle hooks.
5. **Maps**, **Analytics**, **Monitoring**.
6. **Push** (new build) last.

Each step: wire on a branch → deploy to `staging.closeeye.in` → verify with the per-phase
check above → only then move on. **No production contact at any point.**

## Honest scope note

This document is the plan. The wiring itself is a real engineering effort (introduce the
Supabase client, replace ~9 store modules, invoke the Edge Functions) done **on staging with
staging/test credentials you hold** — not in this environment, and never against production
until Phase 16 cutover + Product Director approval.
