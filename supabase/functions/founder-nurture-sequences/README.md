# founder-nurture-sequences — WhatsApp nurture for un-converted registrants

A warm 4-touch WhatsApp sequence (Day 1 → 3 → 5 → 7 after registration) to founder
registrants who registered but haven't paid — so warm leads you couldn't personally
reach don't go cold. One step per daily run, tracked in `founder_nurture_log` so a step
never repeats.

**Stops automatically when:** the lead is paying · you personally called/WhatsApp'd them
in the last 2 days (`founder_actions`) · you paused them (`profiles.founder_nurture_paused
= true`) · the 4 steps are done.

## The sequence — submit these 4 to Twilio (Marketing category)

Each has one variable `{{1}}` = the lead's first name. Keep the copy warm, low-pressure
(brand rule: *emotion without guilt*). Suggested copy — edit to your voice before
submitting:

1. **founder_nurture_1 (Day 1) — reassurance**
   > Hi {{1}}, this is Krishna from Close Eye 🌿 Thank you for thinking of us for your
   > parents. Whenever you're ready, we can be your trusted presence in Hyderabad — even
   > a single visit, and you'll get photos and a note the same day. Any questions? Just reply.

2. **founder_nurture_2 (Day 3) — trust**
   > Hi {{1}}, families often ask "how do I trust someone with my parent?" Every Close Eye
   > Guardian is background-verified and trained, and you see same-day photos + a report
   > from every visit. Would you like to start with one visit this week?

3. **founder_nurture_3 (Day 5) — founding place**
   > Hi {{1}}, your founding-member place is still open 💛 Founding families lock their
   > price and get priority scheduling. Shall I set up your first Presence Visit? Reply
   > and I'll arrange it personally.

4. **founder_nurture_4 (Day 7) — gentle last touch**
   > Hi {{1}}, I won't keep messaging 🙏 If now isn't the time, no worries at all — we're
   > here whenever your family needs us. If you'd like to talk it through, just reply and
   > I'll call you.

## Activate (you run these)

1. **Opt-in / compliance (do first).** WhatsApp Marketing templates need prior opt-in.
   Only nurture registrants who agreed to WhatsApp updates at sign-up — confirm your
   registration flow captures that consent, or scope the sequence to those who did.
2. Get the 4 templates approved in Twilio → note their `ContentSid`s.
3. Set the SIDs as function secrets:
   ```bash
   supabase secrets set FOUNDER_NURTURE_1_SID=HX... FOUNDER_NURTURE_2_SID=HX... \
                        FOUNDER_NURTURE_3_SID=HX... FOUNDER_NURTURE_4_SID=HX...
   supabase functions deploy founder-nurture-sequences
   ```
   (Reuses existing `TWILIO_*` + `SUPABASE_*` secrets — nothing else new.)
4. **Test** (no SIDs set → it safely reports `pending`, sends nothing):
   ```bash
   curl -X POST 'https://kghwmiriboavmyswcqnr.supabase.co/functions/v1/founder-nurture-sequences' \
     -H "Authorization: Bearer $SUPABASE_ANON_KEY"
   # → { considered, sent, pending, skipped, failed }
   ```
5. **Schedule** once you're happy — Dashboard → Cron Jobs (`30 4 * * *`) or `schedule.sql`.

## Notes

- **Inert-safe:** deploy anytime — with no `FOUNDER_NURTURE_n_SID` set, every due step is
  counted as `pending` and nothing sends. It comes alive step-by-step as you set SIDs.
- **Pause a lead:** set `profiles.founder_nurture_paused = true` (e.g. from a quick admin
  action) to stop auto-messages for someone you're handling yourself.
- **Scope:** v1 nurtures *registrants* (accounts that didn't pay). Pre-account waitlist
  hand-raisers (the `waitlist` table) are a natural v2 — same engine, different source.
- Modelled on `send-monthly-summary` / `check-overdue-bookings`; sends via
  `_shared/whatsapp.ts` `sendWhatsAppTemplateBySid`.
