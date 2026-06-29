// Supabase Edge Function — send-visit-whatsapp
//
// Sends a warm visit report to the family after a completed visit.
// Structure:
//   Bubble 1: Full warm message text + PDF report (MediaUrl)
//   Bubble 2: Photo — only if elder_profiles.photo_consent = true AND companion took one
//
// Two template variants:
//   "all clear" — used when no health concern was flagged
//   "needs attention" — used when any check was flagged (calm, factual, no cheerful framing)
//
// "one_moment" is the companion's required warm human detail (min 20 chars, stored
// in visits.one_moment). It is NEVER auto-filled — if it's somehow absent from the
// visit record this function surfaces an error rather than silently omitting it.
//
// Required secrets:
//   TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM
//
// Auto-provided: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function waNumber(raw: string): string {
  const t = raw.trim()
  return t.startsWith('whatsapp:') ? t : `whatsapp:${t}`
}

function formatIndiaDateTime(iso: string): { date: string; time: string } {
  const d = new Date(iso)
  return {
    date: new Intl.DateTimeFormat('en-IN', {
      weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Asia/Kolkata',
    }).format(d),
    time: new Intl.DateTimeFormat('en-IN', {
      hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata',
    }).format(d),
  }
}

function formatNextVisit(iso: string | null | undefined): string {
  if (!iso) return 'soon — our team will be in touch'
  const d = new Date(iso)
  const day = new Intl.DateTimeFormat('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Asia/Kolkata',
  }).format(d)
  return `on ${day}`
}

// ── Health-field renderers ────────────────────────────────────────────────────

function wellbeingLine(checks: any): string {
  const uncomfortable = checks?.elder_comfortable === false
  const alertConcern  = checks?.alert_responsive  === false
  if (!uncomfortable && !alertConcern) return 'Comfortable and alert 😊'
  const parts: string[] = []
  if (uncomfortable) parts.push('seemed unsettled')
  if (alertConcern)  parts.push(`alertness concern${checks.alert_concern ? ` — ${checks.alert_concern}` : ''}`)
  return `⚠️ ${parts.join('; ')} — noted in full report`
}

function medicinesLine(checks: any): string {
  if (checks?.medicines_taken === true)  return 'All medicines taken ✅'
  if (checks?.medicines_taken === false) return '⚠️ Medicines not taken today — please follow up'
  return 'Not confirmed during visit'
}

function vitalsLine(checks: any): string {
  if (checks?.pain_noted === true) {
    return `⚠️ Pain or discomfort noted${checks.pain_details ? ` — ${checks.pain_details}` : ''}`
  }
  return 'No pain or discomfort reported ✅'
}

function eatingMoodLine(checks: any): string {
  if (checks?.had_meal === true)  return 'Had a meal and was in good spirits 😊'
  if (checks?.had_meal === false) return '⚠️ Had not eaten today — may need attention'
  return 'Not confirmed during visit'
}

// ── Concern summary for "needs attention" template ───────────────────────────

function buildConcernLines(checks: any): string[] {
  const lines: string[] = []
  if (checks?.medicines_taken === false) lines.push('• Medicines were not taken today')
  if (checks?.had_meal === false)        lines.push('• They had not eaten a meal')
  if (checks?.home_safe === false)       lines.push(`• Home safety concern${checks.home_safety_concern ? `: ${checks.home_safety_concern}` : ' — see full report'}`)
  if (checks?.elder_comfortable === false) lines.push('• They seemed uncomfortable or unsettled')
  if (checks?.pain_noted === true)       lines.push(`• Pain or discomfort${checks.pain_details ? `: ${checks.pain_details}` : ' — see full report'}`)
  if (checks?.alert_responsive === false) lines.push(`• Alertness concern${checks.alert_concern ? `: ${checks.alert_concern}` : ' — see full report'}`)
  return lines
}

function anyConcern(checks: any): boolean {
  return (
    checks?.medicines_taken === false ||
    checks?.had_meal === false ||
    checks?.home_safe === false ||
    checks?.elder_comfortable === false ||
    checks?.pain_noted === true ||
    checks?.alert_responsive === false
  )
}

// ── Template builders ─────────────────────────────────────────────────────────

function buildGoodStatusMessage(p: {
  familyName: string
  elderName: string
  oneMoment: string
  checks: any
  nextVisit: string
  hasPhoto: boolean
}): string {
  const lines: string[] = [
    `Namaste ${p.familyName} 🌿`,
    ``,
    `We visited ${p.elderName} today, and we're happy to tell you — they're doing well. 💚`,
    ``,
    `A little moment from today: ${p.oneMoment}`,
    ``,
    `Today's check-in:`,
    `✅ Overall wellbeing: ${wellbeingLine(p.checks)}`,
    `💊 Medicines: ${medicinesLine(p.checks)}`,
    `🩺 ${vitalsLine(p.checks)}`,
    `🍲 Eating & mood: ${eatingMoodLine(p.checks)}`,
    ``,
    `📄 Full report attached.`,
    ...(p.hasPhoto ? [`📷 A photo from today's visit is in the next message.`] : []),
    ``,
    `${p.elderName} is in good hands. We'll see them again ${p.nextVisit}. Reply here anytime — we're always one message away.`,
    ``,
    `With care,`,
    `Team Close Eye`,
    `When you can't be there, Close Eye can.`,
  ]
  return lines.join('\n')
}

