// founder-nurture-sequences — daily WhatsApp nurture for un-converted registrants.
//
// Sends a warm 4-touch sequence (Day 1/3/5/7 after registration) to founder registrants
// who registered but haven't paid — one step per run, tracked in founder_nurture_log so
// a step never repeats. STOPS when: they're paying, the founder personally reached them
// in the last 2 days (founder_actions call/whatsapp), they're paused
// (profiles.founder_nurture_paused), or the sequence is complete.
//
//   verify_jwt = false  (cron source; schedule 30 4 * * * = 10:00 AM IST). Service role.
//
// TEMPLATES: each step is an approved Twilio template whose SID lives in an env var
// (FOUNDER_NURTURE_1_SID … _4_SID). Until a step's SID is set, that step is SKIPPED
// (logged, not sent) — the engine is inert-safe to deploy before approval. Copy to
// submit to Twilio + opt-in requirements are in the README.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { sendWhatsAppTemplateBySid } from '../_shared/whatsapp.ts'
import { requireCronSecret } from '../_shared/cron-auth.ts'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })

const STEP_DAYS: Record<number, number> = { 1: 1, 2: 3, 3: 5, 4: 7 }
const MAX_STEP = 4

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })
  const denied = requireCronSecret(req); if (denied) return denied;

  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const nowMs = Date.now()

  const [{ data: profs }, { data: subs }, { data: actions }, { data: log }] = await Promise.all([
    sb.from('profiles').select('id, full_name, phone, whatsapp_number, founder_registered_at, founding_date, created_at, founder_nurture_paused').or('founder_prelaunch.eq.true,is_founding_member.eq.true'),
    sb.from('subscriptions').select('user_id, status'),
    sb.from('founder_actions').select('registrant_id, action_type, created_at'),
    sb.from('founder_nurture_log').select('registrant_id, step, status'),
  ])

  const activeIds = new Set((subs ?? []).filter((s) => s.status === 'active').map((s) => s.user_id))
  const twoDaysAgo = nowMs - 2 * 86_400_000
  const recentlyTouched = new Set(
    (actions ?? [])
      .filter((a) => (a.action_type === 'call' || a.action_type === 'whatsapp') && Date.parse(a.created_at as string) >= twoDaysAgo)
      .map((a) => a.registrant_id),
  )
  const sentMax = new Map<string, number>()
  for (const r of log ?? []) {
    if (r.status !== 'sent') continue
    const cur = sentMax.get(r.registrant_id as string) ?? 0
    if ((r.step as number) > cur) sentMax.set(r.registrant_id as string, r.step as number)
  }

  const res = { considered: 0, sent: 0, pending: 0, skipped: 0, failed: 0 }
  for (const p of profs ?? []) {
    res.considered++
    if (p.founder_nurture_paused) { res.skipped++; continue }
    if (activeIds.has(p.id)) { res.skipped++; continue }              // already paying
    if (recentlyTouched.has(p.id)) { res.skipped++; continue }        // founder is on it
    const phone = ((p.phone as string) ?? (p.whatsapp_number as string) ?? '').trim()
    if (!phone) { res.skipped++; continue }
    const reg = (p.founder_registered_at ?? p.founding_date ?? p.created_at) as string | null
    if (!reg) { res.skipped++; continue }

    const daysSince = Math.floor((nowMs - Date.parse(reg)) / 86_400_000)
    const nextStep = (sentMax.get(p.id as string) ?? 0) + 1
    if (nextStep > MAX_STEP) { res.skipped++; continue }              // sequence complete
    if (daysSince < (STEP_DAYS[nextStep] ?? 99)) { res.skipped++; continue }  // not due yet

    const sid = Deno.env.get(`FOUNDER_NURTURE_${nextStep}_SID`)
    if (!sid) { res.pending++; console.log(`[nurture] template_pending step ${nextStep} for ${p.id}`); continue }

    const firstName = ((p.full_name as string) ?? 'there').trim().split(/\s+/)[0] || 'there'
    const sent = await sendWhatsAppTemplateBySid({ to: phone, sid, variables: [firstName], tag: `founder_nurture_${nextStep}`, sb })
    await sb.from('founder_nurture_log').insert({
      registrant_id: p.id, step: nextStep, template: `founder_nurture_${nextStep}`,
      status: sent.success ? 'sent' : 'failed',
    })
    if (sent.success) res.sent++
    else res.failed++
  }

  console.log(`[nurture] ${JSON.stringify(res)}`)
  return json({ ok: true, ...res })
})
