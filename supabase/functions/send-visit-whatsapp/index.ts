// Supabase Edge Function — send-visit-whatsapp
// Sends a Twilio WhatsApp message to the family with the visit PDF link.
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

    // ── Build message ─────────────────────────────────────────────────
    const lovedOneName  = (booking.loved_ones as any)?.full_name ?? 'your loved one'
    const city          = (booking.loved_ones as any)?.city       ?? ''
    const companionName = compProfile?.full_name                  ?? 'your companion'

    const body = [
      `✅ *Close Eye — Visit Complete*`,
      ``,
      `Your companion *${companionName}* has completed a visit with *${lovedOneName}*${city ? ` in ${city}` : ''}.`,
      ``,
      `📋 *Full visit report (photos, scores & notes):*`,
      pdf_url,
      ``,
      `_This report was auto-generated and verified by Close Eye._`,
      `Reply to this message or call us: +91 90002 21261`,
    ].join('\n')

    // ── Twilio ────────────────────────────────────────────────────────
    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID')
    const authToken  = Deno.env.get('TWILIO_AUTH_TOKEN')
    const fromNumber = Deno.env.get('TWILIO_WHATSAPP_FROM') ?? 'whatsapp:+14155238886'

    if (!accountSid || !authToken) {
      console.error('Twilio credentials not configured')
      return json({ error: 'Twilio not configured' }, 500)
    }

    let sent = 0
    const errors: string[] = []
    await Promise.all([...recipients].map(async (to) => {
      const params = new URLSearchParams({
        From:     waNumber(fromNumber),
        To:       waNumber(to),
        Body:     body,
        MediaUrl: pdf_url,
      })
      const res = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
        {
          method:  'POST',
          headers: {
            Authorization:  `Basic ${btoa(`${accountSid}:${authToken}`)}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: params,
        }
      )
      if (res.ok) {
        sent++
      } else {
        const detail = await res.text()
        console.error(`Twilio error sending to ${to}:`, detail)
        errors.push(detail)
      }
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
