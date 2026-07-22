// founder-daily-briefing — the 7am push of the /admin/briefing page (EMAIL).
//
// Composes the SAME briefing the /admin/briefing page shows (paying families vs the
// 34-day S-curve target, top scored leads, needs-attention, one nudge) and emails it to
// every admin at 7:00 AM IST (01:30 UTC) via Resend. Email has no 24h-session limit, so
// it delivers reliably unprompted — no WhatsApp template approval needed.
//
//   verify_jwt = false  (cron source, no user JWT — see config.toml)
//   Reads with the SERVICE ROLE (bypasses RLS; the admin RPC is is_admin()-gated and
//   returns nothing to a service-role caller, so we read the tables directly). Admin
//   emails live in auth.users — resolved with sb.auth.admin.getUserById().
//
//   Secrets: RESEND_API_KEY (required to send) + RESEND_FROM_EMAIL / RESEND_FROM
//   (default "Close Eye <care@closeeye.in>"). Auto-provided: SUPABASE_URL,
//   SUPABASE_SERVICE_ROLE_KEY. Without RESEND_API_KEY → { skipped: 'no_provider' }.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { requireCronSecret } from '../_shared/cron-auth.ts'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })

const SITE = 'https://closeeye.in'
const PLAN_PRICE: Record<string, number> = { companion: 500, trust: 1500, family_os: 0 }
const TOP_N = 10
const STAGE_LABEL: Record<string, string> = {
  new: 'New', qualified: 'Qualified', conversation: 'In conversation', offer: 'Offer made', won: 'Won · paying', referred: 'Referred',
}
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string))

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
  id: string; full_name: string | null; phone: string | null
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
  if ((p.founder_service_area ?? p.address ?? '').toLowerCase().includes('hyderabad')) { s += 15; why.push('Hyderabad') }
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

