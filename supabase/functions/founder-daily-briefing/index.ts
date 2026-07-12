// founder-daily-briefing — the 7am push of the /admin/briefing page.
//
// Composes the SAME briefing the /admin/briefing page shows (paying families vs the
// 34-day S-curve target, top scored leads, needs-attention, one nudge) and sends it to
// every admin over WhatsApp. Runs as a pg_cron job at 7:00 AM IST (01:30 UTC).
//
//   verify_jwt = false  (cron source, no user JWT — see config.toml)
//   Reads with the SERVICE ROLE (bypasses RLS; the admin RPC is is_admin()-gated and
//   returns nothing to a service-role caller, so we read the tables directly).
//
// DELIVERY NOTE (WhatsApp rule): sendWhatsAppFreeText only delivers inside a 24h
// customer-initiated session. For reliable UNPROMPTED 7am delivery, submit a
// `founder_briefing` Twilio template (see README) and swap the send call — a 2-line
// change. Free-text is used here so you can test immediately and iterate on the copy.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { sendWhatsAppFreeText } from '../_shared/whatsapp.ts'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })

const SITE = 'https://closeeye.in'
const PLAN_PRICE: Record<string, number> = { companion: 500, trust: 1500, family_os: 0 }
const TOP_N = 7

/** Today's cumulative target on the 34-day S-curve to 100 (Jul 12 → Aug 15 2026). */
function targetToday(daysToLaunch: number): number {
  const total = 34
  const elapsed = Math.max(0, Math.min(total, total - daysToLaunch))
  const pts: [number, number][] = [[0, 0], [3, 3], [7, 12], [14, 32], [21, 55], [28, 83], [34, 100]]
  for (let i = 1; i < pts.length; i++) {
    const [d0, t0] = pts[i - 1]!
    const [d1, t1] = pts[i]!
    if (elapsed <= d1) return Math.round(t0 + (t1 - t0) * ((elapsed - d0) / (d1 - d0)))
  }
  return 100
}

type Prof = {
  id: string; full_name: string | null; phone: string | null; whatsapp_number: string | null
  founder_service_area: string | null; address: string | null; founder_relationship: string | null
  founder_ref: string | null; founder_registered_at: string | null; founding_date: string | null
  created_at: string | null; founder_followed_up: boolean | null; founder_stage: string | null
  is_founding_member: boolean | null
}

function stageOf(p: Prof, subStatus: string | undefined): string {
  if (p.founder_stage === 'referred') return 'referred'
  if (subStatus === 'active') return 'won'
  const v = p.founder_stage
  return v === 'qualified' || v === 'conversation' || v === 'offer' ? v : 'new'
}

function scoreOf(p: Prof, subStatus: string | undefined, nowMs: number): { score: number; why: string[] } {
  let s = 0
  const why: string[] = []
  if ((p.founder_ref ?? '').trim()) { s += 20; why.push('referral') }
  const city = (p.founder_service_area ?? p.address ?? '')
  if (city.toLowerCase().includes('hyderabad')) { s += 15; why.push('Hyderabad') }
  const st = stageOf(p, subStatus)
  if (st === 'offer') { s += 20; why.push('offer made') }
  else if (st === 'conversation') { s += 12; why.push('in conversation') }
  else if (st === 'qualified') { s += 6; why.push('qualified') }
  if (p.founder_followed_up) { s += 15; why.push('contacted') }
  if ((p.founder_relationship ?? '').trim()) s += 10
  const reg = p.founder_registered_at ?? p.founding_date ?? p.created_at
  if (reg) { const age = nowMs - Date.parse(reg); if (age >= 0 && age <= 7 * 86_400_000) { s += 10; why.push('registered this week') } }
  return { score: Math.min(100, s), why }
}

