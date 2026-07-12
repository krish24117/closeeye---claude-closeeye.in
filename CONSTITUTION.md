# The Close Eye Constitution

> **Status: DRAFT** — becomes canonical on the founder's review & sign-off (2026-07-12).
>
> The single source of truth for building Close Eye. This is an **entry point**: it
> states the non-negotiables and links to the detailed governance in
> [`closeeye-next/docs/`](closeeye-next/docs/) rather than duplicating it, so the two
> can never drift apart.

---

## 0 · Purpose & Precedence

This document consolidates the product truths, design authority, architecture, locked
decisions, and working rules into one front door. When two sources disagree, resolve in
this order:

1. The founder's direct, current instruction.
2. **This Constitution.**
3. The [`closeeye-next/docs/`](closeeye-next/docs/) corpus — Product-Bible, Design-System, Brand-Guidelines, Decision-Log, and the rest.
4. The code as it currently stands.

The Constitution changes **only** with the founder's explicit sign-off. Every material
decision is appended to the [Decision-Log](closeeye-next/docs/Decision-Log.md); history
is never rewritten.

---

## 1 · What Close Eye Is / Is Not

Close Eye is a **Trusted Human Presence** company — so no family faces life's important
moments alone. It is **not** a healthcare marketplace, a booking portal, an insurance
site, an elder-care directory, or "an app." The product is trust; technology only
enables it.
_Source: [Product-Bible](closeeye-next/docs/Product-Bible.md)._

---

## 2 · Product Truths

- **Mission** — the most trusted human presence for the families we serve.
- **Who we serve** — families living away from the people they love, usually an adult
  child abroad buying for a parent in India. Copy centres the **parent's dignity**,
  never the child's absence.
- **The three services (only three)** — Home Wellbeing Visit · Hospital Companion ·
  Custom Request.
- **The people** — **Guardian** (the verified, trained person who visits) ·
  **Presence Manager** (one dedicated human, the family's single point of contact) ·
  **Family** (the customer — never called "customer").
- **Universal promises** — verified Guardians, a dedicated Presence Manager, WhatsApp
  updates, visit reports, privacy, human support. These come with **every** visit —
  no tiers, no fine print.

---

## 3 · Design Authority

- **Name** — "Close Eye", two words, always.
- **Type** — Manrope (fallback Inter). No other display face in `closeeye-next`.
- **Logo** — the official mark + wordmark system; never reconstructed ad hoc.
- **Buttons** — exactly four: Primary, Secondary, Ghost, Text.
- **Colour** — only the semantic tokens (ink, green, accent, ivory, card, line, muted,
  success / warning / error). No ad-hoc greens. No gold.
- **Space** — 8-point grid. **Radius** — 12 / 20 / 28 / 32.
- **Voice** — "emotion without guilt"; observe the banned-words list.

_Detail: [Design-System](closeeye-next/docs/Design-System.md) ·
[Brand-Guidelines](closeeye-next/docs/Brand-Guidelines.md) ·
[Colour-System](closeeye-next/docs/Colour-System.md) ·
[Typography](closeeye-next/docs/Typography.md) ·
[Writing](closeeye-next/docs/Writing.md)._

---

## 4 · Architecture Truths

- **One product, one domain.** The web app is production at **closeeye.in** (canonical
  origin `www.closeeye.in`). Role → workspace — Family Space, Guardian App, PM Console,
  Admin / Founder OS — one app, never parallel apps.
- **Stack** — Next.js 15 (App Router, React 19, TypeScript strict, Tailwind,
  **light-only**) in `closeeye-next/`; **Supabase** backend (auth, Postgres + RLS,
  storage, edge functions); Razorpay payments.
- **Auth** — Google + password. No magic-link / email-OTP for families.
- **Mobile** — one codebase. The native apps are a **remote shell** (Capacitor) that
  loads the live site; rebuild the native app **only** for a store release (a `v*` tag).
  Android + iOS both build green in CI.
- **Deploy** — `git push origin main` → Vercel auto-deploys `closeeye-next` →
  closeeye.in. Production DB migrations and edge-function deploys are run by the founder
  via CLI.

---

## 5 · Locked Decisions

Frozen unless the founder reopens them:

- **Membership pricing** — Connect ₹500 · Care ₹1,500. Clean rounded pricing only.
- **Auth** — Google + password; no magic-link (see §4).
- **Dashboard lifecycle states** — fixed; do not redesign or "optimise" them.
- **Scope** — the parked backlog is not built proactively.

_Full history: [Decision-Log](closeeye-next/docs/Decision-Log.md)._

---

## 6 · Working Protocol

- **Machines** — Windows is the **primary development machine** (code, web build, tests,
  commits, CI). The Mac is a **dedicated iOS build / Simulator / App Store signing
  machine only** — don't switch to it unless the task truly needs it.
- **Every feature, in order:**
  1. **Explain the plan.**
  2. **Wait for the founder's approval.**
  3. Implement.
  4. Run tests.
  5. Commit to Git.
- **Never change business logic without asking first** — pricing, booking rules, auth /
  session flows, data model / RLS, membership, red-flag / crisis logic, payments.
  Config, CI, infrastructure, and copy still follow the five steps but are lower-risk.

---

## 7 · Change Control

- Amend this Constitution only with the founder's explicit sign-off.
- Record every material product / design / architecture decision in the
  [Decision-Log](closeeye-next/docs/Decision-Log.md).
- When the Constitution and reality diverge, fix reality **or** update the Constitution
  — never let them silently disagree.
