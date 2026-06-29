// send-visit-reminder — triggered daily by pg_cron at 8 AM IST (2:30 AM UTC)
// Sends closeeye_visit_reminder to each family with a visit scheduled tomorrow.
// verify_jwt = false (cron source, no user JWT)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = { "Access-Control-Allow-Origin": "*" };
function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });

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

  const accountSid  = Deno.env.get("TWILIO_ACCOUNT_SID");
  const authToken   = Deno.env.get("TWILIO_AUTH_TOKEN");
  const fromNum     = Deno.env.get("TWILIO_WHATSAPP_FROM");
  const templateSid = Deno.env.get("TWILIO_TEMPLATE_VISIT_REMINDER");

  if (!accountSid || !authToken || !fromNum || !templateSid) {
    console.error("[send-visit-reminder] Missing Twilio credentials or template SID");
    return json({ error: "Twilio not configured" }, 500);
  }

  const twilioUrl  = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const twilioAuth = `Basic ${btoa(`${accountSid}:${authToken}`)}`;

  let sent = 0;
  for (const booking of bookings) {
    try {
      const lo = (booking as Record<string, unknown>).loved_ones as { full_name: string; family_user_id: string } | null;
      if (!lo?.family_user_id) continue;

      const { data: prof } = await sb.from("profiles").select("full_name, whatsapp_number").eq("id", lo.family_user_id).maybeSingle();
      const waNum = prof?.whatsapp_number?.trim();
      if (!waNum) continue;

      const to = waNum.startsWith("whatsapp:") ? waNum : `whatsapp:${waNum}`;
      const scheduledAt = (booking as Record<string, unknown>).scheduled_at as string;
      const dateStr = scheduledAt
        ? new Intl.DateTimeFormat("en-IN", {
            weekday: "long", day: "numeric", month: "long",
            hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata",
          }).format(new Date(scheduledAt))
        : "tomorrow";

      const params = new URLSearchParams({
        From: fromNum, To: to,
        ContentSid: templateSid,
        ContentVariables: JSON.stringify({
          "1": prof?.full_name || "there",
          "2": lo.full_name || "your loved one",
          "3": dateStr,
        }),
      });

      const res = await fetch(twilioUrl, {
        method: "POST",
        headers: { Authorization: twilioAuth, "Content-Type": "application/x-www-form-urlencoded" },
        body: params,
      });
      if (res.ok) {
        sent++;
        console.log(`[send-visit-reminder] Sent to ${to} for booking ${booking.id}`);
      } else {
        console.error(`[send-visit-reminder] Twilio error for ${to}:`, await res.text());
      }
    } catch (err) {
      console.error("[send-visit-reminder] Error for booking:", (booking as Record<string, unknown>).id, err);
    }
  }

  return json({ sent, total: bookings.length });
});
