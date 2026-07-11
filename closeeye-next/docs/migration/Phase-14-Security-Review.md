# Phase 14 — Security Review

Read-only audit of the full stack: the V2 frontend (`closeeye-next/`) + the production
backend (`src/`, `supabase/`). No live access, no secret values printed. Extends the Module 8
frontend audit to the backend.

## Scorecard

| Area | Score | Verdict |
|---|--:|---|
| Secrets & env handling | 95 | Server secrets via `Deno.env` (152 uses); client has only the public anon key. **No hardcoded secrets in app code.** |
| Payments security | 95 | Razorpay **webhook + verify** use HMAC-SHA256 signature checks. |
| Transport & headers | 95 | CSP, HSTS, X-Frame/Content-Type, Permissions-Policy (fixed), `upgrade-insecure-requests`; **npm audit 0 vulns**. |
| RLS / data access | 90 | 95 policies across 31 tables + 32 storage policies. |
| XSS / CSRF / Injection | 90 | React escapes; only JSON-LD `dangerouslySetInnerHTML` (safe); JWT-in-header (CSRF-resistant); parameterized Supabase queries. |
| Auth / JWT | 82 | Per-function `verify_jwt`; **V2 server-side RBAC not yet wired** (client-routing only). |
| Encryption at rest (PII/medical) | 75 | TLS in transit ✅; column-level encryption for medical/PII recommended. |
| Rate limiting | 65 | Public endpoints lack visible throttling. |
| **Overall** | **≈ 87** | Strong; four itemised gaps to close on staging before cutover. |

## What's strong (verified)

- **No secret leakage.** The two automated "smells" were **false alarms** — the hardcoded-key
  match was a `zod` test fixture and all `service_role` refs were `@supabase/auth-js` type
  defs, both in `node_modules`. Close Eye's own `src/` client contains **zero** service-role
  or live-key literals. Server secrets are read from `Deno.env` only.
- **Payment integrity.** `razorpay-webhook`, `razorpay-verify-payment`, `razorpay-verify-
  membership` all compute and compare an **HMAC-SHA256 signature** — a forged webhook/response
  is rejected. This is the single most important payment control and it's present.
- **Function auth is deliberate.** `verify_jwt` is `true` on mutations (e.g.
  `update-booking-status`) and `false` only on webhooks/cron/public intake (which are gated by
  signature or are intentionally public) — a sensible split, not an oversight.
- **RLS everywhere.** 31 tables with RLS on, 95 policies, 32 storage policies — data is
  row-scoped by role at the database, not just the app.
- **Frontend hardening** (Module 8) carries into V2: CSP, HSTS, no powered-by, 0 dependency
  vulnerabilities.

## Gaps to close on staging (prioritised)

1. **Server-side RBAC in V2 (highest).** Roles are enforced by routing today. Before real
   users, add Supabase-Auth session checks + a `middleware.ts` guard so a Family JWT can't
   reach `/admin` or `/pm` routes/data. RLS is the backstop, but the app must enforce too.
2. **Rate limiting on public endpoints.** `submit-booking-request`, `waitlist-signup`,
   `ask-health-public` run without JWT. Add per-IP/e.164 throttling (Upstash/edge) + a
   lightweight bot check to prevent abuse/spam.
3. **CORS tightening.** 6 of 28 functions send `Access-Control-Allow-Origin: *`. Fine for
   truly public ones; for authenticated functions, restrict to the known app origins
   (`closeeye.in`, `staging.closeeye.in`, the app scheme).
4. **PII / medical encryption at rest.** Visit notes, vitals and contact PII are sensitive.
   Add column-level encryption (pgcrypto / Supabase Vault) for the most sensitive fields;
   TLS already protects transit (HSTS + `upgrade-insecure-requests`).

## Verify on staging (not confirmable from code alone)

- `jwt_expiry` / refresh-rotation in `supabase/config.toml [auth]` are sane.
- Storage `file_size_limit` + MIME allowlist enforce upload validation server-side (client
  already compresses + accepts `image/*`).
- **RLS recursion re-check** — the historical `bookings ↔ loved_ones` infinite recursion;
  confirm no self-triggering policy remains (95 policies is a lot of surface).
- Session expiry + "remember me" behave correctly (V2 has the timeout UI; confirm token TTL).

## Injection / file-upload / session (assessment)

- **SQL/NoSQL injection:** the Supabase client parameterizes; no string-built SQL seen in
  functions. Low risk. Keep zod validation on every intake (booking schema already does).
- **File uploads:** client compresses + restricts to images; enforce server-side size/MIME via
  storage policies (gap #4-adjacent).
- **Session expiry:** JWT-based with refresh; V2 ships a session-timeout state.

---

**Bottom line:** the production backend is **security-solid** (signed webhooks, pervasive RLS,
clean secret handling) and the V2 frontend inherits Module 8's hardening. The one thing that
**must** land before real customer data flows is **server-side RBAC in V2**; rate limiting,
CORS tightening and PII-at-rest encryption are important follow-ups — all to be done and
verified on **staging**, never on production.
