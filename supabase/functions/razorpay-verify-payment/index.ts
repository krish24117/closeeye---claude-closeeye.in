import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sigBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(`${orderId}|${paymentId}`));
  const computed = Array.from(new Uint8Array(sigBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return computed === signature;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

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
  let body: {
    razorpay_payment_id?: string;
    razorpay_order_id?: string;
    razorpay_signature?: string;
    booking_id?: string;
  };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const { razorpay_payment_id, razorpay_order_id, razorpay_signature, booking_id } = body;

  if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature || !booking_id) {
    return json({ error: "Missing: razorpay_payment_id, razorpay_order_id, razorpay_signature, booking_id" }, 400);
  }

  // ── Verify HMAC-SHA256 signature ──────────────────────────────────────────
  const keySecret = Deno.env.get("RAZORPAY_KEY_SECRET");
  if (!keySecret) return json({ error: "Razorpay secret not configured" }, 500);

  const valid = await verifySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature, keySecret);
  if (!valid) {
    console.error("Razorpay signature mismatch for booking:", booking_id);
    return json({ error: "Invalid payment signature — payment not recorded" }, 400);
  }

  // ── Mark booking paid ─────────────────────────────────────────────────────
  const sb = createClient(supabaseUrl, supabaseServiceKey);

  const { data: booking, error: updateErr } = await sb
    .from("bookings")
    .update({
      payment_status: "paid",
      status: "confirmed",
      razorpay_payment_id,
    })
    .eq("id", booking_id)
    .eq("family_user_id", user.id)
    .select("service_type, amount_paise")
    .single();

  if (updateErr || !booking) {
    console.error("Booking update error:", updateErr);
    return json({ error: "Failed to record payment" }, 500);
  }

  // ── Create in-app notification ────────────────────────────────────────────
  const amountInr = `₹${(booking.amount_paise / 100).toLocaleString("en-IN")}`;
  await sb.from("notifications").insert({
    user_id: user.id,
    type: "payment_confirmed",
    title: "Payment confirmed — booking received",
    message: `Your ${amountInr} payment was received. A companion will be assigned within 24 hours.`,
    read: false,
  });

  return json({ success: true });
});