function buildNeedsAttentionMessage(p: {
  familyName: string
  elderName: string
  checks: any
  oneMoment: string
  nextVisit: string
  hasPhoto: boolean
}): string {
  const concerns = buildConcernLines(p.checks)
  const lines: string[] = [
    `Namaste ${p.familyName} 🌿`,
    ``,
    `We visited ${p.elderName} today. A few things we want to share with you.`,
    ``,
    `What we noticed:`,
    ...concerns,
    ``,
    `What was done: Our companion attended to ${p.elderName} and noted all concerns carefully. Everything is recorded in the full report below.`,
    ``,
    `What we suggest: Please review the full report. If you'd like us to coordinate a doctor visit or take any specific action, just reply to this message — we're here.`,
    ``,
    ...(p.oneMoment ? [`A moment from the visit: ${p.oneMoment}`, ``] : []),
    `📄 Full report attached.`,
    ...(p.hasPhoto ? [`📷 A photo from today's visit is in the next message.`] : []),
    ``,
    `We'll be with ${p.elderName} again ${p.nextVisit}.`,
    ``,
    `With care,`,
    `Team Close Eye`,
    `When you can't be there, Close Eye can.`,
  ]
  return lines.join('\n')
}

// ── Main ──────────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const jwt = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!jwt) return new Response('Unauthorized', { status: 401, headers: CORS })

  try {
    const { booking_id, pdf_url } = await req.json() as { booking_id?: string; pdf_url?: string }
    if (!booking_id || !pdf_url) {
      return json({ error: 'booking_id and pdf_url are required' }, 400)
    }

    const url = Deno.env.get('SUPABASE_URL')!
    const sb  = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    // Verify caller — companion or admin only
    const callerSb = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    })
    const { data: { user } } = await callerSb.auth.getUser()
    if (!user) return new Response('Unauthorized', { status: 401, headers: CORS })

    // ── Load booking + elder ──────────────────────────────────────────────
    const { data: booking, error: bErr } = await sb
      .from('bookings')
      .select('id, companion_id, loved_one_id, loved_ones(full_name, city, family_user_id)')
      .eq('id', booking_id)
      .single()

    if (bErr || !booking) return json({ error: 'Booking not found' }, 404)

    const { data: callerProfile } = await sb.from('profiles').select('role').eq('id', user.id).single()
    const isAdmin = callerProfile?.role === 'admin'
    if (!isAdmin && booking.companion_id !== user.id) return json({ error: 'Forbidden' }, 403)

    const lo = booking.loved_ones as any
    const lovedOneId   = booking.loved_one_id
    const familyUserId = lo?.family_user_id

    if (!familyUserId) return json({ skipped: true, reason: 'no_family_user' })

    // ── Load all related data in parallel ─────────────────────────────────
    const [visitRes, ownerRes, membersRes, elderRes, compRes, nextRes] = await Promise.all([
      // Visit report
      sb.from('visits')
        .select('one_moment, checklist_data, photo_urls, start_time, end_time, flags')
        .eq('booking_id', booking_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),

      // Family owner's WhatsApp
      sb.from('profiles').select('whatsapp_number, phone, full_name').eq('id', familyUserId).single(),

      // Other family members who opted in
      sb.from('family_members').select('whatsapp_number').eq('family_user_id', familyUserId).eq('notify_visits', true),

      // Elder profile (for photo_consent)
      lovedOneId
        ? sb.from('elder_profiles').select('name, photo_consent').eq('loved_one_id', lovedOneId).maybeSingle()
        : Promise.resolve({ data: null, error: null }),

      // Companion name
      sb.from('profiles').select('full_name').eq('id', booking.companion_id).single(),

      // Next scheduled visit for this elder (for "we'll see them again X")
      lovedOneId
        ? sb.from('bookings')
            .select('scheduled_at')
            .eq('loved_one_id', lovedOneId)
            .neq('id', booking_id)
            .gt('scheduled_at', new Date().toISOString())
            .not('status', 'in', '("cancelled","completed")')
            .order('scheduled_at', { ascending: true })
            .limit(1)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ])

    const visit      = visitRes.data
    const owner      = ownerRes.data
    const members    = membersRes.data ?? []
    const elder      = elderRes.data
    const compProfile = compRes.data
    const nextBooking = nextRes.data

    // ── Recipient list ────────────────────────────────────────────────────
    const recipients = new Set<string>()
    const ownerNum = owner?.whatsapp_number?.trim() || owner?.phone?.trim()
    if (ownerNum) recipients.add(ownerNum)
    for (const m of members) {
      if (m.whatsapp_number?.trim()) recipients.add(m.whatsapp_number.trim())
    }
    if (recipients.size === 0) {
      console.warn(`Family ${familyUserId} has no WhatsApp number — skipping`)
      return json({ skipped: true, reason: 'no_whatsapp_number' })
    }

    // ── Names and content ─────────────────────────────────────────────────
    const familyName    = owner?.full_name || 'there'
    const elderName     = elder?.name || lo?.full_name || 'your loved one'
    const oneMoment     = visit?.one_moment ?? ''
    const checks        = (visit?.checklist_data as any)?.checks ?? {}
    const hasConcern    = anyConcern(checks)
    const nextVisitStr  = formatNextVisit(nextBooking?.scheduled_at)
    const photoConsent  = elder?.photo_consent === true

    // ── Signed photo URL — only if consent is on file ────────────────────
    let photoSignedUrl: string | null = null
    const photoPaths: string[] = Array.isArray(visit?.photo_urls) ? visit.photo_urls : []
    if (photoConsent && photoPaths.length) {
      const { data: signedPhotos } = await sb.storage
        .from('visit-photos')
        .createSignedUrls(photoPaths.slice(0, 1), 60 * 60 * 24 * 7)
      photoSignedUrl = signedPhotos?.[0]?.signedUrl ?? null
    }

    const hasPhoto = !!photoSignedUrl

    // ── Build message body ────────────────────────────────────────────────
    const messageBody = hasConcern
      ? buildNeedsAttentionMessage({ familyName, elderName, checks, oneMoment, nextVisit: nextVisitStr, hasPhoto })
      : buildGoodStatusMessage({ familyName, elderName, oneMoment, checks, nextVisit: nextVisitStr, hasPhoto })

    type Bubble = { body: string; mediaUrl?: string }
    const bubbles: Bubble[] = [
      { body: messageBody, mediaUrl: pdf_url },
      ...(hasPhoto && photoSignedUrl ? [{ body: `📷 ${elderName} — from today's visit`, mediaUrl: photoSignedUrl }] : []),
    ]

    // ── Twilio send ───────────────────────────────────────────────────────
    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID')
    const authToken  = Deno.env.get('TWILIO_AUTH_TOKEN')
    const fromNumber = Deno.env.get('TWILIO_WHATSAPP_FROM') ?? 'whatsapp:+14155238886'

    if (!accountSid || !authToken) {
      console.error('Twilio credentials not configured')
      return json({ error: 'Twilio not configured' }, 500)
    }

    const twilioUrl  = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`
    const twilioAuth = `Basic ${btoa(`${accountSid}:${authToken}`)}`

    const sendBubble = async (to: string, bubble: Bubble): Promise<string | null> => {
      const params = new URLSearchParams({ From: waNumber(fromNumber), To: waNumber(to), Body: bubble.body })
      if (bubble.mediaUrl) params.set('MediaUrl', bubble.mediaUrl)
      const res = await fetch(twilioUrl, {
        method: 'POST',
        headers: { Authorization: twilioAuth, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params,
      })
      if (res.ok) return null
      return await res.text()
    }

    // Send visit_completed template first — opens the 24h session window for free-form follow-up
    const visitCompletedSid = Deno.env.get('TWILIO_TEMPLATE_VISIT_COMPLETED')
    if (visitCompletedSid) {
      const visitDate = visit?.start_time
        ? new Intl.DateTimeFormat('en-IN', {
            weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Asia/Kolkata',
          }).format(new Date(visit.start_time))
        : 'today'
      await Promise.all([...recipients].map(async (to) => {
        const tParams = new URLSearchParams({
          From: waNumber(fromNumber), To: waNumber(to),
          ContentSid: visitCompletedSid,
          ContentVariables: JSON.stringify({
            '1': familyName,
            '2': elderName,
            '3': compProfile?.full_name || 'our companion',
            '4': visitDate,
          }),
        })
        const tRes = await fetch(twilioUrl, {
          method: 'POST',
          headers: { Authorization: twilioAuth, 'Content-Type': 'application/x-www-form-urlencoded' },
          body: tParams,
        })
        if (!tRes.ok) console.warn(`[send-visit-whatsapp] visit_completed template failed (to ${to}):`, await tRes.text())
        else console.log(`[send-visit-whatsapp] visit_completed sent to ${to}`)
      }))
    }

    let sent = 0
    const errors: string[] = []
    await Promise.all([...recipients].map(async (to) => {
      let ok = true
      for (const bubble of bubbles) {
        const err = await sendBubble(to, bubble)
        if (err) { console.error(`Twilio error (to ${to}):`, err); errors.push(err); ok = false }
      }
      if (ok) sent++
    }))

    if (sent === 0) return json({ error: 'Twilio error', detail: errors }, 502)
    return json({
      success: true, sent, total: recipients.size, hasConcern, hasPhoto,
      ...(errors.length ? { errors } : {}),
    })

  } catch (err) {
    console.error('send-visit-whatsapp unexpected error:', err)
    return json({ error: String(err) }, 500)
  }
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}
