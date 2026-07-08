# Close Eye — Full User Journey (build spec)

This is the single source of truth for the whole user journey: entry → Ask →
sign-up → onboarding → payment → confirmation → dashboard. Build it to match the
visual mockups in this folder (listed at the end).

Hand this to Claude Code with: *"Build the full user journey per
FULL_JOURNEY_SPEC.md, matching the mockup HTML files in this folder. Work on a
branch, build in the phases listed, show diffs + screenshots before merging,
don't deploy, and don't change the ask-health triage/red-flag safety logic."*

---

## Principles (read first)

1. **One flow, not three.** NRI, "different city in India", and Ask-only users
   are the SAME product. The only difference is one onboarding question —
   "Where do you live?". Do not build separate flows.
2. **Ask Close Eye is the spine.** It runs through every stage: free hook before
   login, personalised after, offers a doctor when worried, escalates
   emergencies. Every user touches it.
3. **Information is free, action is paid.** Free Ask gives general guidance.
   Paid unlocks personalisation (₹100) and action (₹1,500). The free taste sells
   the service; it never replaces it.
4. **Never trap the user.** Every screen has a way out (back, close, or "later").
5. **Safety is never gated.** Red-flag emergencies escalate and show the
   ambulance number at every tier, including free. Never paywall a crisis.
6. **Brand:** forest #0E2A1F, forest-2 #163b2c, cream #FAF7F2, sage #A8D5B5,
   sage-2 #7FBF94. Font Open Sauce Sans. Write "Close Eye", never "CloseEye".
   Mobile-first. Signature: "Your Trusted Presence in India."

---

## The journey, in order

### 0 · Entry / homepage  → ref `ask-closeeye-hero-cta-mockup.html`
- Hero leads with presence + emotional headline.
- PRIMARY CTA: "Claim your founding spot · Start ₹100" → into sign-up/payment.
- SECONDARY: "Or ask us anything — free" → the Ask box (Tier 0, no login).
- One bold primary, one soft secondary.

