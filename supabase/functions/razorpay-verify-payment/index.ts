import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, checkOrigin } from "../_shared/cors.ts";

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

  const supabaseUrl      = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey  = Deno.env.get("SUPABASE_ANON_KEY")!;
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
      payment_status:    "paid",
      status:            "confirmed",
      razorpay_payment_id,
      paid_at:           new Date().toISOString(),
    })
    .eq("id", booking_id)
    .eq("family_user_id", user.id)
    .select("service_type, amount_paise, scheduled_at, loved_one_id")
    .single();

  if (updateErr || !booking) {
    console.error("Booking update error:", updateErr);
    return json({ error: "Failed to record payment" }, 500);
  }

  // ── Create in-app notification ────────────────────────────────────────────
  const amountInr = `₹${(booking.amount_paise / 100).toLocaleString("en-IN")}`;
  await sb.from("notifications").insert({
    user_id: user.id,
    type:    "payment_confirmed",
    title:   "Payment confirmed — booking received",
    message: `Your ${amountInr} payment was received. A companion will be assigned within 24 hours.`,
    read:    false,
  });

  // ── WhatsApp alert to admin ───────────────────────────────────────────────
  try {
    const accountSid  = Deno.env.get("TWILIO_ACCOUNT_SID");
    const authToken   = Deno.env.get("TWILIO_AUTH_TOKEN");
    const fromNumber  = Deno.env.get("TWILIO_WHATSAPP_FROM") ?? "whatsapp:+14155238886";
    const adminNumber = "whatsapp:+919980624117";

    if (accountSid && authToken) {
      const [profileRes, lovedOneRes] = await Promise.all([
        sb.from("profiles").select("full_name, whatsapp_number").eq("id", user.id).single(),
        booking.loved_one_id
          ? sb.from("loved_ones").select("full_name").eq("id", booking.loved_one_id).single()
          : Promise.resolve({ data: null }),
      ]);

      const familyName  = profileRes.data?.full_name       ?? "Unknown customer";
      const familyPhone = profileRes.data?.whatsapp_number  ?? "Not provided";
      const lovedOne    = (lovedOneRes as { data: { full_name?: string } | null }).data?.full_name ?? "Unknown";

      const SERVICE_LABELS: Record<string, string> = {
        home_visit:                    "Home Visit",
        hospital_assistance_half_day:  "Hospital Assistance (Half Day)",
        hospital_assistance_full_day:  "Hospital Assistance (Full Day)",
        emergency_support_visit:       "Emergency Support Visit",
        grocery_medicine_assistance:   "Grocery / Medicine Assistance",
        home_maintenance_coordination: "Home Maintenance Coordination",
      };
      const serviceName = SERVICE_LABELS[booking.service_type] ?? booking.service_type;

      const scheduledDate = booking.scheduled_at
        ? new Date(booking.scheduled_at).toLocaleString("en-IN", {
            timeZone:  "Asia/Kolkata",
            dateStyle: "medium",
            timeStyle: "short",
          })
        : "Not specified";

      const msgBody = [
        `🔔 *New Booking — Close Eye*`,
        ``,
        `*Service:* ${serviceName}`,
        `*For:* ${lovedOne}`,
        `*Customer:* ${familyName}`,
        `*Contact:* ${familyPhone}`,
        `*Date & Time:* ${scheduledDate}`,
        `*Amount:* ${amountInr}`,
        ``,
        `_Open the admin dashboard to assign a companion._`,
      ].join("\n");

      const to   = adminNumber.startsWith("whatsapp:") ? adminNumber : `whatsapp:${adminNumber}`;
      const from = fromNumber.startsWith("whatsapp:")  ? fromNumber  : `whatsapp:${fromNumber}`;

      await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
        {
          method: "POST",
          headers: {
            Authorization:  `Basic ${btoa(`${accountSid}:${authToken}`)}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({ From: from, To: to, Body: msgBody }),
        },
      );
    }
  } catch (alertErr) {
    console.error("Admin WhatsApp alert failed (non-fatal):", alertErr);
  }

  return json({ success: true });
});
