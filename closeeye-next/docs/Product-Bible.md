# Close Eye — Product Bible

The product truths every module inherits. When in doubt, this decides.

## Mission

Build the most trusted human presence for families — so no family faces life's
important moments alone.

## What we are / are not

**We are** a Trusted Human Presence Company. **We are not** a healthcare marketplace,
an app, a booking portal, an insurance site, or an elder-care directory. The product
is trust; technology only enables it.

## Who we serve

Families living away from the people they love — often adult children abroad, and
their parents and grandparents in India. The buyer is usually the distant child; the
person cared for is the parent. Copy centres the parent's **dignity**, not the child's absence.

## The three services (only three)

1. **Home Wellbeing Visit** — a warm in-person check-in at home, with a same-day update. From ₹1,000.
2. **Hospital Companion** — someone beside them through admission, appointments, recovery. From ₹2,000.
3. **Custom Request** — groceries, medicines, festival visits, anything the family needs. From ₹500.

## The people

- **Guardian** — the verified, trained person who physically visits.
- **Presence Manager** — one dedicated human who coordinates everything and is the family's single point of contact.
- **Family** — the customer (never called "customer").

## Promises

Verified Guardians · a dedicated Presence Manager · WhatsApp updates · visit reports ·
privacy · human support. These come with **every** visit — no tiers, no fine print.

## Channels this brand must scale to

Website, PWA, Booking Flow, **Family Space**, Guardian App, Presence Manager Portal,
Admin Portal — plus WhatsApp, social, pitch deck, and print. All inherit the one
design language ([Brand-Guidelines](./Brand-Guidelines.md)).

## Family Space

The family's digital home ([Family-Space](./Family-Space.md)) — where the buyer (the
distant adult child) sees that their parents are okay: today's status, visit reports,
messages with their Presence Manager, documents, membership, and a relationship
**Trust Score**. It exists to reduce anxiety and strengthen family bonds, never to
feel like a dashboard or hospital software.

## The presence loop (Guardian ⇄ Family)

The product's core loop connects the Guardian's care to the family's peace of mind:

1. The **family** prepares gentle requests before a visit (`lib/family-requests.ts`).
2. The **Guardian** sees them on the visit brief, then captures the visit through the
   CLOza flow — mood, moments, vitals, photos, a voice note (Module 4).
3. On **Complete visit**, a warm, human report is composed (`lib/family-report.ts`) and
   written to the shared store (`lib/visit-reports.ts`).
4. **Family Space** turns it into the Human Presence Experience — an AI visit story, a
   moment-by-moment timeline, a memory book, health snapshot and wellness trend, photos
   and voice — surfaced by enhancing the **existing** screens.

5. The **Presence Manager** oversees it all from the Console (`/console`) — the
   operational brain. The Family Health Widget answers "who needs attention?" in five
   seconds; completed visits and family requests surface live via the same shared stores.

**Data & backend.** The shared stores (`visit-reports`, `family-requests`) and Guardian
media (`guardian-uploads`) are localStorage stands-in for the shared Supabase backend —
the single swap boundary. Wire them to the existing visit / upload tables (reuse auth,
no duplicate tables, normalized data) and every screen keeps working. Wellness scores
are computed for the **family only**; Guardians never see a score (the CLOza principle).

**Three personas, one product.** Family Space (the distant child), the Guardian App
(the caregiver on the ground) and the Presence Console (the operational brain) are the
same ecosystem — one design system, shared data, shared components. See
[Family-Space](./Family-Space.md), [Guardian-App](./Guardian-App.md) and
[Presence-Manager](./Presence-Manager.md).

## Non-negotiable

Every screen must raise the answer to one question: *"Would I trust these people
with my own parents?"* If a section doesn't, it's removed or redesigned.