### 1 · Try Ask — free, no login  (Tier 0)
- Anyone can ask a health question about a parent. General guidance only (do NOT
  inject parent context — there isn't one yet). Disclaimer always shown.
- Free-question cap applies; on cap, friendly upgrade message, never a hard wall.
- Ends by nudging "Register your parent for answers specific to them" → sign-up.
- Red-flag emergencies still escalate (safety floor), even with no account.

### 2 · Sign up — Continue with Google
- Use `prompt: 'select_account'` so Google always shows the account picker
  (this fixes the "logs back into the same account" bug).
- On sign-out: await `signOut()`, clear cached user/session/localStorage, and
  redirect to a clean state (full reload).

### 3 · Onboarding — 3 short steps  → ref `closeeye-onboarding-flow.html`
- **Exits on every step:** close (X) top-left → dashboard; "Back" between steps
  (keeps typed data); "I'll do this later" at the bottom.
- **Step 1 — About you:** name (required, pre-fill from Google), email
  (pre-filled, read-only), WhatsApp number (required), where you live (optional)
  → **this is the persona branch**, see Personas below.
- **Step 2 — Your parent in India:** their name (required), relationship
  (required chips), city in India (required), phone (optional), age (optional).
- **Step 3 — Confirm:** summary + "what happens next" → Finish.
- Only starred fields required; rest optional. Do NOT collect medical details
  here (added later from the dashboard).
- **"I'll do this later"** → goes to the DASHBOARD (never homepage/auth), which
  shows a "Finish setting up your parent's care" card that RESUMES at the step
  they left, with data preserved.

### 4 · Choose membership → Payment  → ref `closeeye-payment-journey.html`
- Founding Member offer: ₹100, covers the family, unlocks personalised Ask +
  founding status.
- "Become a Founding Member · ₹100" → Razorpay checkout (UPI / card / netbanking).

### 5 · Verify + Activate (server-side — the critical part)
- Activate ONLY after the Razorpay **payment.captured** webhook, verified with
  the HMAC signature. Never activate on the client saying "success".
- **Idempotent activation:** assign founding number, set `is_founding_member` +
  `founding_date` once; a repeated webhook must not double-activate.
- Fire the **WhatsApp welcome** automatically the moment activation succeeds.
- **Fallback alert:** if activation or the welcome fails, ping the team
  instantly so no paying member is ever silently stranded.

### 6 · Confirmation  → ref `closeeye-payment-journey.html`
- "You're a Founding Member" + founding number badge.
- "What happens next" (team reaches out in 24–48h; Ask now personalised;
  WhatsApp reports after each visit).
- Note the WhatsApp welcome was sent. Signature line. → Go to dashboard.

### 7 · Dashboard (shared, persona-flavored)
- Welcome by name. Ask Close Eye (now personalised). Visit updates. Coordinator.
  Membership management.
- If onboarding incomplete → the resume card from step 3.
- Only copy/pricing differ by persona; features are identical.

### 8 · Book a service  → ref `closeeye-booking-journey.html`
From the dashboard, a founding member books care. Membership gets them in;
each visit is paid on-demand, or via the monthly plan.

**Header:** "Care for your parents, whatever the distance" ·
"Prices are the same for everyone. All amounts billed in INR." (USD shown as
reference only — same INR price for all personas.)

**Monthly Companion Plan — ₹1,500/month (≈ $18/mo)** — featured first, badge
"Where most families start":
- A monthly home visit + weekly wellbeing calls
- A WhatsApp report after every visit
- Medicine reminders
- Priority rates on every on-demand service
- CTAs: "Start plan" / "Prefer to talk first? Book a free call"
- This is a Razorpay **subscription** (auto-renew), NOT a one-off charge.

**On-demand ("Or just need something once?"):**
| Service | What it is | Price |
|---|---|---|
| Home visit | ~60-min in-person wellbeing visit + WhatsApp report within the hour | ₹1,000 (≈ $12) |
| Doctor visit support | Companion accompanies them to the doctor, takes notes, reports back | ₹1,500 (≈ $18) |
| Hospital assistance | In-hospital presence and coordination; family updated throughout | ₹2,000–4,000 |
| Grocery & medicine | Collection and delivery with receipt provided | ₹500 (≈ $6) |
| Emergency response | 2-hour rapid visit for a fall, sudden illness, or distress | ₹3,000 (≈ $36) |

**Booking lifecycle (standard services):** service → when (IST date/time + notes)
→ review → pay (Razorpay) → confirmed (booking ref) → visit happens → follow-up
(WhatsApp report + photo, family rates it) → completed. Status:
**requested → paid → assigned → completed**. Reuse `submit-booking-request`.

**Special cases:**
- **Hospital assistance** is a range (₹2,000–4,000): take a deposit or confirm
  the final amount after; do NOT hard-charge a fixed price.
- **Emergency response** SKIPS scheduling — go straight to "Get help now" with
  the call button (+91 90002 21261) and a "request rapid visit" action, and
  alert the care team immediately. Never make an emergency wait behind a form.
- Note: booking may save an **unpaid request** (ops confirm a companion, then
  send a payment link) rather than charging upfront — this is fine and safer
  while supply is thin. Payment (Razorpay) still happens server-verified.

### 9 · Family dashboard — Home & Profile  → ref `closeeye-family-dashboard.html`
The member's home base after they're in. Two tabs in the bottom nav: Home and
Profile (plus Ask and Book shortcuts).

**Home** — built around one question, "How is my parent right now?":
- Greeting + founding badge.
- **Status card (top):** the latest completed visit report at a glance —
  wellbeing flag ("Doing well"), when, photo, a snippet, "View full report".
  If no visit yet → "Your first visit isn't scheduled — book one".
- **Next visit** card (date/time IST) or a prompt to book.
- **Ask Close Eye** — personalised to the registered parent (Tier 1+).
- **Quick actions:** Book a service (→ stage 8), Request a call, Parent's
  profile, Get help now (emergency — call + dispatch, never behind a form).
- **Membership** mini-cards (plan/founding status, visits done / next).

**Profile** — the account hub (this is where "More" used to be):
- Your details: name, WhatsApp, email, **+ Add address**.
- **Family in India:** each loved one as a card (name · relationship · city);
  **+ Add a family member** (relationship, city, phone, age, health notes).
  Health details live HERE, added after onboarding — and they power
  personalised Ask.
- Membership & billing: manage plan, bookings & receipts.
- Settings & support: notifications, contact care team, help, sign out.

**Empty states everywhere:** a brand-new member sees warm prompts (+ Add
address, finish a parent's health profile, book first visit), never blank
cards. Guard against null (no parent / no visits / no plan).

---

## Ask Close Eye tiers (gating)  → ref `ask-closeeye-tiers.html`

| | Tier 0 — Free (no login) | Tier 1 — ₹100 Founding | Tier 2 — ₹1,500/mo Care |
|---|---|---|---|
| Answers | General guidance | **Personalised** to their parent | Personalised |
| Parent context injected | No | Yes | Yes |
| Question cap | Few/month | Higher | Higher |
| Can take action | No | No | **Yes** (send coordinator, set up consult) |
| Ends by offering | Register | Set up care | — |

- Determine tier from membership/plan status in the DB; default Tier 0.
- **Emergencies (Lane 3) always escalate at every tier**, never blocked by cap or tier.
- Cap → friendly upgrade message, never a hard wall.

---

## Personas — the one branch (Step 1 "Where do you live?")
- **Abroad (NRI):** NRI framing, timezone-aware updates, USD shown alongside INR.
- **Another city in India:** "Your eyes in [parent's city] while you're in
  [your city]", INR. Same product.
- **Same city:** lighter, more on-demand framing.
- Persona changes COPY and PRICING display only — not the features or the flow.

---

## Non-negotiable rules
- Do NOT change the `ask-health` triage engine or red-flag safety logic.
- Emergencies are never gated or paywalled, at any tier.
- Payment is verified server-side (webhook + HMAC); activation is idempotent;
  a fallback alert fires if activation/welcome fails.
- Every onboarding screen has an exit; "later" preserves progress.
- Persist partial onboarding data.
- **Guard every screen that depends on prior state.** A user landing directly on
  a later step (refresh, deep link, back button) with no selected service /
  no session must be redirected cleanly, never hit a null-property crash.
- Accessibility: WCAG AA (labels, focus states, 44px tap targets, contrast).

---

## Suggested build order (do in phases, pause for review)
1. **Auth:** `select_account` + clean sign-out (if not already done).
2. **Onboarding:** 3 steps + exits + "later" → dashboard resume + persist data.
3. **Tiering:** Tier 0/1/2 gating in Ask (personalisation + cap + emergency rule).
4. **Payment → activation:** server-verify, idempotent activation, WhatsApp
   welcome, fallback alert; confirmation screen.
5. **Persona copy:** the abroad / different-city / same-city variations.
6. **Dashboard polish:** resume card, persona framing.
7. **Book a service:** monthly plan (Razorpay subscription) + on-demand services
   with the exact pricing in stage 8; emergency bypasses scheduling; hospital
   assistance is a range; null-state guards on every step.
8. **Family dashboard:** Home (status / next visit / Ask / quick actions /
   membership) + Profile (your details + address, family members + health
   details, billing, settings, sign out). Empty states + null guards.

---

## Visual references (files in this folder)
- `ask-closeeye-hero-cta-mockup.html` — homepage hero + Ask secondary CTA
- `closeeye-onboarding-flow.html` — 3-step onboarding with exits
- `closeeye-payment-journey.html` — founding membership payment → confirmation
- `closeeye-booking-journey.html` — booking a service → follow-up → complete
- `closeeye-family-dashboard.html` — family dashboard: Home + Profile
- `ask-closeeye-tiers.html` — the free / ₹100 / ₹1,500 ladder
- `closeeye-user-flow.html` — the one-flow / three-persona overview
