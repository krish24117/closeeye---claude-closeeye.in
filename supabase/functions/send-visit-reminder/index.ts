// send-visit-reminder — triggered daily by pg_cron at 8 AM IST (2:30 AM UTC)
// Sends closeeye_visit_reminder to each family with a visit scheduled tomorrow.
// verify_jwt = false (cron source, no user JWT)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendWhatsAppTemplate } from "../_shared/whatsapp.ts";
import { requireCronSecret } from "../_shared/cron-auth.ts";

const CORS = { "Access-Control-Allow-Origin": "*" };
function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  const denied = requireCronSecret(req); if (denied) return denied;

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  // Tomorrow's date window in IST (UTC+5:30)
  const now = new Date();
  const istOffsetMs = 5.5 * 60 * 60 * 1000;
  const todayIST = new Date(now.getTime() + istOffsetMs);

  const tomorrowISTStart = new Date(todayIST);
  tomorrowISTStart.setDate(tomorrowISTStart.getDate() + 1);
  tomorrowISTStart.setHours(0, 0, 0, 0);

  const tomorrowISTEnd = new Date(tomorrowISTStart);
  tomorrowISTEnd.setDate(tomorrowISTEnd.getDate() + 1);

  const startUTC = new Date(tomorrowISTStart.getTime() - istOffsetMs);
  const endUTC   = new Date(tomorrowISTEnd.getTime() - istOffsetMs);

  const { data: bookings, error } = await sb
    .from("bookings")
    .select("id, scheduled_at, companion_id, loved_ones!inner(full_name, family_user_id)")
    .gte("scheduled_at", startUTC.toISOString())
    .lt("scheduled_at", endUTC.toISOString())
    .not("status", "in", '("cancelled","completed")');

  if (error) {
    console.error("[send-visit-reminder] DB error:", error);
    return json({ error: error.message }, 500);
  }
  if (!bookings?.length) {
    console.log("[send-visit-reminder] No visits tomorrow");
    return json({ sent: 0 });
  }

  let sent = 0;
  for (const booking of bookings) {
    try {
      const lo = (booking as Record<string, unknown>).loved_ones as { full_name: string; family_user_id: string } | null;
      if (!lo?.family_user_id) continue;

      const { data: prof } = await sb.from("profiles").select("full_name, whatsapp_number").eq("id", lo.family_user_id).maybeSingle();
      const waNum = prof?.whatsapp_number?.trim();
      if (!waNum) continue;

      const scheduledAt = (booking as Record<string, unknown>).scheduled_at as string;
      const dateStr = scheduledAt
        ? new Intl.DateTimeFormat("en-IN", {
            weekday: "long", day: "numeric", month: "long",
            hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata",
          }).format(new Date(scheduledAt))
        : "tomorrow";

      const result = await sendWhatsAppTemplate({
        to: waNum,
        template: "visit_reminder",
        variables: [prof?.full_name || "there", lo.full_name || "your loved one", dateStr],
        sb,
      });
      if (result.success) sent++;
    } catch (err) {
      console.error("[send-visit-reminder] Error for booking:", (booking as Record<string, unknown>).id, err);
    }
  }

  return json({ sent, total: bookings.length });
});
