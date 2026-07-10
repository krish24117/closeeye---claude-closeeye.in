import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendWhatsAppTemplate } from "../_shared/whatsapp.ts";
import { corsHeaders, checkOrigin } from "../_shared/cors.ts";

// One-off booking REQUEST (request -> confirm -> pay). No payment taken here.
// We persist an unpaid request; ops confirm availability, then send a payment link.
//
// Status rules:
//   'requested'    — all contact/address fields present; ready for companion dispatch
//   'needs_details'— address or WhatsApp was blank; booking saved but MUST NOT be
//                    dispatched until ops or the family supplies the missing info

// Server-authoritative price map — amount in paise (100 paise = ₹1).
// Mirrors services-catalog.ts ONE_OFF_SERVICES. Never trust amount_paise from the client.
// If a service_id is unknown the booking is saved with amount_paise = null so
// that ops can set the correct amount before creating the payment order.
const CANONICAL_PRICES: Readonly<Record<string, number | null>> = {
  // Canonical IDs (services-catalog.ts)
  home_visit:                    100000, // ₹1,000
  doctor_visit_support:          150000, // ₹1,500
  hospital_assistance:           null,   // price comes from the variant
  grocery_medicine:              50000,  // ₹500
  emergency_response:            300000, // ₹3,000
  // Wizard route aliases (Services.tsx SERVICE_WIZARD_ID map)
  grocery_medicine_assistance:   50000,
  emergency_support_visit:       300000,
  // Hospital variant IDs used as direct service_ids in the wizard
  hospital_assistance_half_day:  200000, // ₹2,000
  hospital_assistance_full_day:  400000, // ₹4,000
} as const;

function resolvePrice(serviceId: string, variantId?: string | null): number | null {
  if (variantId) {
    const vp = CANONICAL_PRICES[variantId];
    if (vp !== undefined) return vp;
  }
  const sp = CANONICAL_PRICES[serviceId];
  return sp !== undefined ? sp : null;
}

