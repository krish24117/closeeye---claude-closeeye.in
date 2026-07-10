import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, checkOrigin } from "../_shared/cors.ts";

// Family edits the VISIT-DETAIL fields of their OWN still-pending request.
// Server-authoritative: authenticated caller, ownership verified, editable-status
// guard. Never touches service / price / materialised booking — only the logistics
// the family owns. Status re-derives between needs_details / pending_confirmation.
const EDITABLE = new Set(["requested", "pending_confirmation", "needs_details"]);

Deno.serve(async (req: Request) => {
  const cors = corsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });

  const originErr = checkOrigin(req);
  if (originErr) return originErr;

  const json = (body: unknown, status = 200): Response =>
    new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Missing Authorization header" }, 401);
  const callerSb = createClient(supabaseUrl, supabaseAnonKey, { global: { headers: { Authorization: authHeader } } });
  const { data: { user }, error: userErr } = await callerSb.auth.getUser();
  if (userErr || !user) return json({ error: "Unauthorized" }, 401);

  let body: {
    request_id?: string;
    recipient_address?: string;
    scheduled_at_ist?: string | null;
    visit_landmark?: string | null;
    visit_contact_name?: string | null;
    visit_contact_phone?: string | null;
    visit_time_window?: string | null;
    visit_special_instructions?: string | null;
    visit_access_instructions?: string | null;
    visit_team_notes?: string | null;
    visit_map_link?: string | null;
  };
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON body" }, 400); }

  const requestId = body.request_id;
  if (!requestId) return json({ error: "request_id is required" }, 400);

  const sb = createClient(supabaseUrl, supabaseServiceKey);

  const { data: row } = await sb
    .from("booking_requests")
    .select("id, user_id, status, booking_id")
    .eq("id", requestId)
    .maybeSingle();
  if (!row) return json({ error: "Request not found" }, 404);
  if (row.user_id !== user.id) return json({ error: "Not your request" }, 403);
  if (row.booking_id || !EDITABLE.has(row.status as string)) {
    return json({ error: "This visit is already being arranged and can no longer be edited here." }, 409);
  }

  // Past-date guard (client min is spoofable).
  if (body.scheduled_at_ist) {
    const d = String(body.scheduled_at_ist).slice(0, 10);
    const todayIst = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
    if (/^\d{4}-\d{2}-\d{2}$/.test(d) && d < todayIst) return json({ error: "Scheduled date cannot be in the past" }, 400);
  }

  const addrClean = (body.recipient_address || "").trim();
  const contactClean = (body.visit_contact_phone || "").trim();
  const needsDetails = addrClean === "" || contactClean === "";
  const t = (v?: string | null) => (v && v.trim() ? v.trim() : null);

  const { error } = await sb
    .from("booking_requests")
    .update({
      recipient_address:          addrClean,
      scheduled_at:               body.scheduled_at_ist || null,
      visit_landmark:             t(body.visit_landmark),
      visit_contact_name:         t(body.visit_contact_name),
      visit_contact_phone:        contactClean || null,
      visit_time_window:          t(body.visit_time_window),
      visit_special_instructions: t(body.visit_special_instructions),
      visit_access_instructions:  t(body.visit_access_instructions),
      visit_team_notes:           t(body.visit_team_notes),
      visit_map_link:             t(body.visit_map_link),
      status:                     needsDetails ? "needs_details" : "pending_confirmation",
    })
    .eq("id", requestId);

  if (error) {
    console.error("[update-booking-request] update error:", error);
    return json({ error: "Could not update the request" }, 500);
  }
  return json({ ok: true, request_id: requestId });
});
