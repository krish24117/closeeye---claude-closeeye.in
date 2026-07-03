import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, checkOrigin } from "../_shared/cors.ts";

type Action = "pause" | "resume" | "cancel";

function razorpayAuth(): string {
  return `Basic ${btoa(`${Deno.env.get("RAZORPAY_KEY_ID")!}:${Deno.env.get("RAZORPAY_KEY_SECRET")!}`)}`;
}

const ACTION_STATUS_MAP: Record<Action, string> = {
  pause: "paused",
  resume: "active",
  cancel: "cancelled",
};

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
  let body: { action?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const action = body.action as Action | undefined;
  if (!action || !["pause", "resume", "cancel"].includes(action)) {
    return json({ error: "action must be one of: pause, resume, cancel" }, 400);
  }

  const sb = createClient(supabaseUrl, supabaseServiceKey);

  // ── Get caller's subscription ─────────────────────────────────────────────
  const { data: subscription, error: subErr } = await sb
    .from("subscriptions")
    .select("id, razorpay_subscription_id, status")
    .eq("user_id", user.id)
    .single();

  if (subErr || !subscription) {
    return json({ error: "No subscription found" }, 404);
  }

  if (!subscription.razorpay_subscription_id) {
    return json({ error: "Subscription has no Razorpay ID" }, 404);
  }

  const rzSubId = subscription.razorpay_subscription_id as string;

  // ── Call Razorpay API ─────────────────────────────────────────────────────
  let rzEndpoint: string;
  let rzBody: Record<string, unknown>;

  switch (action) {
    case "pause":
      rzEndpoint = `https://api.razorpay.com/v1/subscriptions/${rzSubId}/pause`;
      rzBody = { pause_at: "now" };
      break;
    case "resume":
      rzEndpoint = `https://api.razorpay.com/v1/subscriptions/${rzSubId}/resume`;
      rzBody = { resume_at: "now" };
      break;
    case "cancel":
      rzEndpoint = `https://api.razorpay.com/v1/subscriptions/${rzSubId}/cancel`;
      rzBody = { cancel_at_cycle_end: 1 };
      break;
  }

  const rzRes = await fetch(rzEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: razorpayAuth(),
    },
    body: JSON.stringify(rzBody),
  });

  if (!rzRes.ok) {
    const errText = await rzRes.text();
    console.error(`Razorpay ${action} failed:`, errText);
    return json({ error: "Razorpay error", detail: errText }, 502);
  }

  // ── Update local subscriptions table ─────────────────────────────────────
  const newStatus = ACTION_STATUS_MAP[action];
  const { error: updateErr } = await sb
    .from("subscriptions")
    .update({ status: newStatus })
    .eq("id", subscription.id);

  if (updateErr) {
    console.error("subscriptions update error:", updateErr);
    return json({ error: "DB update failed", detail: updateErr.message }, 500);
  }

  return json({ success: true, action, status: newStatus });
});
