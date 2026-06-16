// Supabase Edge Function — send-visit-whatsapp
// Sends a Twilio WhatsApp message to the family with the visit PDF link.
//
// Required secrets (set via `supabase secrets set`):
//   TWILIO_ACCOUNT_SID
//   TWILIO_AUTH_TOKEN
//   TWILIO_WHATSAPP_FROM   e.g. whatsapp:+14155238886  (Twilio sandbox or production number)
//
// Auto-provided by Supabase runtime:
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  // ── Auth: only authenticated users may call this ──────────────────
  const jwt = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!jwt) {
    return new Response('Unauthorized', { status: 401, headers: CORS })
  }

  try {
    const { booking_id, pdf_url } = await req.json() as { booking_id?: string; pdf_url?: string }
    if (!booking_id || !pdf_url) {
      return json({ error: 'booking_id and pdf_url are required' }, 400)
    }

    const sb = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // ── Verify caller is the companion for this booking ───────────────
    const callerSb = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: `Bearer ${jwt}` } } }
    )
    const { data: { user } } = await callerSb.auth.getUser()
    if (!user) return new Response('Unauthorized', { status: 401, headers: CORS })

    // ── Fetch booking with related data ───────────────────────────────
    const { data: booking, error: bErr } = await sb
      .from('bookings')
      .select(`
        id,
        companion_id,
        loved_ones ( full_name, city, family_user_id ),
        companions ( full_name )
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

    // ── Get family's WhatsApp number ───────────────────────────────────
    const familyUserId = (booking.loved_ones as any)?.family_user_id
    if (!familyUserId) {
      return json({ skipped: true, reason: 'no_family_user' })
    }

    const { data: profile } = await sb
      .from('profiles')
      .select('phone')
      .eq('id', familyUserId)
      .single()

    if (!profile?.phone) {
      console.warn(`Family ${familyUserId} has no phone — skipping WhatsApp`)
      return json({ skipped: true, reason: 'no_phone' })
    }

    // ── Build message ─────────────────────────────────────────────────
    const lovedOneName  = (booking.loved_ones as any)?.full_name  ?? 'your loved one'
    const city          = (booking.loved_ones as any)?.city        ?? ''
    const companionName = (booking.companions as any)?.full_name   ?? 'your companion'

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

    // ── Call Twilio ───────────────────────────────────────────────────
    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID')
    const authToken  = Deno.env.get('TWILIO_AUTH_TOKEN')
    const fromNumber = Deno.env.get('TWILIO_WHATSAPP_FROM') ?? 'whatsapp:+14155238886'

    if (!accountSid || !authToken) {
      console.error('Twilio credentials not configured')
      return json({ error: 'Twilio not configured' }, 500)
    }

    const toNumber = profile.phone.startsWith('whatsapp:')
      ? profile.phone
      : `whatsapp:${profile.phone}`

    const params = new URLSearchParams({
      From:     fromNumber,
      To:       toNumber,
      Body:     body,
      MediaUrl: pdf_url,
    })

    const twilioRes = await fetch(
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

    const twilioBody = await twilioRes.json()
    if (!twilioRes.ok) {
      console.error('Twilio error:', twilioBody)
      return json({ error: 'Twilio error', detail: twilioBody }, 502)
    }

    return json({ success: true, sid: twilioBody.sid })

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
