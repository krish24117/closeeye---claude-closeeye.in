import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// One-off booking REQUEST (request -> confirm -> pay). No payment is taken here.
// We persist an unpaid request; ops confirm availability, then send a payment link.

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

  if (!service_id || !service_name || !recipient_name || !recipient_address || !requester_whatsapp) {
    return json({ error: "Missing required fields" }, 400);
  }

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
      recipient_name: recipient_name.trim(),
      recipient_address: recipient_address.trim(),
      requester_whatsapp: requester_whatsapp.trim(),
      notes: notes?.trim() || null,
      status: "requested",
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("booking_requests insert error:", error);
    return json({ error: "Could not save request" }, 500);
  }

  return json({ ok: true, request_id: data.id });
});
