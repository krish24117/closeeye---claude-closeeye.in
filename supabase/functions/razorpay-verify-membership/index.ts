import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Verify a founding-membership payment SERVER-SIDE (HMAC of order_id|payment_id).
// Membership is marked 'active' ONLY after this passes — never from a client
// success callback alone. (A webhook on order.paid would add belt-and-suspenders;
// TODO: add a one-off/order webhook handler if desired — the existing webhook
// only handles subscription events.)

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

async function verifySignature(orderId: string, paymentId: string, signature: string, secret: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(`${orderId}|${paymentId}`));
  const computed = Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
  return computed === signature;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

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

  let body: { razorpay_payment_id?: string; razorpay_order_id?: string; razorpay_signature?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }
  const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = body;
  if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
    return json({ error: "Missing payment fields" }, 400);
  }

  const secret = Deno.env.get("RAZORPAY_KEY_SECRET")!;
  const valid = await verifySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature, secret);
  if (!valid) return json({ error: "Invalid signature" }, 400);

  const sb = createClient(supabaseUrl, supabaseServiceKey);

  // Bind to the caller's own pending membership for this order
  const { data: membership, error: mErr } = await sb
    .from("memberships")
    .select("id, user_id, status")
    .eq("razorpay_order_id", razorpay_order_id)
    .single();

  if (mErr || !membership) return json({ error: "Membership not found" }, 404);
  if (membership.user_id !== user.id) return json({ error: "Forbidden" }, 403);

  // Persist ONLY after verification
  await sb.from("memberships").update({
    status: "active",
    razorpay_payment_id,
    activated_at: new Date().toISOString(),
  }).eq("id", membership.id);

  return json({ ok: true });
});
