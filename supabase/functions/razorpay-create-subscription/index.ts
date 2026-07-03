import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, checkOrigin } from "../_shared/cors.ts";

type PlanId = "companion";

const PLAN_ID_ENV_MAP: Record<PlanId, string> = {
  companion: "RAZORPAY_PLAN_ID_COMPANION",
};

function razorpayAuth(): string {
  return `Basic ${btoa(`${Deno.env.get("RAZORPAY_KEY_ID")!}:${Deno.env.get("RAZORPAY_KEY_SECRET")!}`)}`;
}

Deno.serve(async (req: Request) => {
  const cors = corsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: cors });
  }

  const originErr = checkOrigin(req);
  if (originErr) return originErr;

  const json = (body: unknown, status = 200): Response =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...cors, "Content-Type": "application/json" },
    });

  // ── Auth ──────────────────────────────────────────────────────────────────
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Missing Authorization header" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const callerSb = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: userErr } = await callerSb.auth.getUser();
  if (userErr || !user) return json({ error: "Unauthorized" }, 401);

  // ── Parse body ────────────────────────────────────────────────────────────
  let body: { plan_id?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const planId = body.plan_id as PlanId | undefined;
  if (!planId || !PLAN_ID_ENV_MAP[planId]) {
    return json({ error: "plan_id must be: companion" }, 400);
  }

  const razorpayPlanId = Deno.env.get(PLAN_ID_ENV_MAP[planId]);
  if (!razorpayPlanId) {
    return json({ error: `Razorpay plan ID not configured for ${planId}` }, 500);
  }

  // ── Get user profile ──────────────────────────────────────────────────────
  const sb = createClient(supabaseUrl, supabaseServiceKey);

  const { data: authUserRow, error: authUserErr } = await sb.auth.admin.getUserById(user.id);
  if (authUserErr || !authUserRow?.user) {
    return json({ error: "Could not fetch user" }, 500);
  }
  const userEmail = authUserRow.user.email ?? "";

  const { data: profile, error: profileErr } = await sb
    .from("profiles")
    .select("full_name, phone, whatsapp_number")
    .eq("id", user.id)
    .single();

  if (profileErr || !profile) {
    return json({ error: "Profile not found" }, 404);
  }

  const notifyPhone = profile.phone || profile.whatsapp_number || "";

  // ── Create Razorpay subscription ──────────────────────────────────────────
  const rzRes = await fetch("https://api.razorpay.com/v1/subscriptions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: razorpayAuth(),
    },
    body: JSON.stringify({
      plan_id: razorpayPlanId,
      total_count: 120,
      quantity: 1,
      notify_info: {
        notify_phone: notifyPhone,
        notify_email: userEmail,
      },
      notes: {
        user_id: user.id,
        plan: planId,
      },
    }),
  });

  if (!rzRes.ok) {
    const errText = await rzRes.text();
    console.error("Razorpay subscription creation failed:", errText);
    return json({ error: "Razorpay error", detail: errText }, 502);
  }

  const sub = await rzRes.json();

  // ── Upsert into subscriptions table ──────────────────────────────────────
  const { error: upsertErr } = await sb
    .from("subscriptions")
    .upsert(
      {
        user_id: user.id,
        plan_id: planId,
        razorpay_subscription_id: sub.id,
        status: sub.status,
      },
      { onConflict: "user_id" },
    );

  if (upsertErr) {
    console.error("subscriptions upsert error:", upsertErr);
    // Non-fatal — Razorpay subscription was created
  }

  return json({
    subscription_id: sub.id,
    key_id: Deno.env.get("RAZORPAY_KEY_ID")!,
  });
});
