# Ask Close Eye — Triage Engine

The `ask-health` edge function, upgraded into the three-lane triage system from the spec.
Powered by the Anthropic API. Built to drop into your existing Supabase project
(`kghwmiriboavmyswcqnr`) with minimal changes.

## What's here

```
supabase/
  functions/
    ask-health/                ← the triage engine
      index.ts                 ← orchestrator (flow 1→5)
      redflags.ts              ← deterministic Lane-3 safety floor (medical team owns this)
      classify + generate      ← claude.ts (Anthropic calls, fail-safe)
      prompts.ts               ← system prompts + vetted Lane 2/3 templates
      notify.ts                ← WhatsApp care-team alert + nearest-hospital lookup
      types.ts
    care-intelligence-scan/    ← scheduled Flow D (question clusters → coordinator)
  migrations/
    20260629_ask_health_triage.sql
frontend/
  AskCloseEye.tsx              ← lane-aware React renderer
```

## How a message flows

1. Load the parent's **care context** (conditions, meds, recent readings) — your moat.
2. **Red-flag scan** (code, no model) → emergency? Lane 3 immediately.
3. **Classify** with a cheap model → lane + topic. Any failure → fails safe to "connect".
4. Branch: out-of-scope redirect · Lane 3 emergency · Lane 2 offer-a-doctor · Lane 1 answer.
5. **Log** every question with its topic (feeds the cap + the intelligence scan).

Only **Lane 1** is generated fresh. **Lanes 2 and 3 use vetted templates** so the
high-stakes wording is reviewed once and never drifts.

## Set the secrets (never hard-code keys)

```bash
supabase secrets set \
  ANTHROPIC_API_KEY=sk-ant-...            \
  GOOGLE_MAPS_API_KEY=...                 \
  WHATSAPP_CLOUD_TOKEN=...                \
  WHATSAPP_PHONE_NUMBER_ID=...            \   # Meta id for +91 9121577395
  CARE_TEAM_WHATSAPP=919000221261         \   # comma-separated E.164
  CLOSEEYE_ALLOWED_ORIGIN=https://closeeye.in \
  CLOSEEYE_FREE_QUESTION_CAP=5            \
  CLOSEEYE_AMBULANCE_NUMBER=108
```

Optional model overrides: `CLOSEEYE_CLASSIFIER_MODEL` (default `claude-haiku-4-5-20251001`),
`CLOSEEYE_INFORM_MODEL` (default `claude-sonnet-4-6`).

> Reminder from earlier: rotate any key that was ever shown in a terminal/screenshot,
> and restrict the Google Maps key by HTTP referrer in Google Cloud Console.

## Deploy

```bash
supabase db push                                   # apply the migration
supabase functions deploy ask-health
supabase functions deploy care-intelligence-scan
```

Schedule the scan daily (Supabase dashboard → Edge Functions → Schedules, or pg_cron):

```sql
select cron.schedule(
  'care-intelligence-scan', '0 4 * * *',
  $$ select net.http_post(
       url := 'https://kghwmiriboavmyswcqnr.functions.supabase.co/care-intelligence-scan',
       headers := jsonb_build_object('Authorization','Bearer <SERVICE_ROLE_KEY>')
     ) $$
);
```

## Call it

```ts
await fetch(`${SUPABASE_URL}/functions/v1/ask-health`, {
  method: "POST",
  headers: { "content-type": "application/json", authorization: `Bearer ${accessToken}` },
  body: JSON.stringify({ userId, parentId, question }),
});
```

Returns `{ lane, topic, message, disclaimer?, suggestedActions[], requiresHuman, escalation?, capReached? }`.

## Coverage — every point from the spec

- [x] Three lanes: inform / connect / escalate
- [x] Red-flag list checked **before** any model call (deterministic, recall-biased)
- [x] "Round up when unsure" — classifier rule + fail-safe to `connect`
- [x] Parent **context injection** (conditions, meds, recent readings)
- [x] Mandatory disclaimer; **"guided by our medical team"**, never "doctor-verified"
- [x] 5/month cap on **Lane 1 only** — Lanes 2 & 3 never blocked ("never paywall fear")
- [x] Prompt-injection guardrails + strict health/elder-care scope
- [x] Lane 2 → creates a **consult request** (your revenue moment)
- [x] Lane 3 → vetted emergency message + **care-team alert** + **nearest hospital**
- [x] Every question **logged with topic** for the intelligence layer
- [x] Flow D — scheduled **cluster detection** → coordinator flag + alert
- [x] Flow E — pre-visit prep stays Lane 1 (safe); add a `create_summary` action when you wire the health-summary export
- [x] Fail-safe everywhere — errors route to a human, never a risky answer
- [x] DPDP-aware: care data via service role + RLS; sensitive data stays server-side

## Hand to the medical team before launch

- `redflags.ts` — Dr. Sidharth should review and extend the patterns.
- The Lane 2 / Lane 3 templates in `prompts.ts` — sign off on the exact wording once.
- Decide the cluster threshold for Flow D (default: 3 questions in 7 days).
