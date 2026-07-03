// confirm-booking-and-send-payment
// Called by admin when they confirm a companion for a booking_request.
// 1. Validates the booking exists and is in a confirmable state
// 2. Creates a Razorpay Payment Link (server-side, secret never leaves edge functions)
// 3. Updates booking_requests: status → companion_confirmed, stores payment link details
// 4. Sends visit_confirmed WhatsApp (companion name + datetime) via Twilio
// Razorpay natively notifies the customer with the payment link via SMS/WhatsApp.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendWhatsAppTemplate, normalisePhone } from "../_shared/whatsapp.ts";
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

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  // ── Auth: must be admin (service role or valid JWT with admin role) ──────────
  const supabaseUrl        = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const sb = createClient(supabaseUrl, supabaseServiceKey);

  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) return json({ error: "Unauthorized" }, 401);

  // Verify caller is an admin by checking their profile via the service-role client
  const { data: { user }, error: authErr } = await sb.auth.getUser(token);
  if (authErr || !user) return json({ error: "Unauthorized" }, 401);

  const { data: callerProfile } = await sb
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (callerProfile?.role !== "admin") return json({ error: "Forbidden — admin only" }, 403);

  // ── Parse body ───────────────────────────────────────────────────────────────
  let body: {
    booking_request_id: string;
    companion_name: string;
    scheduled_at?: string | null;
    amount_paise?: number | null;
  };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const { booking_request_id, companion_name, scheduled_at, amount_paise } = body;

  if (!booking_request_id || !companion_name) {
    return json({ error: "Missing required fields: booking_request_id, companion_name" }, 400);
  }

  // ── Fetch booking ────────────────────────────────────────────────────────────
  const { data: br, error: brErr } = await sb
    .from("booking_requests")
    .select("id, status, service_name, recipient_name, requester_whatsapp, scheduled_at, amount_paise, user_id, razorpay_payment_link_id")
    .eq("id", booking_request_id)
    .maybeSingle();

  if (brErr || !br) return json({ error: "Booking request not found" }, 404);

  const CONFIRMABLE = ["pending_confirmation", "requested", "needs_details", "confirmed", "companion_confirmed"];
  if (!CONFIRMABLE.includes(br.status as string)) {
    return json({ error: `Booking is already ${br.status} — cannot re-confirm` }, 409);
  }

  // ── Resolve amount ───────────────────────────────────────────────────────────
  const finalAmountPaise: number | null = amount_paise ?? (br.amount_paise as number | null);
  if (!finalAmountPaise) {
    return json({ error: "amount_paise is required — set it on the booking or pass it in the request" }, 400);
  }

  const finalScheduledAt = scheduled_at ?? (br.scheduled_at as string | null);

  // ── Razorpay secrets ─────────────────────────────────────────────────────────
  const rzKeyId     = Deno.env.get("RAZORPAY_KEY_ID")?.trim();
  const rzKeySecret = Deno.env.get("RAZORPAY_KEY_SECRET")?.trim();
  if (!rzKeyId || !rzKeySecret) {
    console.error("[confirm-booking] RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET not set");
    return json({
      error: "Razorpay credentials not configured",
      fix: "supabase secrets set --env-file .env.production RAZORPAY_KEY_ID=... RAZORPAY_KEY_SECRET=...",
    }, 500);
  }

  // ── Normalise customer phone for Razorpay ────────────────────────────────────
  const rawPhone = (br.requester_whatsapp as string | null) ?? "";
  let customerPhone: string | undefined;
  try {
    customerPhone = normalisePhone(rawPhone).replace("whatsapp:", "");
  } catch {
    console.warn("[confirm-booking] Could not normalise customer phone:", rawPhone);
  }

  // ── Create Razorpay Payment Link ─────────────────────────────────────────────
  const expiresAt = Math.floor(Date.now() / 1000) + 72 * 60 * 60; // 72h from now

  const rzBody: Record<string, unknown> = {
    amount:      finalAmountPaise,
    currency:    "INR",
    accept_partial: false,
    description: `${br.service_name} for ${br.recipient_name}`,
    reference_id: booking_request_id.replace(/-/g, "").slice(0, 40),
    expire_by:   expiresAt,
    notify: {
      sms:       true,
      whatsapp:  true,
      email:     false,
    },
    reminder_enable: true,
    notes: {
      booking_request_id,
      service_name: br.service_name,
      recipient_name: br.recipient_name,
      companion_name,
    },
    callback_url:    `${Deno.env.get("APP_URL") ?? "https://www.closeeye.in"}/dashboard/bookings`,
    callback_method: "get",
  };

  if (customerPhone) {
    rzBody.customer = {
      contact: customerPhone,
      name: (br.recipient_name as string) || undefined,
    };
  }

  const rzRes = await fetch("https://api.razorpay.com/v1/payment_links", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Basic ${btoa(`${rzKeyId}:${rzKeySecret}`)}`,
    },
    body: JSON.stringify(rzBody),
  });

  const rzData = await rzRes.json() as Record<string, unknown>;

  if (!rzRes.ok) {
    console.error("[confirm-booking] Razorpay Payment Link creation failed:", rzData);
    const rzErrDesc = (rzData as any)?.error?.description || (rzData as any)?.error?.reason || JSON.stringify(rzData);
    return json({ error: `Razorpay error: ${rzErrDesc}`, details: rzData }, 502);
  }

  const paymentLinkId  = rzData.id as string;
  const paymentLinkUrl = rzData.short_url as string;
  const linkExpiresAt  = new Date(expiresAt * 1000).toISOString();

  console.log(`[confirm-booking] Payment link created: ${paymentLinkId} → ${paymentLinkUrl}`);

  // ── DB update ────────────────────────────────────────────────────────────────
  const dbUpdate: Record<string, unknown> = {
    status:                  "companion_confirmed",
    companion_name,
    confirmed_at:            new Date().toISOString(),
    razorpay_payment_link_id: paymentLinkId,
    payment_link_url:        paymentLinkUrl,
    payment_link_expires_at: linkExpiresAt,
    ...(finalScheduledAt ? { scheduled_at: finalScheduledAt } : {}),
    ...(amount_paise ? { amount_paise: finalAmountPaise } : {}),
  };

  // Auto-link user_id for guest bookings
  if (!br.user_id && rawPhone) {
    const phone10 = rawPhone.replace(/\D/g, "").slice(-10);
    const { data: matched } = await sb
      .from("profiles")
      .select("id")
      .ilike("whatsapp_number", `%${phone10}`)
      .limit(1)
      .maybeSingle();
    if (matched) dbUpdate.user_id = matched.id;
  }

  const { error: updateErr } = await sb
    .from("booking_requests")
    .update(dbUpdate)
    .eq("id", booking_request_id);

  if (updateErr) {
    console.error("[confirm-booking] DB update failed:", updateErr);
    return json({ error: "DB update failed — payment link was created but booking not updated", payment_link_id: paymentLinkId }, 500);
  }

  // ── WhatsApp — visit_confirmed template (companion name + scheduled time) ────
  if (rawPhone && finalScheduledAt) {
    try {
      const datetimeStr = new Intl.DateTimeFormat("en-IN", {
        weekday: "long", day: "numeric", month: "long",
        hour: "numeric", minute: "2-digit", hour12: true,
        timeZone: "Asia/Kolkata",
      }).format(new Date(finalScheduledAt));

      let requesterName = "there";
      if (br.user_id) {
        const { data: prof } = await sb.from("profiles").select("full_name").eq("id", br.user_id as string).maybeSingle();
        if (prof?.full_name) requesterName = prof.full_name as string;
      }

      await sendWhatsAppTemplate({
        to: normalisePhone(rawPhone),
        template: "visit_confirmed",
        variables: [requesterName, companion_name, datetimeStr],
        sb,
      });
    } catch (waErr) {
      console.error("[confirm-booking] visit_confirmed WhatsApp failed (non-fatal):", waErr);
    }
  }

  return json({
    ok: true,
    payment_link_id:  paymentLinkId,
    payment_link_url: paymentLinkUrl,
    expires_at:       linkExpiresAt,
  });
});
