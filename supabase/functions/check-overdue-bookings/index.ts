// check-overdue-bookings — cron job (every 15 min) that:
//   1. Calls flag_overdue_bookings() to mark any visit > 30 min past scheduled time as attention_needed.
//   2. For each newly flagged booking (attention_alerted = false), sends a WhatsApp alert to all admins.
//   3. Marks those bookings attention_alerted = true so the alert fires exactly once per incident.
//
// Schedule via Supabase Dashboard → Database → Cron Jobs:
//   Name:     check-overdue-bookings
//   Schedule: */15 * * * *
//   Type:     Database function → public.flag_overdue_bookings
//   (The cron calls flag_overdue_bookings directly; this edge function is for the alert layer.)
//
// OR call manually via POST to trigger immediately during testing.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { sendWhatsAppFreeText } from '../_shared/whatsapp.ts'

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

function formatIST(iso: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short',
    hour: 'numeric', minute: '2-digit', hour12: true,
    timeZone: 'Asia/Kolkata',
  }).format(new Date(iso))
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })

  const sb = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  // ── Step 1: Flag overdue bookings ─────────────────────────────────────────
  const { data: flagged, error: flagErr } = await sb.rpc('flag_overdue_bookings', {
    threshold_minutes: 30,
  })

  if (flagErr) {
    console.error('[check-overdue] rpc error:', flagErr)
    return json({ error: flagErr.message }, 500)
  }

  console.log(`[check-overdue] flagged ${flagged} bookings as needing attention`)

  // ── Step 2: Alert admins for newly flagged bookings ───────────────────────
  const { data: overdueBookings } = await sb
    .from('bookings')
    .select('id, service_type, scheduled_at, loved_ones(full_name)')
    .eq('attention_needed', true)
    .eq('attention_alerted', false)

  if (overdueBookings?.length) {
    const { data: admins } = await sb
      .from('profiles')
      .select('whatsapp_number, full_name')
      .eq('role', 'admin')
      .not('whatsapp_number', 'is', null)

    if (admins?.length) {
      const list = overdueBookings.map(b => {
        const elder = (b.loved_ones as { full_name: string } | null)?.full_name ?? 'unknown'
        const time  = b.scheduled_at ? formatIST(b.scheduled_at) : 'unknown time'
        return `• ${elder} — ${b.service_type ?? 'visit'} at ${time}`
      }).join('\n')

      const alertBody = `⚠️ CloseEye Alert: ${overdueBookings.length} visit(s) need attention — past scheduled time with no update:\n\n${list}\n\nPlease update status from the admin dashboard.`

      for (const admin of admins) {
        await sendWhatsAppFreeText({
          to:  admin.whatsapp_number,
          body: alertBody,
          sb,
          tag: 'admin_overdue_alert',
        })
      }
    }

    // ── Step 3: Mark as alerted so this alert doesn't fire again ─────────────
    const ids = overdueBookings.map(b => b.id)
    await sb.from('bookings').update({ attention_alerted: true }).in('id', ids)

    console.log(`[check-overdue] alerted admins for ${overdueBookings.length} booking(s)`)
  }

  return json({ ok: true, flagged, alerted: overdueBookings?.length ?? 0 })
})
