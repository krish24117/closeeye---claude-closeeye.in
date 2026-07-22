// send-monthly-summary — triggered by pg_cron on the 1st of each month at 9 AM IST (3:30 AM UTC)
// Sends closeeye_monthly_summary to each family that had completed visits last month.
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

  // Last month's UTC date range
  const now = new Date();
  const lastMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const lastMonthEnd   = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const lastMonthName  = new Intl.DateTimeFormat("en-IN", {
    month: "long", year: "numeric", timeZone: "Asia/Kolkata",
  }).format(lastMonthStart);

  const { data: bookings, error } = await sb
    .from("bookings")
    .select("id, loved_ones!inner(full_name, family_user_id)")
    .eq("status", "completed")
    .gte("completed_at", lastMonthStart.toISOString())
    .lt("completed_at", lastMonthEnd.toISOString());

  if (error) {
    console.error("[send-monthly-summary] DB error:", error);
    return json({ error: error.message }, 500);
  }
  if (!bookings?.length) {
    console.log("[send-monthly-summary] No completed visits last month");
    return json({ sent: 0 });
  }

  // Group visits by family
  const familyMap: Record<string, { elderNames: Set<string>; count: number }> = {};
  for (const b of bookings) {
    const lo = (b as Record<string, unknown>).loved_ones as { full_name: string; family_user_id: string } | null;
    if (!lo?.family_user_id) continue;
    const fid = lo.family_user_id;
    if (!familyMap[fid]) familyMap[fid] = { elderNames: new Set(), count: 0 };
    familyMap[fid].elderNames.add(lo.full_name || "your loved one");
    familyMap[fid].count++;
  }

  let sent = 0;
  for (const [familyUserId, stats] of Object.entries(familyMap)) {
    try {
      const { data: prof } = await sb.from("profiles").select("full_name, whatsapp_number").eq("id", familyUserId).maybeSingle();
      const waNum = prof?.whatsapp_number?.trim();
      if (!waNum) continue;

      const elderDisplay = stats.elderNames.size === 1
        ? [...stats.elderNames][0]
        : "your loved ones";

      const result = await sendWhatsAppTemplate({
        to: waNum,
        template: "monthly_summary",
        variables: [prof?.full_name || "there", elderDisplay, String(stats.count), lastMonthName],
        sb,
      });
      if (result.success) sent++;
    } catch (err) {
      console.error("[send-monthly-summary] Error for family:", familyUserId, err);
    }
  }

  return json({ sent, totalFamilies: Object.keys(familyMap).length });
});
