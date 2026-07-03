import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, checkOrigin } from "../_shared/cors.ts";

// Server-authoritative price map — mirrors services-catalog.ts ONE_OFF_SERVICES.
// Client-supplied amount_paise is intentionally DISCARDED.
const CANONICAL_PRICES: Readonly<Record<string, number | null>> = {
  home_visit:                   100000, // ₹1,000
  doctor_visit_support:         150000, // ₹1,500
  hospital_assistance:          null,   // price comes from variant
  grocery_medicine:              50000, // ₹500
  emergency_response:           300000, // ₹3,000
  // Wizard route aliases
  grocery_medicine_assistance:   50000,
  emergency_support_visit:      300000,
  // Hospital variant IDs
  hospital_assistance_half_day: 200000, // ₹2,000
  hospital_assistance_full_day: 400000, // ₹4,000
} as const;

function resolvePrice(serviceType: string, variantId?: string | null): number | null {
  if (variantId) {
    const vp = CANONICAL_PRICES[variantId];
    if (vp !== undefined) return vp;
  }
  const sp = CANONICAL_PRICES[serviceType];
  return sp !== undefined ? sp : null;
}

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
  let body: {
    service_type?: string;
    variant_id?: string | null;
    loved_one_id?: string;
    scheduled_at?: string;
    amount_paise?: number; // accepted but IGNORED — server resolves canonical price
    notes?: string;
  };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const { service_type, variant_id, loved_one_id, scheduled_at, notes } = body;

  if (!service_type || !loved_one_id || !scheduled_at) {
    return json({ error: "Missing required fields: service_type, loved_one_id, scheduled_at" }, 400);
  }

  // Resolve price server-side — client-supplied amount_paise is intentionally discarded
  const canonicalPrice = resolvePrice(service_type, variant_id);
  if (canonicalPrice === null) {
    return json({
      error: `No canonical price for service_type "${service_type}"${variant_id ? ` / variant "${variant_id}"` : ""}. Contact support.`,
    }, 400);
  }

  const sb = createClient(supabaseUrl, supabaseServiceKey);

  // ── Insert booking ────────────────────────────────────────────────────────
  const { data: booking, error: bookingErr } = await sb
    .from("bookings")
    .insert({
      family_user_id: user.id,
      loved_one_id,
      service_type,
      amount_paise: canonicalPrice,
      status: "pending",
      payment_status: "pending",
      scheduled_at,
      special_instructions: notes?.trim() || null,
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
      amount: canonicalPrice,
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
