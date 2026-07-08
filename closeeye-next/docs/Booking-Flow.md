# Close Eye — Booking Flow (Module 02)

**Objective:** the most *trustworthy* booking experience, not the fastest. Reduce
anxiety. Every screen should make the visitor feel *"I know exactly what happens next."*
User goal: book a trusted visit in under two minutes.

Route: **`/book`**. Everything inherits the Design System — no new colours, type,
spacing, buttons or cards.

## The steps

| # | Step | Component | Collects |
|---|---|---|---|
| 1 | Choose visit | `service-step` | One of three services (Home Wellbeing / Hospital Companion / Custom) |
| 2 | Who needs support | `family-step` | Relationship, name, age, city, address, notes |
| 3 | Tell us more | `purpose-step` | Purpose + free-text details |
| 4 | Date & time | `schedule-step` | Date + slot (Morning/Afternoon/Evening; Emergency only for eligible services) |
| 5 | Contact | `contact-step` | Your name, phone, WhatsApp, email, preferred channel |
| 6 | Review | `review-step` | Order summary + **Presence Manager** section + payment method → Confirm |
| — | Success | `success-step` | *"You're not alone anymore."* + reference + next steps |

Only three services ever exist. The **Presence Manager** reassurance is shown
**before** payment — it is the trust anchor of the flow.

## State

`BookingProvider` (`state.tsx`) — a `useReducer` store with `{ step, data, status, ref }`,
persisted to `localStorage` (`ce_booking_v1`, data only; cleared on success). Progress
survives a refresh. `useBooking()` exposes `next/back/goto/patch/setStatus/submitted/reset`.

## Validation

Zod schemas in `schema.ts`, one per step (`serviceSchema`, `lovedOneSchema`,
`purposeSchema`, `scheduleSchema`, `contactSchema`) merged into `bookingSchema`.
Each step validates on **Continue**; errors render inline via `Field`.

## Payment

Placeholder chooser: **UPI · Card · Net Banking · Wallet**. International cards
marked "coming soon". Pricing is transparent (starting price + 18% GST + estimated
total, "no hidden charges"). No real gateway is wired yet — see integration points.

## States

- **Loading** (on confirm): spinner + rotating messages ("Preparing your booking…",
  "Finding the right Guardian…", "Assigning your Presence Manager…"), min 2s so it's felt.
- **Error:** warm copy + Try again + Call us / WhatsApp us.
- **Success:** reassurance, booking reference, 3-step "what happens next", Track/WhatsApp/Home.

## Integration points (backend TODO)

1. **`POST /api/bookings`** (`app/api/bookings/route.ts`) — validates payload, returns a
   reference. TODO: persist to DB, assign a Presence Manager, enqueue WhatsApp.
2. **`submitBooking()`** (`api.ts`) — client → the route above.
3. **WhatsApp flow** (`whatsappConfirmationLink`, and the real edge function) — immediately
   after booking, send: (1) confirmation, (2) Presence Manager introduction, (3) expected
   timeline, (4) emergency contact. Until wired, we open a prefilled `wa.me` deep link.
4. **Payment** — swap the placeholder chooser for the real UPI/card gateway.

## Microcopy

Follows [Writing](./Writing.md): Continue (not Submit), Booking (not Order), Family
(not Customer), Visit (not Task). Success is *"You're not alone anymore."*, never
"Booking Successful".
