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
import { sendWhatsAppTemplate } from '../_shared/whatsapp.ts'
import { corsHeaders, checkOrigin } from '../_shared/cors.ts'

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
  const cors = corsHeaders(req)
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })

  const originErr = checkOrigin(req)
  if (originErr) return originErr

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

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
    .select('*, loved_ones(full_name), companions(full_name)')
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
  const updates: Record<string, unknown> = { status: new_status, attention_needed: false, attention_alerted: false }
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

  const phone         = familyProfile?.whatsapp_number
  const familyName    = familyProfile?.full_name   || 'Family'
  const elderName     = booking.loved_ones?.full_name   || 'your loved one'
  const companionName = booking.companions?.full_name   || 'your Close Eye companion'
  const oldDateStr    = booking.scheduled_at ? formatIST(booking.scheduled_at) : 'your scheduled time'
  const newDateStr    = reschedule_time       ? formatIST(reschedule_time)       : oldDateStr

  if (phone) {
    try {
      switch (new_status) {
        case 'confirmed':
          // visit_confirmed vars: [name, companion, datetime]
          await sendWhatsAppTemplate({
            to: phone, template: 'visit_confirmed', sb,
            variables: [familyName, companionName, oldDateStr],
          })
          break

        case 'companion_assigned':
          // visit_reminder vars: [name, elder, datetime]
          await sendWhatsAppTemplate({
            to: phone, template: 'visit_reminder', sb,
            variables: [familyName, elderName, oldDateStr],
          })
          break

        case 'on_the_way':
          // visit_on_the_way vars: [family_name, parent_name, companion_name, visit_time]
          await sendWhatsAppTemplate({
            to: phone, template: 'visit_on_the_way', sb,
            variables: [familyName, elderName, companionName, oldDateStr],
          })
          break

        case 'delayed':
          // visit_delayed vars: [family_name, parent_name, companion_name, minutes_late, new_time]
          // `note` carries the delay amount (e.g. "30 minutes"); new_time is reschedule_time if set
          await sendWhatsAppTemplate({
            to: phone, template: 'visit_delayed', sb,
            variables: [familyName, elderName, companionName, note || 'a short while', newDateStr],
          })
          break

        case 'rescheduled':
          // visit_rescheduled vars: [family_name, parent_name, old_time, new_time, reason]
          // old_time = original scheduled_at read before the DB update
          await sendWhatsAppTemplate({
            to: phone, template: 'visit_rescheduled', sb,
            variables: [familyName, elderName, oldDateStr, newDateStr, note || 'scheduling change'],
          })
          break

        case 'cancelled':
          // visit_cancelled vars: [family_name, parent_name, original_time, reason, reattempt_time]
          // reschedule_time (if set) = admin-proposed reattempt slot; else "to be confirmed"
          await sendWhatsAppTemplate({
            to: phone, template: 'visit_cancelled', sb,
            variables: [familyName, elderName, oldDateStr, note || 'unforeseen circumstances', newDateStr !== oldDateStr ? newDateStr : 'to be confirmed'],
          })
          break

        // in_progress — family already knows (companion is there); no message needed.
        // completed   — handled by send-visit-whatsapp with the full visit report.
      }
    } catch (e) {
      console.error('[update-booking-status] WhatsApp send failed (non-fatal):', e)
    }
  }

  return json({ ok: true, booking_id, previous_status: booking.status, status: new_status })
})
