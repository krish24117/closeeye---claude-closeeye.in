import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, checkOrigin } from "../_shared/cors.ts";

function twilioWhatsappNumber(raw: string): string {
  const trimmed = raw.trim();
  return trimmed.startsWith("whatsapp:") ? trimmed : `whatsapp:${trimmed}`;
}

async function sendWhatsapp(
  to: string,
  body: string,
  accountSid: string,
  authToken: string,
  from: string,
): Promise<void> {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const params = new URLSearchParams({
    From: twilioWhatsappNumber(from),
    To: twilioWhatsappNumber(to),
    Body: body,
  });
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${btoa(`${accountSid}:${authToken}`)}`,
    },
    body: params.toString(),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Twilio error ${res.status}: ${text}`);
  }
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

  // Verify JWT with caller client
  const callerSb = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: userErr } = await callerSb.auth.getUser();
  if (userErr || !user) return json({ error: "Unauthorized" }, 401);

  // Service role client for DB reads
  const sb = createClient(supabaseUrl, supabaseServiceKey);

  // ── Get caller profile ────────────────────────────────────────────────────
  const { data: profile, error: profileErr } = await sb
    .from("profiles")
    .select("full_name, whatsapp_number")
    .eq("id", user.id)
    .single();

  if (profileErr || !profile) {
    return json({ error: "Profile not found" }, 404);
  }

  // ── Get SOS-enabled family members ────────────────────────────────────────
  const { data: members, error: membersErr } = await sb
    .from("family_members")
    .select("whatsapp_number")
    .eq("family_user_id", user.id)
    .eq("notify_sos", true);

  if (membersErr) {
    console.error("family_members fetch error:", membersErr);
  }

  // ── Build recipient list ──────────────────────────────────────────────────
  const recipients: string[] = [];

  if (profile.whatsapp_number?.trim()) {
    recipients.push(profile.whatsapp_number.trim());
  }

  for (const m of members ?? []) {
    if (m.whatsapp_number?.trim()) {
      recipients.push(m.whatsapp_number.trim());
    }
  }

  if (recipients.length === 0) {
    return json({ sent: 0, total: 0, warning: "No WhatsApp numbers found" });
  }

  // ── Compose message ───────────────────────────────────────────────────────
  const name = profile.full_name?.trim() || "A Close Eye user";
  const message =
    `🚨 *EMERGENCY SOS — Close Eye*\n\n*${name}* has triggered an emergency alert.\n\nPlease contact them immediately or call Close Eye: *+91 90002 21261*\n\n_Automated alert from Close Eye family dashboard._`;

  // ── Twilio secrets ────────────────────────────────────────────────────────
  const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID")!;
  const authToken = Deno.env.get("TWILIO_AUTH_TOKEN")!;
  const from = Deno.env.get("TWILIO_WHATSAPP_FROM")!;

  // ── Send to all recipients ────────────────────────────────────────────────
  let sent = 0;
  const errors: string[] = [];

  await Promise.all(
    recipients.map(async (to) => {
      try {
        await sendWhatsapp(to, message, accountSid, authToken, from);
        sent++;
      } catch (err) {
        console.error(`Failed to send SOS to ${to}:`, err);
        errors.push(String(err));
      }
    }),
  );

  return json({ sent, total: recipients.length, ...(errors.length ? { errors } : {}) });
});
