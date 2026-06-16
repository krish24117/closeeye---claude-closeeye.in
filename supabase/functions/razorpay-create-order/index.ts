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

function razorpayAuth(): string {
  const keyId = Deno.env.get("RAZORPAY_KEY_ID")!;
  const keySecret = Deno.env.get("RAZORPAY_KEY_SECRET")!;
  return `Basic ${btoa(`${keyId}:${keySecret}`)}`;
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
    service_type?: string;
    loved_one_id?: string;
    scheduled_at?: string;
    amount_paise?: number;
    notes?: string;
  };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const { service_type, loved_one_id, scheduled_at, amount_paise, notes } = body;

  if (!service_type || !loved_one_id || !scheduled_at || !amount_paise) {
    return json({ error: "Missing required fields: service_type, loved_one_id, scheduled_at, amount_paise" }, 400);
  }
  if (amount_paise < 100) {
    return json({ error: "amount_paise must be at least 100" }, 400);
  }

  const sb = createClient(supabaseUrl, supabaseServiceKey);

  // ── Insert booking ────────────────────────────────────────────────────────
  const { data: booking, error: bookingErr } = await sb
    .from("bookings")
    .insert({
      family_user_id: user.id,
      loved_one_id,
      service_type,
      amount_paise,
      status: "pending",
      payment_status: "pending",
      scheduled_at,
      notes: notes?.trim() || null,
    })
    .select("id")
    .single();

  if (bookingErr || !booking) {
    console.error("Booking insert error:", bookingErr);
    return json({ error: "Could not create booking" }, 500);
  }

  // ── Create Razorpay order ─────────────────────────────────────────────────
  const rzRes = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: razorpayAuth(),
    },
    body: JSON.stringify({
      amount: amount_paise,
      currency: "INR",
      receipt: `bk_${booking.id.slice(0, 20)}`,
      notes: { booking_id: booking.id, service_type, user_id: user.id },
    }),
  });

  if (!rzRes.ok) {
    const errText = await rzRes.text();
    console.error("Razorpay order creation failed:", errText);
    await sb.from("bookings").delete().eq("id", booking.id);
    return json({ error: "Payment gateway error", detail: errText }, 502);
  }

  const order = await rzRes.json();

  // ── Store order ID on the booking ─────────────────────────────────────────
  await sb.from("bookings").update({ razorpay_order_id: order.id }).eq("id", booking.id);

  return json({
    order_id: order.id,
    booking_id: booking.id,
    amount: order.amount,
    currency: order.currency,
    key_id: Deno.env.get("RAZORPAY_KEY_ID")!,
  });
});