const waUrl = (phone: string) => {
  const d = phone.replace(/[^\d]/g, '')
  return `https://wa.me/${d.length === 10 ? `91${d}` : d}`
}
const scoreBg = (s: number) => (s >= 60 ? '#17795e' : s >= 40 ? '#e4f0ea' : '#ece9df')
const scoreFg = (s: number) => (s >= 60 ? '#ffffff' : s >= 40 ? '#0e5c47' : '#5e6e64')

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })
  const denied = requireCronSecret(req); if (denied) return denied;

  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const nowMs = Date.now()

  // ── Read (service role) ────────────────────────────────────────────────────
  const [{ data: subs }, { data: profs }, { data: rems }] = await Promise.all([
    sb.from('subscriptions').select('user_id, plan_id, status'),
    sb.from('profiles').select('id, full_name, phone, founder_service_area, address, founder_relationship, founder_ref, founder_registered_at, founding_date, created_at, founder_followed_up, founder_stage, is_founding_member').or('founder_prelaunch.eq.true,is_founding_member.eq.true'),
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
      return { p, subStatus, score, why, stage: stageOf(p, subStatus) }
    })
    .filter((r) => r.subStatus !== 'active')
    .sort((a, b) => b.score - a.score)
  const top = scored.slice(0, TOP_N)
  const offers = registrants.filter((p) => stageOf(p, subMap.get(p.id)?.status as string | undefined) === 'offer').length

  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date(nowMs))
  const nameById = new Map(registrants.map((p) => [p.id, p.full_name ?? 'Family']))
  const dueRems = (rems ?? []).filter((r) => (r.due_on as string) <= today)

  const nudge =
    offers > 0 ? `${offers} lead${offers > 1 ? 's' : ''} at "Offer made" — a nudge closes these fastest. Do those first.`
    : behind > 0 ? `You're ${behind} behind today's target — work the hot list below, and ask every closed family for 2 referrals.`
    : `On track. Deliver today's visits flawlessly and turn each Presence Story into a referral + a review.`

  const dateLabel = new Intl.DateTimeFormat('en-IN', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Asia/Kolkata' }).format(new Date(nowMs))
  const subject = `☀️ Close Eye briefing — ${paying}/100 (${onTrack ? 'on track' : `${behind} behind`})`

  const rowsHtml = top.length
    ? top.map((r) => `<tr>
        <td style="padding:11px 14px;vertical-align:top"><span style="display:inline-block;min-width:30px;height:30px;line-height:30px;text-align:center;padding:0 4px;border-radius:15px;background:${scoreBg(r.score)};color:${scoreFg(r.score)};font-weight:700;font-size:13px">${r.score}</span></td>
        <td style="padding:11px 6px;vertical-align:top"><strong style="color:#16241d">${esc(r.p.full_name ?? 'Family')}</strong><br><span style="color:#5e6e64;font-size:12px">${STAGE_LABEL[r.stage] ?? 'New'}${r.why.length ? ' · ' + esc(r.why.slice(0, 2).join(', ')) : ''}</span></td>
        <td style="padding:11px 14px;text-align:right;vertical-align:top;white-space:nowrap">${r.p.phone ? `<a href="${waUrl(r.p.phone)}" style="color:#17795e;text-decoration:none;font-weight:600;font-size:13px">WhatsApp →</a>` : '<span style="color:#8a968d;font-size:12px">email only</span>'}</td>
      </tr>`).join('')
    : `<tr><td style="padding:14px;color:#5e6e64;font-size:13px">No winnable leads yet — they appear as families register.</td></tr>`

  const attentionHtml = dueRems.length
    ? `<p style="font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:#5e6e64;margin:22px 0 8px">⏰ Due today</p>
       <div style="background:#fff;border:1px solid #e7e2d5;border-radius:12px;padding:12px 16px;font-size:13px;color:#16241d">${dueRems.slice(0, 8).map((r) => `<div style="padding:3px 0"><strong>${esc(nameById.get(r.registrant_id as string) ?? 'Family')}</strong>${r.note ? ' — ' + esc(String(r.note)) : ''}</div>`).join('')}</div>`
    : ''

  const html = `<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:600px;margin:0 auto;background:#f6f4ed;padding:24px;color:#16241d">
    <div style="font-weight:800;font-size:17px;color:#17795e;border-bottom:2px solid #17795e;padding-bottom:10px">☀️ close eye · daily briefing</div>
    <p style="color:#5e6e64;font-size:13px;margin:12px 0 18px">Good morning. ${esc(dateLabel)}${daysToLaunch > 0 ? ` · ${daysToLaunch} days to launch` : ''}.</p>

    <div style="background:#fff;border:1px solid #e7e2d5;border-radius:14px;padding:20px;margin-bottom:14px">
      <p style="margin:0;color:#5e6e64;font-size:11px;text-transform:uppercase;letter-spacing:.08em">Paying families · on a plan</p>
      <p style="margin:6px 0 0"><span style="font-size:40px;font-weight:800;color:#17795e;letter-spacing:-1px">${paying}</span><span style="font-size:20px;color:#5e6e64"> / 100</span></p>
      <p style="margin:8px 0 0;font-size:13px">
        <span style="background:${onTrack ? '#e4f0ea' : '#f6ecd6'};color:${onTrack ? '#0e5c47' : '#8a5a0a'};font-weight:700;padding:3px 9px;border-radius:999px">${onTrack ? '✅ On track' : `⚠️ ${behind} behind`}</span>
        <span style="color:#5e6e64"> · target today ${target} · MRR ₹${mrr.toLocaleString('en-IN')}</span>
      </p>
    </div>

    <div style="background:#e4f0ea;border-radius:14px;padding:14px 16px;margin-bottom:16px;font-size:14px;line-height:1.5"><strong>Today's focus.</strong> ${esc(nudge)}</div>

    <p style="font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:#5e6e64;margin:0 0 8px">🔥 Top ${top.length} to call first</p>
    <table style="width:100%;border-collapse:collapse;background:#fff;border:1px solid #e7e2d5;border-radius:14px;overflow:hidden">${rowsHtml}</table>
    ${attentionHtml}

    <p style="margin:24px 0 8px"><a href="${SITE}/admin/briefing" style="background:#17795e;color:#fff;text-decoration:none;padding:12px 22px;border-radius:999px;font-weight:600;font-size:14px">Open the full briefing →</a></p>
    <p style="font-size:12px;color:#8a968d;margin-top:18px">100 paying families by 15 August. Sell trust, not price; land on one visit; let the Presence Story do the rest.</p>
  </div>`

  // ── Recipients — admin emails from auth.users ──────────────────────────────
  const { data: admins } = await sb.from('profiles').select('id, full_name').eq('role', 'admin')
  const recipients: string[] = []
  for (const a of admins ?? []) {
    const { data: au } = await sb.auth.admin.getUserById(a.id as string)
    const email = au?.user?.email
    if (email) recipients.push(email)
  }

  // ── Send via Resend ────────────────────────────────────────────────────────
  const apiKey = Deno.env.get('RESEND_API_KEY')
  if (!apiKey) {
    console.warn('[founder-briefing] SKIPPED — no RESEND_API_KEY')
    return json({ skipped: true, reason: 'no_provider', paying, target, topCount: top.length, recipients: recipients.length, subject })
  }
  if (recipients.length === 0) {
    return json({ skipped: true, reason: 'no_admin_email', paying, target, topCount: top.length })
  }
  const from = Deno.env.get('RESEND_FROM_EMAIL') || Deno.env.get('RESEND_FROM') || 'Close Eye <care@closeeye.in>'

  let sent = 0
  const errors: string[] = []
  for (const to of recipients) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, to: [to], subject, html }),
      })
      if (res.ok) sent++
      else errors.push(`${to}: HTTP ${res.status} ${(await res.text()).slice(0, 200)}`)
    } catch (e) {
      errors.push(`${to}: ${String(e)}`)
    }
  }

  console.log(`[founder-briefing] paying=${paying} target=${target} top=${top.length} recipients=${recipients.length} sent=${sent}`)
  return json({ ok: true, paying, target, onTrack, topCount: top.length, recipients: recipients.length, sent, subject, ...(errors.length ? { errors } : {}) })
})