Deno.serve(async (req: Request) => {
  const cors = corsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: cors });
  }

  // CSRF guard — rejects requests from untrusted browser origins
  const originErr = checkOrigin(req);
  if (originErr) return originErr;

  const json = (body: unknown, status = 200): Response =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...cors, "Content-Type": "application/json" },
    });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Auth is OPTIONAL — guests may request a visit; we capture their contact.
  // Parse user_id directly from the JWT payload (avoid a round-trip to auth.getUser).
  // The JWT signature is trusted because only the Supabase anon/service key can mint it.
  let userId: string | null = null;
  const authHeader = req.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    try {
      const token = authHeader.slice(7);
      const raw = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
      const padded = raw + "=".repeat((4 - (raw.length % 4)) % 4);
      const payload = JSON.parse(atob(padded));
      userId = typeof payload.sub === "string" ? payload.sub : null;
    } catch {
      userId = null;
    }
  }

  let body: {
    service_id?: string;
    service_name?: string;
    variant_id?: string | null;
    loved_one_id?: string | null;   // H2 — link the visit to a stored family member
    amount_paise?: number | null;   // accepted but IGNORED — server resolves canonical price
    scheduled_at_ist?: string | null;
    recipient_name?: string;
    recipient_address?: string;
    requester_whatsapp?: string;
    notes?: string | null;
    // Visit-specific logistics captured at booking time (stored WITH the booking).
    visit_landmark?: string | null;
    visit_contact_name?: string | null;
    visit_contact_phone?: string | null;
    visit_time_window?: string | null;
    visit_special_instructions?: string | null;
    visit_access_instructions?: string | null;
    visit_team_notes?: string | null;
    visit_map_link?: string | null;
  };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const {
    service_id, service_name, variant_id, loved_one_id,
    scheduled_at_ist, recipient_name, recipient_address, requester_whatsapp, notes,
    visit_landmark, visit_contact_name, visit_contact_phone, visit_time_window,
    visit_special_instructions, visit_access_instructions, visit_team_notes, visit_map_link,
  } = body;

  if (!service_id || !service_name) {
    return json({ error: "Missing required fields: service_id and service_name" }, 400);
  }

  // M3 — reject past dates server-side (the client `min` attribute is spoofable).
  if (scheduled_at_ist) {
    const dateOnly = String(scheduled_at_ist).slice(0, 10);
    const todayIst = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateOnly) && dateOnly < todayIst) {
      return json({ error: "Scheduled date cannot be in the past" }, 400);
    }
  }

  // Resolve price server-side — client-supplied amount_paise is intentionally discarded
  const canonicalPrice = resolvePrice(service_id, variant_id);

  const addrClean = (recipient_address || "").trim();
  const waClean   = (requester_whatsapp || "").trim();
  const visitContactClean = (visit_contact_phone || "").trim();
  const missingAddress  = addrClean === "";
  const missingWhatsapp = waClean   === "";
  // Dispatchable when there's an address AND some way to reach the visit — the
  // booker's WhatsApp OR the on-site visit contact. The in-app flow supplies both;
  // this stays lenient for the guest wizard (which has no on-site contact field).
  const needsDetails    = missingAddress || (missingWhatsapp && visitContactClean === "");

  const sb = createClient(supabaseUrl, supabaseServiceKey);

  // H2 — only attach a loved_one_id the requester actually owns (guards against
  // a forged member id; unverified JWT means we can't fully trust `userId`).
  let lovedOneId: string | null = null;
  if (loved_one_id && userId) {
    const { data: lo } = await sb
      .from("loved_ones")
      .select("id")
      .eq("id", loved_one_id)
      .eq("family_user_id", userId)
      .maybeSingle();
    lovedOneId = lo?.id ?? null;
  }

  // M1 — idempotency: collapse an accidental double-submit / retry-after-timeout
  // into the existing request (same requester + service + date within 90s).
  {
    const sinceIso = new Date(Date.now() - 90_000).toISOString();
    let dq = sb
      .from("booking_requests")
      .select("id")
      .eq("service_id", service_id)
      .gte("created_at", sinceIso)
      .order("created_at", { ascending: false })
      .limit(1);
    dq = userId ? dq.eq("user_id", userId) : dq.eq("requester_whatsapp", waClean);
    if (scheduled_at_ist) dq = dq.eq("scheduled_at", scheduled_at_ist);
    const { data: dup } = await dq.maybeSingle();
    if (dup?.id) {
      return json({
        ok: true,
        request_id: dup.id,
        deduped: true,
        needs_details: needsDetails,
        missing: { address: missingAddress, whatsapp: missingWhatsapp },
      });
    }
  }

  const { data, error } = await sb
    .from("booking_requests")
    .insert({
      user_id:            userId,
      loved_one_id:       lovedOneId,
      service_id,
      service_name,
      variant_id:         variant_id ?? null,
      amount_paise:       canonicalPrice,   // server-authoritative price
      scheduled_at:       scheduled_at_ist || null,
      recipient_name:     (recipient_name || "").trim(),
      recipient_address:  addrClean,
      requester_whatsapp: waClean,
      notes:              notes?.trim() || null,
      visit_landmark:             visit_landmark?.trim() || null,
      visit_contact_name:         visit_contact_name?.trim() || null,
      visit_contact_phone:        visitContactClean || null,
      visit_time_window:          visit_time_window?.trim() || null,
      visit_special_instructions: visit_special_instructions?.trim() || null,
      visit_access_instructions:  visit_access_instructions?.trim() || null,
      visit_team_notes:           visit_team_notes?.trim() || null,
      visit_map_link:             visit_map_link?.trim() || null,
      status:             needsDetails ? "needs_details" : "pending_confirmation",
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("booking_requests insert error:", error);
    return json({ error: "Could not save request" }, 500);
  }

  // Notify admin on WhatsApp (Twilio) — non-fatal; booking is already saved above.
  try {
    const sid      = Deno.env.get("TWILIO_ACCOUNT_SID");
    const token    = Deno.env.get("TWILIO_AUTH_TOKEN");
    const from     = Deno.env.get("TWILIO_WHATSAPP_FROM");
    const adminTo  = Deno.env.get("ADMIN_WHATSAPP") || "+919000221261";
    if (sid && token && from) {
      const wa = (n: string) => (n.trim().startsWith("whatsapp:") ? n.trim() : `whatsapp:${n.trim()}`);
      const missingNote = needsDetails
        ? `⚠️ NEEDS DETAILS: ${[missingAddress && "address", missingWhatsapp && "WhatsApp"].filter(Boolean).join(", ")} missing\n`
        : "";
      const priceLabel = canonicalPrice ? ` (₹${(canonicalPrice / 100).toLocaleString("en-IN")})` : "";
      const line = (label: string, v?: string | null) => (v && v.trim() ? `${label}: ${v.trim()}\n` : "");
      const msgBody =
        `🔔 New booking request\n` +
        missingNote +
        `Service: ${service_name}${priceLabel}\n` +
        `For: ${recipient_name || "—"}\n` +
        `When: ${scheduled_at_ist || "—"}${visit_time_window ? ` (${visit_time_window.trim()})` : ""}\n` +
        `Address: ${addrClean || "—"}\n` +
        line("Landmark", visit_landmark) +
        `Visit contact: ${(visit_contact_name || "").trim() || "—"}${visitContactClean ? ` · ${visitContactClean}` : ""}\n` +
        `Booker: ${waClean || "—"}\n` +
        line("Access", visit_access_instructions) +
        line("Instructions", visit_special_instructions) +
        line("Notes for team", visit_team_notes) +
        line("Map", visit_map_link) +
        (notes?.trim() ? `Notes: ${notes.trim()}\n` : "") +
        `closeeye.in/admin`;
      const params = new URLSearchParams({ From: wa(from), To: wa(adminTo), Body: msgBody });
      const res = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: `Basic ${btoa(`${sid}:${token}`)}`,
          },
          body: params.toString(),
        },
      );
      if (!res.ok) console.error("Twilio admin notify failed:", res.status, await res.text());
    }
  } catch (waErr) {
    console.error("Admin WhatsApp notify error (non-fatal):", waErr);
  }

  return json({
    ok: true,
    request_id:   data.id,
    needs_details: needsDetails,
    missing: {
      address:  missingAddress,
      whatsapp: missingWhatsapp,
    },
  });
});
