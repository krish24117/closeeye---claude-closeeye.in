# founder-daily-briefing — the 7am push

Sends the `/admin/briefing` digest to every admin over WhatsApp, once a day at 7:00 AM
IST. Same composition as the page (paying families vs the 34-day S-curve target, top
scored leads, needs-attention, one nudge) — no new data source. Reads with the service
role; scored inline (mirrors `lib/founder-ops-view.ts`).

## Deploy (you run these — prod deploys are yours)

```bash
# from repo root, with the Supabase CLI logged in + linked to kghwmiriboavmyswcqnr
supabase functions deploy founder-daily-briefing
```

Secrets it uses (already set for your other WhatsApp functions — nothing new):
`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`,
`TWILIO_WHATSAPP_FROM`. `config.toml` already sets `verify_jwt = false`.

## Test before scheduling

```bash
# fires it once; returns { paying, target, sent, previewBody } so you can read the exact
# message and tune the copy before it goes on a timer.
curl -X POST 'https://kghwmiriboavmyswcqnr.supabase.co/functions/v1/founder-daily-briefing' \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY"
```

Check the `previewBody` in the response, and (if a WhatsApp session is open) your phone.

## Schedule

Once the test looks right, schedule it — easiest via **Supabase Dashboard → Database →
Cron Jobs** (Name `founder-daily-briefing`, Schedule `30 1 * * *`, Type = Edge Function
→ `founder-daily-briefing`). Or run `schedule.sql` in the SQL editor.

## ⚠️ Reliable unprompted delivery — the one real caveat

WhatsApp only lets a business send **free-text** inside a 24-hour window after the user
last messaged you. A 7am push is *unprompted*, so free-text may not deliver unless you
messaged the Close Eye number in the last 24h. Two fixes:

1. **Approve a `founder_briefing` Twilio template (recommended, native).** Submit this
   for approval in Twilio (you already have 12 approved templates):

   > ☀️ Close Eye briefing, {{1}}: *{{2}}* — {{3}}. Top to call: {{4}}. Focus: {{5}}.
   > Full pipeline → closeeye.in/admin/briefing

   Then add its SID to `TEMPLATES` in `_shared/whatsapp.ts` (e.g. `founder_briefing`),
   and swap the send call in `index.ts` from `sendWhatsAppFreeText(...)` to
   `sendWhatsAppTemplate({ to, template: 'founder_briefing', variables: [name, number, status, topNames, nudge], sb })`.
   Templates deliver business-initiated, any time — reliable.

2. **Email instead** (zero approval): mirror this function using the `send-visit-email`
   sender; email has no session window. Good if you'd rather read it in your inbox.

Until then, free-text works for testing and within-session sends. The scheduling and
composition are done — only the delivery channel needs this one decision.
