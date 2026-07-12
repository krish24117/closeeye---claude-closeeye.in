# founder-daily-briefing — the 7am push (email)

Emails the `/admin/briefing` digest to every admin at 7:00 AM IST, daily. Same
composition as the page (paying families vs the 34-day S-curve target, top-10 scored
leads with tap-to-WhatsApp, due reminders, one nudge) — no new data source. Reads with
the service role; scored inline (mirrors `lib/founder-ops-view.ts`). Sends a branded HTML
email via **Resend** — no WhatsApp session window, no template approval, reliable
unprompted.

## Deploy (you run these — prod deploys are yours)

```bash
# from repo root, with the Supabase CLI logged in + linked to kghwmiriboavmyswcqnr
supabase functions deploy founder-daily-briefing
```

Secrets (already set for `send-visit-email` — nothing new):
- `RESEND_API_KEY` — required to actually send.
- `RESEND_FROM_EMAIL` (or `RESEND_FROM`) — default `Close Eye <care@closeeye.in>`. The
  from-domain must be verified in Resend (same as your visit emails).
- Auto-provided: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.

`config.toml` already sets `verify_jwt = false`. Recipients = every `profiles.role='admin'`
whose email (from `auth.users`) resolves.

## Test before scheduling

```bash
# fires it once; returns { paying, target, sent, subject } — and lands in your inbox.
curl -X POST 'https://kghwmiriboavmyswcqnr.supabase.co/functions/v1/founder-daily-briefing' \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY"
```

If it returns `{ skipped: 'no_provider' }`, set `RESEND_API_KEY`. If `{ skipped:
'no_admin_email' }`, ensure your admin account has an email. If Resend returns 403/422,
verify the from-domain in Resend (identical to the visit-email setup).

## Schedule

Once the test email looks right, schedule it — easiest via **Supabase Dashboard →
Database → Cron Jobs** (Name `founder-daily-briefing`, Schedule `30 1 * * *`, Type = Edge
Function → `founder-daily-briefing`). Or run `schedule.sql` in the SQL editor.

## Notes

- Delivery is email, so it arrives unprompted every morning — no 24h-session limit.
- Want it on WhatsApp too later? Add an approved `founder_briefing` Twilio template and
  the existing `sendWhatsAppFreeText`/`sendWhatsAppTemplate` helper (`_shared/whatsapp.ts`)
  — the composition here is channel-agnostic.
- The `previewBody`/`subject` in the response lets you tune the copy without waiting for
  7am. Modelled on `send-monthly-summary` + `send-visit-email`.
