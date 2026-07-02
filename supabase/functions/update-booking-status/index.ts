// update-booking-status — central hub for all booking status transitions.
//
// Validates caller (admin or assigned companion), validates the transition,
// updates bookings.status + records history, clears attention_needed,
// and fires the appropriate WhatsApp notification to the family.
//
// POST { booking_id, new_status, note?, reschedule_time? }
//   booking_id      — uuid
//   new_status      — one of the allowed status values
//   note            — optional text (required for: delayed, rescheduled, cancelled)
//   reschedule_time — ISO timestamptz (required when new_status = 'rescheduled')
//
// Auth: JWT must belong to an admin profile OR the companion assigned to the booking.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { sendWhatsAppTemplate, sendWhatsAppFreeText } from '../_shared/whatsapp.ts'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

// Valid forward/exception transitions per status
const TRANSITIONS: Record<string, string[]> = {
  pending:            ['confirmed', 'cancelled'],
  requested:          ['confirmed', 'cancelled'],
  confirmed:          ['companion_assigned', 'delayed', 'rescheduled', 'cancelled'],
  companion_assigned: ['on_the_way', 'delayed', 'rescheduled', 'cancelled'],
  on_the_way:         ['in_progress', 'delayed'],
  in_progress:        ['completed', 'delayed'],
  delayed:            ['companion_assigned', 'on_the_way', 'in_progress', 'rescheduled', 'cancelled'],
  rescheduled:        ['confirmed', 'companion_assigned', 'cancelled'],
  // completed and cancelled are terminal — not in this map
}

function formatIST(iso: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long',
    hour: 'numeric', minute: '2-digit', hour12: true,
    timeZone: 'Asia/Kolkata',
  }).format(new Date(iso))
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })

  // ── Service-role client (full DB access) ─────────────────────────────────
  const sb = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  // ── Authenticate caller ───────────────────────────────────────────────────
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return json({ error: 'Missing Authorization header' }, 401)

  const sbAuth = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  )
  const { data: { user }, error: authErr } = await sbAuth.auth.getUser()
  if (authErr || !user) return json({ error: 'Unauthorized' }, 401)

  // ── Caller profile ────────────────────────────────────────────────────────
  const { data: callerProfile } = await sb
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  const isAdmin = callerProfile?.role === 'admin'

  // ── Parse body ────────────────────────────────────────────────────────────
  let body: {
    booking_id: string
    new_status: string
    note?: string
    reschedule_time?: string
  }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }

  const { booking_id, new_status, note, reschedule_time } = body
  if (!booking_id || !new_status) return json({ error: 'booking_id and new_status required' }, 400)

  // ── Load booking ──────────────────────────────────────────────────────────
  const { data: booking, error: bookingErr } = await sb
    .from('bookings')
    .select('*, loved_ones(full_name)')
    .eq('id', booking_id)
    .single()

  if (bookingErr || !booking) return json({ error: 'Booking not found' }, 404)

  // ── Permission: admin or assigned companion ───────────────────────────────
  if (!isAdmin && booking.companion_id !== user.id) {
    return json({ error: 'Forbidden — not your booking' }, 403)
  }

  // ── Validate transition ───────────────────────────────────────────────────
  const allowed = TRANSITIONS[booking.status]
  if (!allowed) {
    return json({ error: `"${booking.status}" is a terminal state with no further transitions` }, 400)
  }
  if (!allowed.includes(new_status)) {
    return json({
      error: `Cannot transition from "${booking.status}" to "${new_status}". Allowed: ${allowed.join(', ')}`,
    }, 400)
  }

  // ── Build update ──────────────────────────────────────────────────────────
  const updates: Record<string, unknown> = { status: new_status, attention_needed: false }
  if (new_status === 'rescheduled' && reschedule_time) {
    updates.reschedule_time = reschedule_time
    updates.scheduled_at    = reschedule_time   // move the canonical scheduled_at
  }

  const { error: updateErr } = await sb.from('bookings').update(updates).eq('id', booking_id)
  if (updateErr) return json({ error: updateErr.message }, 500)

  // ── Record history ────────────────────────────────────────────────────────
  await sb.from('booking_status_history').insert({
    booking_id,
    status:     new_status,
    changed_by: user.id,
    note:       note || null,
  })

  // ── WhatsApp notification ─────────────────────────────────────────────────
  // Fetch family's WhatsApp number from profiles
  const { data: familyProfile } = await sb
    .from('profiles')
    .select('full_name, whatsapp_number')
    .eq('id', booking.family_user_id)
    .single()

  const phone      = familyProfile?.whatsapp_number
  const familyName = familyProfile?.full_name || 'Family'
  const elderName  = booking.loved_ones?.full_name || 'your loved one'
  const refTime    = reschedule_time || booking.scheduled_at
  const dateStr    = refTime ? formatIST(refTime) : 'your scheduled time'

  if (phone) {
    try {
      switch (new_status) {
        case 'confirmed':
          await sendWhatsAppTemplate({
            to: phone,
            template: 'visit_confirmed',
            variables: [familyName, 'your Close Eye companion', dateStr],
            sb,
          })
          break

        case 'companion_assigned':
          await sendWhatsAppTemplate({
            to: phone,
            template: 'visit_reminder',
            variables: [familyName, elderName, dateStr],
            sb,
          })
          break

        case 'on_the_way':
          await sendWhatsAppFreeText({
            to: phone,
            body: `Hi ${familyName} 👋 Your Close Eye companion is on the way to visit ${elderName}. They should arrive shortly.`,
            sb, tag: 'visit_on_the_way',
          })
          break

        case 'delayed': {
          const noteStr = note ? ` (${note})` : ''
          await sendWhatsAppFreeText({
            to: phone,
            body: `Hi ${familyName}, there is a small delay for ${elderName}'s Close Eye visit today${noteStr}. We will keep you updated. For anything urgent, contact us directly.`,
            sb, tag: 'visit_delayed',
          })
          break
        }

        case 'rescheduled': {
          const newDateStr = reschedule_time ? formatIST(reschedule_time) : 'a new time'
          await sendWhatsAppFreeText({
            to: phone,
            body: `Hi ${familyName}, ${elderName}'s Close Eye visit has been rescheduled to ${newDateStr}. We will confirm companion details shortly. We apologise for the change.`,
            sb, tag: 'visit_rescheduled',
          })
          break
        }

        case 'cancelled': {
          const reasonStr = note ? ` Reason: ${note}.` : ''
          await sendWhatsAppFreeText({
            to: phone,
            body: `Hi ${familyName}, your Close Eye visit for ${elderName} has been cancelled.${reasonStr} Please contact us to rebook at your convenience.`,
            sb, tag: 'visit_cancelled',
          })
          break
        }

        // in_progress — family already knows (companion is there); no message needed.
        // completed   — handled by send-visit-whatsapp with the full report.
      }
    } catch (e) {
      console.error('[update-booking-status] WhatsApp send failed (non-fatal):', e)
    }
  }

  return json({ ok: true, booking_id, previous_status: booking.status, status: new_status })
})
