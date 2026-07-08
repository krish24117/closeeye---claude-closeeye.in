# Phase 1 — Environment & Infrastructure Review

**Scope:** an inventory of the *real* Close Eye production services, read from code —
`src/` + `supabase/` (the live `closeeye.in`). No production contact, no secret values
(only the *names* of env vars/secrets). This is the baseline the V2 app (`closeeye-next/`)
must reuse — never duplicate, never recreate.

> **State check.** `closeeye-next/` (V2) is currently a **localStorage prototype** — none
> of the services below are wired to it yet. "Integrate production services" therefore means
> connecting V2 to this existing backend, validated on **staging only**, with no change to
> production until Product Director approval.

---

## 1. Database — Supabase (Postgres)

- **Project ref:** `kghwmiriboavmyswcqnr` (public identifier; the anon/service keys are secrets, not stored here). Linked in `supabase/config.toml` + `supabase/.temp/linked-project.json`.
- **Migrations:** **51** versioned SQL files in `supabase/migrations/` — this is the source of truth for the schema; **reuse as-is**.
- **Tables (24):**
  `booking_requests`, `booking_status_history`, `care_flags`, `companion_applications`,
  `companion_locations`, `consult_requests`, `consultation_requests`, `custom_care_requests`,
  `doctors`, `elder_profiles`, `family_members`, `health_tips`, `leads`, `member_queries`,
  `memberships`, `payments`, `questions_log`, `society_members`, `subscriptions`,
  `survey_responses`, `visits`, `vitals`, `waitlist_emails`, `whatsapp_messages`.
- **Detailed RLS/index/FK/trigger review → Phase 3.**

## 2. Authentication — Supabase Auth

- Client in `src/lib/supabase.ts`; session/role handling in `src/lib/auth-context.tsx`.
- Roles observed across the app: Family, Guardian/Companion, Presence Manager, Operations,
  Super Admin (admin sub-roles are app-layer). **Reuse — existing users must never re-register.**
- Config in `supabase/config.toml` (`[auth]` — JWT expiry, signup, providers).
- **Google OAuth: previously removed twice** (PKCE verifier errors) — do not re-add casually.

## 3. Storage — Supabase Storage (5 buckets)

`elder-photos`, `visit-photos`, `visit_reports`, `companion-photos`, `companion-documents`.
Upload/download/preview/delete + bucket policies → verified in Phase 9.

## 4. Payments — Razorpay (fully built)

Edge Functions: `razorpay-create-order`, `razorpay-create-membership`,
`razorpay-create-subscription`, `razorpay-manage-subscription`, `razorpay-verify-payment`,
`razorpay-verify-membership`, `razorpay-webhook`; plus `create-booking-payment-order`,
`confirm-booking-and-send-payment`. Client: `src/lib/razorpay.ts`.
**Secrets:** `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`.

## 5. WhatsApp — via Twilio WhatsApp Business

Edge Functions: `admin-send-whatsapp`, `send-visit-whatsapp`, `send-whatsapp-test`,
`confirm-booking-and-send-payment`; delivery logged to the `whatsapp_messages` table.
**Secrets:** `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM`,
`TWILIO_WHATSAPP_TEMPLATE_SID`, and templates `TWILIO_TEMPLATE_FOUNDING_WELCOME`,
`TWILIO_TEMPLATE_PAYMENT_RECEIVED`, `TWILIO_TEMPLATE_VISIT_CONFIRMED`. Routing numbers:
`ADMIN_WHATSAPP`, `CARE_TEAM_WHATSAPP`, `CLOSEEYE_AMBULANCE_NUMBER`.

## 6. Email — Resend

Used across booking/payment/summary functions. **Secrets:** `RESEND_API_KEY`, `RESEND_FROM_EMAIL`.

## 7. SMS — Twilio

Same Twilio account as WhatsApp (`TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN`); SMS templates
for OTP/booking/payment/guardian-arrival.

## 8. Maps — Google Maps

Client: `@react-google-maps/api`; used for navigation/tracking/ETA (`companion_locations`
table + `src/lib/useGeolocation.ts`). **Secret:** `GOOGLE_MAPS_API_KEY` (+ a client key).

## 9. Push Notifications

`src/lib/push-notifications.ts` (client) with FCM/Firebase references. **No server-side FCM
dispatch is present in the Edge Functions** — server push is not yet wired. Aligns with the
mobile module's finding (FCM/APNS = prepared, needs credentials). → Phase 10.

## 10. AI / Intelligence — Anthropic (Claude)

Edge Functions `ask-health`, `ask-health-public`, `care-intelligence-scan`.
**Secrets:** `ANTHROPIC_API_KEY`, `CLOSEEYE_CLASSIFIER_MODEL`, `CLOSEEYE_INFORM_MODEL`,
`CLOSEEYE_SERVICE_MODEL`, `CLOSEEYE_SCAN_WINDOW_DAYS`, `CLOSEEYE_CLUSTER_THRESHOLD`.

## 11. Scheduled jobs (Edge Functions on cron)

`check-overdue-bookings`, `send-visit-reminder`, `send-monthly-summary`, `sla-escalation`,
`send-sos-alert` — operational automations already running in production.

## 12. Analytics / Logging / Monitoring

- **Analytics:** Mixpanel + PostHog + Vercel Analytics references in code (thin — to consolidate in Phase 12).
- **Monitoring:** **Sentry** references present (crash/error). Supabase provides DB/API logs.
- Other shared secret: `APP_URL`, `BROADCAST_SECRET`.

---

## Env / secret map (names only — values live in Supabase + Vercel, never here)

| Group | Server secrets (Supabase Edge Function env) | Client env (build-time) |
|---|---|---|
| Supabase | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | `*_SUPABASE_URL`, `*_SUPABASE_ANON_KEY` |
| Razorpay | `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` | `*_RAZORPAY_KEY_ID` |
| Twilio (WhatsApp+SMS) | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM`, `TWILIO_*_TEMPLATE*` | — |
| Email | `RESEND_API_KEY`, `RESEND_FROM_EMAIL` | — |
| Maps | `GOOGLE_MAPS_API_KEY` | `*_GOOGLE_MAPS_API_KEY` |
| AI | `ANTHROPIC_API_KEY`, `CLOSEEYE_*_MODEL` | — |
| Routing | `ADMIN_WHATSAPP`, `CARE_TEAM_WHATSAPP`, `CLOSEEYE_AMBULANCE_NUMBER`, `APP_URL`, `BROADCAST_SECRET` | — |

**Staging must use a separate set of these** (test Razorpay keys, a Twilio sandbox / test
number, a Resend test sender) — never the live values. Detailed in Phase 2.

---

## Key findings for the migration

1. The backend is **mature and reusable** — 51 migrations, ~40 Edge Functions, real payments,
   messaging and automations. V2 should **consume** it, not rebuild it.
2. **WhatsApp + SMS are both Twilio** (not a direct Meta WhatsApp API) — one integration.
3. **Server push (FCM) is not wired** — the one genuinely new backend piece (Phase 10).
4. V2 is a **prototype**: each localStorage store in `closeeye-next/lib/*` is the seam that
   maps onto a table/edge-function above (the mapping is Phase 4–13).
5. **Everything credentialed (keys, DNS, live tests) is yours to run on staging** — this doc
   contains **zero secret values**, only names.