const waLink = (phone: string) => {
  const d = phone.replace(/[^\d]/g, '')
  return `wa.me/${d.length === 10 ? `91${d}` : d}`
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })

  const sb = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )
  const nowMs = Date.now()

  // ── Read (service role) ────────────────────────────────────────────────────
  const [{ data: subs }, { data: profs }, { data: rems }] = await Promise.all([
    sb.from('subscriptions').select('user_id, plan_id, status'),
    sb.from('profiles').select('id, full_name, phone, whatsapp_number, founder_service_area, address, founder_relationship, founder_ref, founder_registered_at, founding_date, created_at, founder_followed_up, founder_stage, is_founding_member').or('founder_prelaunch.eq.true,is_founding_member.eq.true'),
    sb.from('founder_reminders').select('registrant_id, due_on, note, done').eq('done', false),
  ])

  const subMap = new Map((subs ?? []).map((s) => [s.user_id, s]))
  const active = (subs ?? []).filter((s) => s.status === 'active')
  const paying = active.length
  const mrr = active.reduce((sum, s) => sum + (PLAN_PRICE[s.plan_id as string] ?? 0), 0)

  const daysToLaunch = Math.max(0, Math.ceil((Date.UTC(2026, 7, 15) - nowMs) / 86_400_000))
  const target = targetToday(daysToLaunch)
  const behind = Math.max(0, target - paying)
  const onTrack = paying >= target

  const registrants = (profs ?? []) as Prof[]
  const scored = registrants
    .map((p) => {
      const subStatus = subMap.get(p.id)?.status as string | undefined
      const { score, why } = scoreOf(p, subStatus, nowMs)
      return { p, subStatus, score, why }
    })
    .filter((r) => r.subStatus !== 'active') // winnable only
    .sort((a, b) => b.score - a.score)

  const top = scored.slice(0, TOP_N)
  const stageCount = (name: string) =>
    registrants.filter((p) => stageOf(p, subMap.get(p.id)?.status as string | undefined) === name).length
  const offers = stageCount('offer')

  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date(nowMs)) // YYYY-MM-DD (IST)
  const dueRems = (rems ?? []).filter((r) => (r.due_on as string) <= today)
  const nameById = new Map(registrants.map((p) => [p.id, p.full_name ?? 'Family']))

  const nudge =
    offers > 0 ? `${offers} lead${offers > 1 ? 's' : ''} at "Offer made" — a nudge closes these fastest. Do those first.`
    : behind > 0 ? `You're ${behind} behind target — work the hot list below, and ask every closed family for 2 referrals.`
    : `On track. Deliver today's visits flawlessly and turn each Presence Story into a referral + a review.`

  // ── Compose (WhatsApp free-text; *bold* uses asterisks) ─────────────────────
  const dateLabel = new Intl.DateTimeFormat('en-IN', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Asia/Kolkata' }).format(new Date(nowMs))
  const topLines = top.length
    ? top.map((r, i) => {
        const wa = r.p.phone ? `\n   ${waLink(r.p.phone)}` : ''
        const why = r.why.slice(0, 2).join(', ')
        return `${i + 1}. ${r.p.full_name ?? 'Family'} — *${r.score}*${why ? ` · ${why}` : ''}${wa}`
      }).join('\n')
    : 'No winnable leads yet — they appear as families register.'
  const attention = dueRems.length
    ? `\n⏰ *Due today:* ${dueRems.slice(0, 5).map((r) => nameById.get(r.registrant_id as string) ?? 'Family').join(', ')}`
    : ''

  const body =
`☀️ *Close Eye — Daily Briefing*
${dateLabel}${daysToLaunch > 0 ? ` · ${daysToLaunch} days to launch` : ''}

📊 Paying families: *${paying}/100*
${onTrack ? '✅ On track' : `⚠️ ${behind} behind`} · target today ${target}
💰 MRR ₹${mrr.toLocaleString('en-IN')}

🔥 *Top ${top.length} to call first:*
${topLines}${attention}

👉 *Focus:* ${nudge}

Full pipeline → ${SITE}/admin/briefing`

  // ── Send to every admin ────────────────────────────────────────────────────
  const { data: admins } = await sb
    .from('profiles')
    .select('whatsapp_number, full_name')
    .eq('role', 'admin')
    .not('whatsapp_number', 'is', null)

  let sent = 0
  for (const a of admins ?? []) {
    const res = await sendWhatsAppFreeText({ to: a.whatsapp_number as string, body, sb, tag: 'founder_daily_briefing' })
    if (res.success) sent++
  }

  console.log(`[founder-briefing] paying=${paying} target=${target} top=${top.length} admins=${admins?.length ?? 0} sent=${sent}`)
  return json({ ok: true, paying, target, onTrack, topCount: top.length, admins: admins?.length ?? 0, sent, previewBody: body })
})
