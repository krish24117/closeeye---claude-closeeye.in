import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, checkOrigin } from "../_shared/cors.ts";

// Founding membership — one-time ₹100. Creates the Razorpay order SERVER-SIDE.
// The amount is fixed here (never trusted from the client). Membership is marked
// 'active' only after razorpay-verify-membership confirms the signature.

const MEMBERSHIP_PAISE = 10000; // ₹100

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

  const sb = createClient(supabaseUrl, supabaseServiceKey);

  // Create the pending membership row first
  const { data: membership, error: mErr } = await sb
    .from("memberships")
    .insert({ user_id: user.id, amount_paise: MEMBERSHIP_PAISE, status: "pending" })
    .select("id")
    .single();

  if (mErr || !membership) {
    console.error("membership insert error:", mErr);
    return json({ error: "Could not start membership" }, 500);
  }

  // Create the Razorpay order
  const rzRes = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: razorpayAuth() },
    body: JSON.stringify({
      amount: MEMBERSHIP_PAISE,
      currency: "INR",
      receipt: `mem_${membership.id.slice(0, 20)}`,
      notes: { membership_id: membership.id, user_id: user.id, kind: "founding_membership" },
    }),
  });

  if (!rzRes.ok) {
    const errText = await rzRes.text();
    console.error("Razorpay order creation failed:", errText);
    await sb.from("memberships").delete().eq("id", membership.id);
    return json({ error: "Payment gateway error" }, 502);
  }

  const order = await rzRes.json();
  const { error: linkErr } = await sb.from("memberships").update({ razorpay_order_id: order.id }).eq("id", membership.id);
  if (linkErr) {
    console.error("[create-membership] CRITICAL: failed to link razorpay_order_id — webhook activation will fail:", linkErr);
  }

  return json({
    order_id: order.id,
    membership_id: membership.id,
    amount: order.amount,
    currency: order.currency,
    key_id: Deno.env.get("RAZORPAY_KEY_ID")!,
  });
});
