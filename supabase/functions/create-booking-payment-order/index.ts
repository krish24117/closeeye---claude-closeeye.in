// Edge function: create-booking-payment-order
// Creates a Razorpay order for a companion_confirmed booking request.
//
// Auth: family user (JWT required)
// Input: { booking_request_id: string }
// Returns: { order_id, key_id, amount_paise, booking_request_id }
//
// Idempotent: if razorpay_order_id already set, returns it without re-creating.
// Amount is read from the DB (set by ops) — never trusted from the client.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, checkOrigin } from "../_shared/cors.ts";

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

  const jwt = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!jwt) return json({ error: "Unauthorized" }, 401);

  try {
    const body = await req.json() as { booking_request_id?: string };
    const bookingRequestId = body.booking_request_id;
    if (!bookingRequestId) return json({ error: "booking_request_id required" }, 400);

    const url = Deno.env.get("SUPABASE_URL")!;
    const sb  = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Verify the caller is a real authenticated user
    const callerSb = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });
    const { data: { user } } = await callerSb.auth.getUser();
    if (!user) return json({ error: "Unauthorized" }, 401);

    // Load booking request — amount_paise comes from DB (set by ops), never from client
    const { data: booking, error: bookingErr } = await sb
      .from("booking_requests")
      .select("id, user_id, status, amount_paise, razorpay_order_id, service_name, recipient_name")
      .eq("id", bookingRequestId)
      .single();

    if (bookingErr || !booking) return json({ error: "Booking request not found" }, 404);
    if (booking.user_id !== user.id) return json({ error: "Forbidden" }, 403);
    if (booking.status !== "companion_confirmed") {
      return json({ error: "Booking is not ready for payment", status: booking.status }, 409);
    }
    if (!booking.amount_paise || booking.amount_paise <= 0) {
      return json({ error: "Booking amount not set — contact support" }, 409);
    }

    const keyId = Deno.env.get("RAZORPAY_KEY_ID")!;

    // Idempotent: return existing order if already created
    if (booking.razorpay_order_id) {
      return json({
        order_id: booking.razorpay_order_id,
        key_id: keyId,
        amount_paise: booking.amount_paise,
        booking_request_id: bookingRequestId,
      });
    }

    // Create Razorpay order
    const keySecret = Deno.env.get("RAZORPAY_KEY_SECRET")!;
    const rzRes = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${btoa(`${keyId}:${keySecret}`)}`,
      },
      body: JSON.stringify({
        amount: booking.amount_paise,
        currency: "INR",
        receipt: `br_${bookingRequestId.replace(/-/g, "").slice(0, 20)}`,
        notes: {
          booking_request_id: bookingRequestId,
          service_name: booking.service_name,
          elder_name: booking.recipient_name,
        },
      }),
    });

    if (!rzRes.ok) {
      const errText = await rzRes.text();
      console.error("Razorpay order creation failed:", errText);
      return json({ error: "Could not create payment order" }, 502);
    }

    const rzOrder = await rzRes.json() as { id: string };

    // Persist the order_id so subsequent calls are idempotent
    await sb.from("booking_requests")
      .update({ razorpay_order_id: rzOrder.id })
      .eq("id", bookingRequestId);

    return json({
      order_id: rzOrder.id,
      key_id: keyId,
      amount_paise: booking.amount_paise,
      booking_request_id: bookingRequestId,
    });

  } catch (err) {
    console.error("create-booking-payment-order unexpected error:", err);
    return json({ error: String(err) }, 500);
  }
});
