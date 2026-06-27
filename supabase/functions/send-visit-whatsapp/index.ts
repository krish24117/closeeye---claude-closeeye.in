// Supabase Edge Function — send-visit-whatsapp
// Sends a multi-bubble Twilio WhatsApp report to the family after a completed visit.
//
// Bubble order:
//   1. Visit summary (date, time, duration, companion)
//   2. A moment from today (one_moment field)
//   3. Health snapshot (checklist tier1)
//   4. Photo — sent as WhatsApp image via MediaUrl (skipped if none)
//   5. Full PDF report + warm sign-off
//
// Recipients: the family owner's whatsapp_number plus any family_members who
// opted into visit alerts (notify_visits = true). NOTE: reads `whatsapp_number`
// — the column the app actually populates — not the legacy `phone` column.
//
// Required secrets (set via `supabase secrets set`):
//   TWILIO_ACCOUNT_SID
//   TWILIO_AUTH_TOKEN
//   TWILIO_WHATSAPP_FROM   e.g. whatsapp:+14155238886  (Twilio sandbox or production number)
//
// Auto-provided by Supabase runtime:
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
//   SUPABASE_ANON_KEY

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function waNumber(raw: string): string {
  const t = raw.trim()
  return t.startsWith('whatsapp:') ? t : `whatsapp:${t}`
}

function firstNameOf(full: string): string {
  return full.trim().split(/\s+/)[0] || full
}

function yn(v: boolean | null | undefined, good: string, bad: string): string {
  if (v === true) return good
  if (v === false) return bad
  return '— Not recorded'
}

