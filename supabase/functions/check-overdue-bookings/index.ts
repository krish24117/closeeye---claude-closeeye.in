// check-overdue-bookings — cron job to flag bookings that haven't progressed.
//
// Flags bookings where status is still 'confirmed', 'companion_assigned', or
// 'on_the_way' AND the scheduled_at is > 30 minutes in the past. Admin sees
// a ⚠ badge on those bookings in the dashboard.
//
// Schedule in Supabase Dashboard → Database → Cron Jobs:
//   Name:     check-overdue-bookings
//   Schedule: */15 * * * *   (every 15 minutes)
//   Command:  SELECT net.http_post(
//               url := '<project-url>/functions/v1/check-overdue-bookings',
//               headers := '{"Authorization": "Bearer <service-role-key>"}'::jsonb
//             );
//
// Or call manually via POST (with service-role auth) to trigger immediately.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })

  const sb = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const { data: flagged, error } = await sb.rpc('flag_overdue_bookings', {
    threshold_minutes: 30,
  })

  if (error) {
    console.error('[check-overdue] rpc error:', error)
    return json({ error: error.message }, 500)
  }

  console.log(`[check-overdue] flagged ${flagged} bookings as needing attention`)
  return json({ ok: true, flagged })
})
