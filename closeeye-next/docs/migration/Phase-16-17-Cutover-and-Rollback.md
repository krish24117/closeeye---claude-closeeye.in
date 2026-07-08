# Phases 16 & 17 — Cutover Strategy + Rollback Plan

**Golden rule:** production is never *replaced* — it is **swapped**, and the previous version
stays live and promotable the whole time. Nothing proceeds without **Product Director
approval**. No customer data is migrated or lost.

## Why this cutover is low-risk: blue-green on a shared database

Two frontends, one backend:

```
                 ┌─ closeeye.in ─┐
   Supabase  ◀───┤   (domain)    ├───▶  BLUE  = current Vite app (prod project)   [live]
   (shared)      └───────────────┘      GREEN = V2 Next app (closeeye-next project) [staged]
```

- Both apps talk to the **same** Supabase (`kghwmiriboavmyswcqnr`), reusing the schema.
- Cutover = **re-point the `closeeye.in` domain** from BLUE to GREEN in Vercel.
- Rollback = re-point back to BLUE. **Seconds, not a migration.**
- Sessions survive: same Supabase Auth → the same JWT works in both apps (no forced logout).
- **Pre-condition:** any V2 migrations are **additive + backward-compatible**, applied *before*
  the swap and verified that BLUE still works — so a rollback never leaves BLUE broken.

## Cutover runbook (Phase 16) — do in order, stop on any ❌

| # | Step | How | Abort if |
|---|---|---|---|
| 1 | **Complete QA** | Full pass of `mobile-testing.md` + role tests on `staging.closeeye.in` | any critical/❌ |
| 2 | **Backup production (app)** | Vercel keeps every prior deployment — note the current BLUE deployment ID as the rollback target | — |
| 3 | **Backup database** | Supabase → **PITR checkpoint** + on-demand snapshot; record timestamp | snapshot fails |
| 4 | **Apply V2 migrations** (if any) | Additive only, on prod DB, tested on staging first; verify **BLUE still works** afterwards | BLUE breaks → down-migrate |
| 5 | **Verify staging** | Smoke test payments (test), auth (all roles), WhatsApp, storage, push on staging | any ❌ |
| 6 | **🔒 Product Director approval** | Explicit written go/no-go | no-go → stop |
| 7 | **Switch production** | Vercel: move the `closeeye.in` domain from BLUE → **GREEN** (closeeye-next project). BLUE stays deployed | — |
| 8 | **Monitor logs** | Sentry + Supabase logs + Vercel; watch error rate for 30–60 min | error spike |
| 9 | **Verify payments** | One **live** low-value transaction end-to-end + webhook receipt in `payments` | mismatch |
| 10 | **Verify authentication** | Log in as each role; confirm existing users unaffected, no re-register | login fails |
| 11 | **Verify WhatsApp** | Trigger a real booking/visit message; confirm delivery + `whatsapp_messages` log | not delivered |
| 12 | **Verify notifications** | Email (Resend) + push (FCM/APNS) for a live event | not delivered |
| — | **Rollback if necessary** | See below — any ❌ above triggers it | — |

**Cutover window:** low-traffic slot; keep the team + Presence Managers on standby.

## Rollback plan (Phase 17)

Trigger: any abort above, an error-rate spike, or a payment/auth/WhatsApp failure.

| Layer | Rollback action | Time | Data safety |
|---|---|---|---|
| **Application** | Vercel: re-point `closeeye.in` domain BLUE ← GREEN (or "Promote" the noted BLUE deployment) | ~1 min | none lost |
| **Database migration** | Run the paired `*.down.sql` (Phase 3 convention); if unsafe, **PITR restore** to the step-3 checkpoint | mins | additive-only ⇒ no loss |
| **Environment variables** | Vercel env is per-project; BLUE keeps its own — nothing to revert. Any changed shared secret: restore prior value | secs | — |
| **Static assets** | Served from the reverted deployment — automatically consistent | secs | — |

**No customer data is lost** because: the DB is shared and untouched by the swap; migrations
are additive + reversible; and the swap is a domain pointer, not a data move.

### Post-rollback
- Confirm BLUE healthy (`curl -I https://closeeye.in`, a login, a test payment).
- Log the failure cause; fix on **staging**; re-enter the runbook from step 1.

## Hard guardrails (Phase 19)
- BLUE (current prod) is **never deleted** — it remains the instant fallback.
- Production secrets are **never** exposed or copied into staging.
- **No customer session is interrupted** — same Supabase Auth across BLUE/GREEN.
- **`closeeye.in` URL never changes** — only what it points to, and only after approval.
