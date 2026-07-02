import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendWhatsAppTemplate } from "../_shared/whatsapp.ts";

// One-off booking REQUEST (request -> confirm -> pay). No payment taken here.
// We persist an unpaid request; ops confirm availability, then send a payment link.
//
// Status rules:
//   'requested'    — all contact/address fields present; ready for companion dispatch
//   'needs_details'— address or WhatsApp was blank; booking saved but MUST NOT be
//                    dispatched until ops or the family supplies the missing info

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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Auth is OPTIONAL — guests may request a visit; we capture their contact.
  let userId: string | null = null;
  const authHeader = req.headers.get("Authorization");
  if (authHeader) {
    const callerSb = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await callerSb.auth.getUser();
    userId = user?.id ?? null;
  }

  let body: {
    service_id?: string;
    service_name?: string;
    variant_id?: string | null;
    amount_paise?: number | null;
    scheduled_at_ist?: string | null;
    recipient_name?: string;
    recipient_address?: string;
    requester_whatsapp?: string;
    notes?: string | null;
  };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const {
    service_id, service_name, variant_id, amount_paise,
    scheduled_at_ist, recipient_name, recipient_address, requester_whatsapp, notes,
  } = body;

  // Only the service identity is strictly required.
  if (!service_id || !service_name) {
    return json({ error: "Missing required fields: service_id and service_name" }, 400);
  }

  const addrClean = (recipient_address || "").trim();
  const waClean = (requester_whatsapp || "").trim();
  const missingAddress = addrClean === "";
  const missingWhatsapp = waClean === "";
  const needsDetails = missingAddress || missingWhatsapp;

  const sb = createClient(supabaseUrl, supabaseServiceKey);

  const { data, error } = await sb
    .from("booking_requests")
    .insert({
      user_id: userId,
      service_id,
      service_name,
      variant_id: variant_id ?? null,
      amount_paise: amount_paise ?? null,
      scheduled_at: scheduled_at_ist || null,
      recipient_name: (recipient_name || "").trim(),
      recipient_address: addrClean,
      requester_whatsapp: waClean,
      notes: notes?.trim() || null,
      status: needsDetails ? "needs_details" : "pending_confirmation",
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("booking_requests insert error:", error);
    return json({ error: "Could not save request" }, 500);
  }

  // Notify admin on WhatsApp (Twilio) — non-fatal; booking is already saved above.
  try {
    const sid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const token = Deno.env.get("TWILIO_AUTH_TOKEN");
    const from = Deno.env.get("TWILIO_WHATSAPP_FROM");
    const adminTo = Deno.env.get("ADMIN_WHATSAPP") || "+919000221261";
    if (sid && token && from) {
      const wa = (n: string) => (n.trim().startsWith("whatsapp:") ? n.trim() : `whatsapp:${n.trim()}`);
      const missingNote = needsDetails
        ? `⚠️ NEEDS DETAILS: ${[missingAddress && "address", missingWhatsapp && "WhatsApp"].filter(Boolean).join(", ")} missing\n`
        : "";
      const msgBody =
        `🔔 New booking request\n` +
        missingNote +
        `Service: ${service_name}${amount_paise ? ` (₹${(amount_paise / 100).toLocaleString("en-IN")})` : ""}\n` +
        `For: ${recipient_name || "—"}\n` +
        `When: ${scheduled_at_ist || "—"}\n` +
        `Address: ${addrClean || "—"}\n` +
        `Contact: ${waClean || "—"}\n` +
        (notes?.trim() ? `Notes: ${notes.trim()}\n` : "") +
        `closeeye.in/admin`;
      const params = new URLSearchParams({ From: wa(from), To: wa(adminTo), Body: msgBody });
      const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded", Authorization: `Basic ${btoa(`${sid}:${token}`)}` },
        body: params.toString(),
      });
      if (!res.ok) console.error("Twilio admin notify failed:", res.status, await res.text());
    }
  } catch (waErr) {
    console.error("Admin WhatsApp notify error (non-fatal):", waErr);
  }


  return json({
    ok: true,
    request_id: data.id,
    needs_details: needsDetails,
    missing: {
      address: missingAddress,
      whatsapp: missingWhatsapp,
    },
  });
});