function formatIndiaDateTime(iso: string): { date: string; time: string } {
  const d = new Date(iso)
  const date = new Intl.DateTimeFormat('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Asia/Kolkata',
  }).format(d)
  const time = new Intl.DateTimeFormat('en-IN', {
    hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata',
  }).format(d)
  return { date, time }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  // ── Auth: only authenticated users may call this ──────────────────
  const jwt = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!jwt) return new Response('Unauthorized', { status: 401, headers: CORS })

  try {
    const { booking_id, pdf_url } = await req.json() as { booking_id?: string; pdf_url?: string }
    if (!booking_id || !pdf_url) {
      return json({ error: 'booking_id and pdf_url are required' }, 400)
    }

    const url = Deno.env.get('SUPABASE_URL')!
    const sb = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    // ── Verify caller ─────────────────────────────────────────────────
    const callerSb = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    })
    const { data: { user } } = await callerSb.auth.getUser()
    if (!user) return new Response('Unauthorized', { status: 401, headers: CORS })

    // ── Fetch booking with related data ───────────────────────────────
    const { data: booking, error: bErr } = await sb
      .from('bookings')
      .select(`
        id,
        companion_id,
        loved_ones ( full_name, city, family_user_id )
      `)
      .eq('id', booking_id)
      .single()

    if (bErr || !booking) {
      return json({ error: 'Booking not found' }, 404)
    }

    // Only the assigned companion or an admin may trigger this
    const { data: callerProfile } = await sb
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const isAdmin = callerProfile?.role === 'admin'
    if (!isAdmin && booking.companion_id !== user.id) {
      return json({ error: 'Forbidden' }, 403)
    }

    // ── Fetch visit content for message bubbles ───────────────────────
    const { data: visit } = await sb
      .from('visits')
      .select('one_moment, checklist_data, photo_urls, start_time, end_time')
      .eq('booking_id', booking_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    // ── Build recipient list ──────────────────────────────────────────
    const familyUserId = (booking.loved_ones as any)?.family_user_id
    if (!familyUserId) {
      return json({ skipped: true, reason: 'no_family_user' })
    }

    const { data: owner } = await sb
      .from('profiles')
      .select('whatsapp_number, phone')
      .eq('id', familyUserId)
      .single()

    const { data: members } = await sb
      .from('family_members')
      .select('whatsapp_number')
      .eq('family_user_id', familyUserId)
      .eq('notify_visits', true)

    const recipients = new Set<string>()
    const ownerNum = owner?.whatsapp_number?.trim() || owner?.phone?.trim()
    if (ownerNum) recipients.add(ownerNum)
    for (const m of members ?? []) {
      if (m.whatsapp_number?.trim()) recipients.add(m.whatsapp_number.trim())
    }

    if (recipients.size === 0) {
      console.warn(`Family ${familyUserId} has no WhatsApp number — skipping`)
      return json({ skipped: true, reason: 'no_whatsapp_number' })
    }

    // ── Companion name from profiles (always populated by handle_new_user) ──
    const { data: compProfile } = await sb
      .from('profiles')
      .select('full_name')
      .eq('id', booking.companion_id)
      .single()

    // ── Names, visit meta, health data ───────────────────────────────
    const lovedOneName  = (booking.loved_ones as any)?.full_name ?? 'your loved one'
    const city          = (booking.loved_ones as any)?.city       ?? ''
    const companionName = compProfile?.full_name                  ?? 'your companion'
    const elderFirst    = firstNameOf(lovedOneName)

    const tier1     = (visit?.checklist_data as any)?.tier1 ?? {}
    const oneMoment = visit?.one_moment ?? ''

    const durationMin = visit?.start_time && visit?.end_time
      ? Math.round(
          (new Date(visit.end_time).getTime() - new Date(visit.start_time).getTime()) / 60000
        )
      : null

    const { date: dateStr, time: timeStr } = visit?.start_time
      ? formatIndiaDateTime(visit.start_time)
      : { date: 'Today', time: '' }

    // ── Signed photo URL (first photo only, 7-day validity) ──────────
    let photoSignedUrl: string | null = null
    const photoPaths: string[] = Array.isArray(visit?.photo_urls) ? visit.photo_urls : []
    if (photoPaths.length) {
      const { data: signedPhotos } = await sb.storage
        .from('visit-photos')
        .createSignedUrls(photoPaths.slice(0, 1), 60 * 60 * 24 * 7)
      photoSignedUrl = signedPhotos?.[0]?.signedUrl ?? null
    }

    // ── Assemble message bubbles ──────────────────────────────────────
    const summaryLines = [
      `📅 ${dateStr}${timeStr ? `, ${timeStr}` : ''}${durationMin ? ` | ⏱ ${durationMin} min` : ''}`,
      `👤 Companion: ${companionName}`,
      city ? `📍 ${city}` : null,
    ].filter(Boolean).join('\n')

    const healthLines = [
      `*How ${elderFirst} is today:*`,
      yn(tier1.mood,      '😊 Comfortable and settled',               '⚠️ Seemed unsettled — please check in'),
      yn(tier1.eating,    '✅ Eaten today',                            '⚠️ Missed a meal — please follow up'),
      yn(tier1.medicines, '💊 All medicines taken on schedule',        '⚠️ Medicines not taken — please follow up'),
      yn(tier1.home,      '🏠 Home is clean and safe',                '⚠️ Home safety concern — see full report'),
    ].join('\n')

    type Bubble = { body: string; mediaUrl?: string }

    const bubbles: Bubble[] = [
      // 1: Visit summary
      { body: `✅ *Close Eye — Visit Complete*\n\n${summaryLines}` },

      // 2: The one moment — most valuable, shown early (skip if empty)
      ...(oneMoment ? [{ body: `💛 *A moment from today*\n\n${oneMoment}` }] : []),

      // 3: Health snapshot
      { body: healthLines },

      // 4: Photo as WhatsApp image (skip if none)
      ...(photoSignedUrl ? [{ body: `📸 From today's visit`, mediaUrl: photoSignedUrl }] : []),

      // 5: Full PDF + warm sign-off
      {
        body: [
          `📋 *Full visit report (photos, scores & notes):*`,
          ``,
          `We'll check in on ${elderFirst} again soon. — Team Close Eye 🌿`,
          `_Reply here or call us: +91 90002 21261_`,
        ].join('\n'),
        mediaUrl: pdf_url,
      },
    ]

    // ── Twilio: send all bubbles per recipient, parallel across recipients ──
    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID')
    const authToken  = Deno.env.get('TWILIO_AUTH_TOKEN')
    const fromNumber = Deno.env.get('TWILIO_WHATSAPP_FROM') ?? 'whatsapp:+14155238886'

    if (!accountSid || !authToken) {
      console.error('Twilio credentials not configured')
      return json({ error: 'Twilio not configured' }, 500)
    }

    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`
    const twilioAuth = `Basic ${btoa(`${accountSid}:${authToken}`)}`

    const sendBubble = async (to: string, bubble: Bubble): Promise<string | null> => {
      const params = new URLSearchParams({
        From: waNumber(fromNumber),
        To:   waNumber(to),
        Body: bubble.body,
      })
      if (bubble.mediaUrl) params.set('MediaUrl', bubble.mediaUrl)
      const res = await fetch(twilioUrl, {
        method:  'POST',
        headers: { Authorization: twilioAuth, 'Content-Type': 'application/x-www-form-urlencoded' },
        body:    params,
      })
      if (res.ok) return null
      return await res.text()
    }

    let sent = 0
    const errors: string[] = []

    await Promise.all([...recipients].map(async (to) => {
      let recipientOk = true
      for (const bubble of bubbles) {
        const err = await sendBubble(to, bubble)
        if (err) {
          console.error(`Twilio error (to ${to}):`, err)
          errors.push(err)
          recipientOk = false
        }
      }
      if (recipientOk) sent++
    }))

    if (sent === 0) {
      return json({ error: 'Twilio error', detail: errors }, 502)
    }
    return json({ success: true, sent, total: recipients.size, ...(errors.length ? { errors } : {}) })

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
