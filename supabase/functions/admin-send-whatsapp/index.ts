import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Admin-only generic WhatsApp sender (Twilio). Used by the admin console to
// notify a doctor when a query is assigned, and a family when it's published.
// Caller MUST be an admin (profiles.role='admin'); the Twilio creds never leave
// the server. Secrets: TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_WHATSAPP_FROM.

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } });
}
const wa = (n: string) => (n.trim().startsWith("whatsapp:") ? n.trim() : `whatsapp:${n.trim()}`);

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS_HEADERS });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Missing Authorization header" }, 401);

  // Authenticate caller
  const caller = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
  const { data: { user }, error: userErr } = await caller.auth.getUser();
  if (userErr || !user) return json({ error: "Unauthorized" }, 401);

  // Authorize: caller must be an admin
  const admin = createClient(supabaseUrl, serviceKey);
  const { data: prof } = await admin.from("profiles").select("role, admin_role").eq("id", user.id).maybeSingle();
  if (!prof || prof.role !== "admin") return json({ error: "Forbidden" }, 403);

  let body: { to?: string; message?: string };
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  const to = (body.to || "").trim();
  const message = (body.message || "").trim();
  if (!to || !message) return json({ error: "to and message are required" }, 400);

  const sid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const token = Deno.env.get("TWILIO_AUTH_TOKEN");
  const from = Deno.env.get("TWILIO_WHATSAPP_FROM");
  if (!sid || !token || !from) return json({ error: "WhatsApp not configured", sent: false }, 200);

  try {
    const params = new URLSearchParams({ From: wa(from), To: wa(to), Body: message });
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Authorization: `Basic ${btoa(`${sid}:${token}`)}` },
      body: params.toString(),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error("Twilio error:", res.status, text);
      return json({ error: "Send failed", sent: false }, 200);
    }
    return json({ sent: true });
  } catch (err) {
    console.error("WhatsApp send error:", err);
    return json({ error: "Send failed", sent: false }, 200);
  }
});
