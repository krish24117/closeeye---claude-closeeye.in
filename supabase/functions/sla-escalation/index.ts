import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// SLA Escalation — called by cron (every 5min) or manually from admin UI.
// Auth: accepts service-role Bearer token (for cron) OR admin user JWT (for manual trigger).
// Does NOT call admin-send-whatsapp (requires user auth) — calls Twilio directly like ask-health.
//
// Actions:
//   75% elapsed, escalation_75_sent_at IS NULL → re-notify assigned doctor (or admin if unassigned)
//   breach OR urgent+unassigned>30min, admin_alerted_at IS NULL → alert admin + interim family message
//
// Optional body: { simulate?: string }  — force-escalate a specific query_id for testing

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });

const INTERIM_MSG =
  "A doctor is reviewing your question and will respond shortly. If this feels urgent or your parent's condition is worsening, please call 108 or go to the nearest hospital.\n\n— Close Eye Care Team 🌿";

function wa(n: string) {
  return n.trim().startsWith("whatsapp:") ? n.trim() : `whatsapp:${n.trim()}`;
}

async function sendWhatsApp(sid: string, token: string, from: string, to: string, body: string) {
  const params = new URLSearchParams({ From: wa(from), To: wa(to), Body: body });
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${btoa(`${sid}:${token}`)}`,
    },
    body: params.toString(),
  });
  if (!res.ok) {
    const txt = await res.text();
    console.error("Twilio error", res.status, txt);
    return false;
  }
  return true;
}

// Escalation email via Resend — the reliable channel for a widened, unacknowledged
// emergency (no 24h window, no DLT). Never throws.
async function sendEscalationEmail(to: string, subject: string, text: string): Promise<boolean> {
  const key  = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("CARE_ALERT_FROM_EMAIL") || "CloseEye Care <connect@closeeye.in>";
  if (!key) return false;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: to.split(",").map((e) => e.trim()).filter(Boolean), subject, text }),
    });
    if (!res.ok) { console.error("[sla] escalation email failed", res.status, await res.text()); return false; }
    return true;
  } catch (e) { console.error("[sla] escalation email error", e); return false; }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  // Auth: accept service-role Bearer or admin user JWT
  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "");

  let isAuthorized = false;
  if (token === serviceKey) {
    // cron / internal call
    isAuthorized = true;
  } else if (token) {
    // admin user JWT
    const caller = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await caller.auth.getUser();
    if (user) {
      const admin = createClient(supabaseUrl, serviceKey);
      const { data: prof } = await admin.from("profiles").select("role").eq("id", user.id).maybeSingle();
      if (prof?.role === "admin") isAuthorized = true;
    }
  }
  if (!isAuthorized) return json({ error: "Unauthorized" }, 401);

  let body: { simulate?: string; dryRun?: boolean } = {};
  try { body = await req.json(); } catch { /* no body = normal cron call */ }

  const db = createClient(supabaseUrl, serviceKey);
  const sid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const twilioToken = Deno.env.get("TWILIO_AUTH_TOKEN");
  const from = Deno.env.get("TWILIO_WHATSAPP_FROM");
  const adminWa = Deno.env.get("CARE_TEAM_WHATSAPP");
  const twilioReady = !!(sid && twilioToken && from);

  const dryRun = body.dryRun === true;
  const simulateId = body.simulate || null;

  const log: string[] = [];
  const actions: { queryId: string; action: string; to?: string; sent?: boolean }[] = [];

  // ---------- helper: fetch query with family + doctor WhatsApp ----------
  async function fetchQueryWithContacts(id: string) {
    const { data: q } = await db
      .from("member_queries")
      .select("id, user_id, question, subject_label, urgency, sla_deadline, created_at, assigned_doctor_id, assigned_at, verification_status, escalation_75_sent_at, admin_alerted_at, interim_msg_sent_at")
      .eq("id", id)
      .maybeSingle();
    if (!q) return null;

    const [famRes, docRes] = await Promise.all([
      db.from("profiles").select("id, full_name, whatsapp_number").eq("id", q.user_id).maybeSingle(),
      q.assigned_doctor_id
        ? db.from("doctors").select("id, name, whatsapp").eq("user_id", q.assigned_doctor_id).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    return { ...q, family: famRes.data, doctor: docRes.data };
  }

  // ---------- simulate: force-escalate a specific query ----------
  if (simulateId) {
    log.push(`[simulate] force-escalating query ${simulateId}`);
    const q = await fetchQueryWithContacts(simulateId);
    if (!q) return json({ error: "Query not found", log }, 404);

    const familyWa = q.family?.whatsapp_number;
    const familyName = q.family?.full_name || "the family";

    // Fire admin alert
    const adminMsg = `⚠️ Close Eye SLA — SIMULATED BREACH\n\nQuery ID: ${q.id}\nFamily: ${familyName}\nFor: ${q.subject_label || "—"}\nUrgency: ${q.urgency?.toUpperCase()}\nQuery: ${(q.question || "").slice(0, 120)}\n\nThis was a simulated escalation from the admin console.`;

    let adminSent = false;
    let familySent = false;

    if (adminWa && twilioReady && !dryRun) {
      adminSent = await sendWhatsApp(sid!, twilioToken!, from!, adminWa, adminMsg);
    }
    if (familyWa && twilioReady && !dryRun) {
      familySent = await sendWhatsApp(sid!, twilioToken!, from!, familyWa, INTERIM_MSG);
    }

    actions.push({ queryId: q.id, action: "simulate_admin_alert", to: adminWa || "not-configured", sent: adminSent });
    actions.push({ queryId: q.id, action: "simulate_interim_msg", to: familyWa || "not-configured", sent: familySent });

    return json({
      mode: dryRun ? "dry-run" : "live",
      log,
      actions,
      adminMsg,
      interimMsg: INTERIM_MSG,
      twilioReady,
      familyWa: familyWa || null,
      adminWa: adminWa || null,
    });
  }

  // ---------- normal cron pass ----------
  const now = new Date().toISOString();

  // 1. Find queries at 75%+ elapsed, not yet notified, not resolved
  const { data: at75 } = await db
    .from("member_queries")
    .select("id, user_id, question, subject_label, urgency, sla_deadline, created_at, assigned_doctor_id, assigned_at, escalation_75_sent_at, admin_alerted_at")
    .is("escalation_75_sent_at", null)
    .not("verification_status", "eq", "verified")
    .not("status", "eq", "doctor_reviewed")
    .not("sla_deadline", "is", null);

  const queries75 = (at75 || []).filter(q => {
    const created = new Date(q.created_at).getTime();
    const deadline = new Date(q.sla_deadline).getTime();
    const total = deadline - created;
    const elapsed = Date.now() - created;
    return total > 0 && elapsed / total >= 0.75;
  });

  log.push(`[75%] found ${queries75.length} queries needing re-notification`);

  for (const q of queries75) {
    // Fetch doctor WhatsApp
    let doctorWa: string | null = null;
    if (q.assigned_doctor_id) {
      const { data: doc } = await db.from("doctors").select("name, whatsapp").eq("user_id", q.assigned_doctor_id).maybeSingle();
      doctorWa = doc?.whatsapp || null;
    }

    const targetWa = doctorWa || adminWa;
    if (!targetWa) {
      log.push(`[75%] ${q.id} — no WhatsApp target, skipping`);
      continue;
    }

    const isDoctor = !!doctorWa;
    const msg = isDoctor
      ? `⏰ Close Eye — SLA reminder\n\nDr. __, a query assigned to you is approaching its response deadline.\n\nFor: ${q.subject_label || "—"}\nUrgency: ${q.urgency?.toUpperCase()}\nQuery: ${(q.question || "").slice(0, 120)}\n\nPlease review at closeeye.in/doctor 🌿`
      : `⏰ Close Eye — Unassigned urgent query approaching SLA\n\nFor: ${q.subject_label || "—"}\nUrgency: ${q.urgency?.toUpperCase()}\nQuery: ${(q.question || "").slice(0, 120)}\n\nPlease assign a doctor immediately.`;

    let sent = false;
    if (twilioReady && !dryRun) {
      sent = await sendWhatsApp(sid!, twilioToken!, from!, targetWa, msg);
    }

    if (!dryRun) {
      await db.from("member_queries").update({ escalation_75_sent_at: now }).eq("id", q.id);
    }

    actions.push({ queryId: q.id, action: "75pct_renotify", to: targetWa, sent });
    log.push(`[75%] ${q.id} — sent ${isDoctor ? "to doctor" : "to admin"}: ${sent}`);
  }

  // 2. Find breached OR urgent-unassigned > 30min, not yet admin-alerted
  const { data: atRisk } = await db
    .from("member_queries")
    .select("id, user_id, question, subject_label, urgency, sla_deadline, created_at, assigned_doctor_id, assigned_at, admin_alerted_at, interim_msg_sent_at, verification_status, status")
    .is("admin_alerted_at", null)
    .not("verification_status", "eq", "verified")
    .not("status", "eq", "doctor_reviewed")
    .not("sla_deadline", "is", null);

  const breached = (atRisk || []).filter(q => {
    const deadline = new Date(q.sla_deadline).getTime();
    const isBreached = Date.now() > deadline;
    const isUrgentUnassigned = q.urgency === "urgent" && !q.assigned_doctor_id &&
      Date.now() - new Date(q.created_at).getTime() > 30 * 60 * 1000;
    return isBreached || isUrgentUnassigned;
  });

  log.push(`[breach] found ${breached.length} queries needing admin alert`);

  for (const q of breached) {
    // Fetch family WhatsApp
    const { data: fam } = await db.from("profiles").select("full_name, whatsapp_number").eq("id", q.user_id).maybeSingle();
    const familyWa = fam?.whatsapp_number || null;
    const familyName = fam?.full_name || "A family";

    const deadline = new Date(q.sla_deadline).getTime();
    const isBreached = Date.now() > deadline;
    const overByMin = isBreached ? Math.round((Date.now() - deadline) / 60000) : 0;
    const reason = isBreached ? `SLA breached by ${overByMin}min` : "Urgent query unassigned > 30min";

    if (adminWa) {
      const adminMsg = `🚨 Close Eye SLA Alert\n\n${reason}\n\nFamily: ${familyName}\nFor: ${q.subject_label || "—"}\nUrgency: ${q.urgency?.toUpperCase()}\nAssigned: ${q.assigned_doctor_id ? "Yes" : "No"}\nQuery: ${(q.question || "").slice(0, 120)}\n\nAction required immediately — closeeye.in/admin/queries`;

      let adminSent = false;
      if (twilioReady && !dryRun) {
        adminSent = await sendWhatsApp(sid!, twilioToken!, from!, adminWa, adminMsg);
      }
      actions.push({ queryId: q.id, action: "admin_alert", to: adminWa, sent: adminSent });
    }

    // Send family interim message (only once)
    if (familyWa && !q.interim_msg_sent_at) {
      let familySent = false;
      if (twilioReady && !dryRun) {
        familySent = await sendWhatsApp(sid!, twilioToken!, from!, familyWa, INTERIM_MSG);
      }
      if (!dryRun) {
        await db.from("member_queries").update({ interim_msg_sent_at: now }).eq("id", q.id);
      }
      actions.push({ queryId: q.id, action: "interim_family_msg", to: familyWa, sent: familySent });
    }

    if (!dryRun) {
      await db.from("member_queries").update({ admin_alerted_at: now }).eq("id", q.id);
    }
    log.push(`[breach] ${q.id} — alerted admin, ${familyWa ? "sent" : "skipped"} interim family msg`);
  }

  // 3. Auto-escalation — red-flag incidents that NOBODY acknowledged in time. Widen to the
  //    escalation contact (WhatsApp + the reliable email) so an emergency is never dropped.
  //    Fires ONCE per incident (guarded on escalation_widened_at).
  const widenMin       = Number(Deno.env.get("INCIDENT_ACK_WIDEN_MINUTES") || "5");
  const escalationWa    = Deno.env.get("CARE_ESCALATION_WHATSAPP") || adminWa;
  const escalationEmail = Deno.env.get("CARE_ESCALATION_EMAIL") || Deno.env.get("CARE_TEAM_EMAIL") || "";
  const consoleUrl      = (Deno.env.get("CLOSEEYE_CONSOLE_URL") || "https://closeeye.in") + "/pm/escalations";

  const { data: openInc } = await db.from("member_queries")
    .select("id, user_id, question, subject_label, escalated_at, escalation_category")
    .not("escalated_at", "is", null)
    .is("resolved_at", null)
    .is("acknowledged_at", null)
    .is("escalation_widened_at", null);

  const toWiden = (openInc || []).filter((q) =>
    q.escalated_at && Date.now() - new Date(q.escalated_at).getTime() > widenMin * 60 * 1000);

  log.push(`[widen] ${toWiden.length} unacknowledged incident(s) past ${widenMin}min`);

  for (const q of toWiden) {
    const { data: fam } = await db.from("profiles").select("full_name, whatsapp_number").eq("id", q.user_id).maybeSingle();
    const famName = fam?.full_name || "A family";
    const famWa   = fam?.whatsapp_number || "";
    const mins    = Math.round((Date.now() - new Date(q.escalated_at).getTime()) / 60000);
    const cat     = (q.escalation_category || "emergency").toUpperCase().replace(/_/g, " ");
    const msg =
      `🚨 UNACKNOWLEDGED EMERGENCY — ${mins} min, no one has picked this up.\n\n` +
      `⚠️ ${cat}\nFamily: ${famName}\nFor: ${q.subject_label || "—"}\n` +
      `💬 "${(q.question || "").slice(0, 160)}"\n${famWa ? `📞 Call: ${famWa}\n` : ""}` +
      `\nAcknowledge NOW: ${consoleUrl}`;

    let sent = false, emailed = false;
    if (escalationWa && twilioReady && !dryRun) sent = await sendWhatsApp(sid!, twilioToken!, from!, escalationWa, msg);
    if (escalationEmail && !dryRun) emailed = await sendEscalationEmail(escalationEmail, `🚨 UNACKNOWLEDGED EMERGENCY — ${famName}`, msg);
    if (!dryRun) await db.from("member_queries").update({ escalation_widened_at: now }).eq("id", q.id);

    actions.push({ queryId: q.id, action: "auto_escalate_widen", to: escalationWa || escalationEmail || "none", sent: sent || emailed });
    log.push(`[widen] ${q.id} — widened (wa:${sent} email:${emailed})`);
  }

  return json({
    mode: dryRun ? "dry-run" : "live",
    checked: { at75: queries75.length, breached: breached.length, widened: toWiden.length },
    actions,
    log,
  });
});
