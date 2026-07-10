import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, checkOrigin } from "../_shared/cors.ts";

type PlanId = "companion" | "trust" | "family_os";

// Each plan maps to a Razorpay plan id held in a Supabase secret. Connect =
// companion, Care = trust (see lib/plans.ts). Adding a plan here is all the code
// needs; only the matching secret must be set in the Razorpay/Supabase dashboard.
const PLAN_ID_ENV_MAP: Record<PlanId, string> = {
  companion: "RAZORPAY_PLAN_ID_COMPANION",
  trust: "RAZORPAY_PLAN_ID_TRUST",
  family_os: "RAZORPAY_PLAN_ID_FAMILY_OS",
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
    return json({ error: "plan_id must be one of: companion, trust, family_os" }, 400);
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
  // UPGRADE SAFETY: if the caller already has an ACTIVE subscription, this is an
  // upgrade (e.g. Connect → Care). Do NOT overwrite the live row here — that would
  // (a) clobber the active membership the moment checkout opens (and strand it if
  // the user dismisses the sheet) and (b) point the row at an unpaid subscription.
  // We leave the active row untouched; the webhook promotes the plan and cancels
  // the old subscription only after the NEW one actually activates. The new
  // subscription still carries notes.user_id/notes.plan so the webhook can find
  // and promote the right row. For a fresh/pending member, upsert as before so the
  // row tracks the just-created ('created') subscription.
  const { data: existingSub } = await sb
    .from("subscriptions")
    .select("status")
    .eq("user_id", user.id)
    .maybeSingle();

  const isUpgrade = existingSub?.status === "active";

  if (!isUpgrade) {
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
  } else {
    console.log(
      `[create-subscription] upgrade for user ${user.id} → plan ${planId}; ` +
        `new sub ${sub.id} created, active row left intact (webhook will promote)`,
    );
  }

  return json({
    subscription_id: sub.id,
    key_id: Deno.env.get("RAZORPAY_KEY_ID")!,
    is_upgrade: isUpgrade,
  });
});
