// Close Eye — shared WhatsApp template helper
//
// Import in any edge function:
//   import { sendWhatsAppTemplate } from "../_shared/whatsapp.ts"
//
// Required secrets: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM
// Template SIDs are hardcoded — all 8 are approved. Don't swap without Twilio re-approval.

// ── Template registry ──────────────────────────────────────────────────────
// vars lists variable names in order; they map to positional ContentVariables {"1":…,"2":…}
export const TEMPLATES = {
  founding_welcome: { sid: "HX605ee0cdb1d07028a4962eb59a1b652b", vars: ["name", "member_number"] },
  waitlist_welcome: { sid: "HX226bf7f738cbfa4d86cd4289f5face3d", vars: ["name"] },
  payment_received: { sid: "HXfe55800175aef7b25206c3648c4550d5", vars: ["name", "amount", "item"] },
  visit_confirmed:  { sid: "HXc4706d6ce4aee23982b7e45e3c712697", vars: ["name", "companion", "datetime"] },
  visit_reminder:   { sid: "HX050a54d79f8e5c2595d10dffdba146cb", vars: ["name", "elder", "datetime"] },
  visit_completed:  { sid: "HX6ee830afb33f4b3a3c7fcff59ee8203a", vars: ["name", "elder", "companion", "date"] },
  query_response:   { sid: "HX498ddb1c0fa6f97a2fc51020746b1d88", vars: ["name"] },
  monthly_summary:  { sid: "HXf4b80d3696bfd3ed256c948c13176517", vars: ["name", "elder", "visits", "month"] },
} as const;

export type TemplateName = keyof typeof TEMPLATES;

// ── Phone normaliser ───────────────────────────────────────────────────────
// Returns "whatsapp:+91XXXXXXXXXX" for Indian numbers; handles international too.
// Throws with a clear message if the number cannot be normalised — caller logs and skips.
export function normalisePhone(raw: string): string {
  const t = raw.trim().replace(/[\s\-().]/g, "");
  if (t.startsWith("whatsapp:")) {
    const num = t.slice("whatsapp:".length);
    if (num.startsWith("+") && num.length >= 10) return t;
    throw new Error(`Malformed whatsapp: prefix — expected "whatsapp:+…", got "${raw}"`);
  }
  if (t.startsWith("+91") && t.length === 13) return `whatsapp:${t}`;
  if (t.startsWith("91")  && t.length === 12)  return `whatsapp:+${t}`;
  if (/^\d{10}$/.test(t))                      return `whatsapp:+91${t}`;
  if (t.startsWith("+")   && t.length >= 10)   return `whatsapp:${t}`;
  throw new Error(`Cannot normalise phone to E.164: "${raw}" (${t.length} chars after strip)`);
}

// ── Types ──────────────────────────────────────────────────────────────────

export interface SendResult {
  success: boolean;
  twilioSid?: string;
  error?: string;
}

// Minimal supabase-client interface — avoids a heavy import in this shared module
// deno-lint-ignore no-explicit-any
type SupabaseLike = { from(table: string): any };

export interface SendOptions {
  to: string;
  template: TemplateName;
  variables: string[];  // Ordered: variables[0] → "1", variables[1] → "2", …
  sb?: SupabaseLike;    // Optional — pass the service-role client to log to whatsapp_messages
}

// ── sendWhatsAppTemplate ───────────────────────────────────────────────────
// Never throws. Always returns { success, twilioSid?, error? }.
// A failed WhatsApp send MUST NOT break the parent flow — log and continue.
export async function sendWhatsAppTemplate({
  to, template, variables, sb,
}: SendOptions): Promise<SendResult> {
  const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const authToken  = Deno.env.get("TWILIO_AUTH_TOKEN");
  const fromNum    = Deno.env.get("TWILIO_WHATSAPP_FROM");

  if (!accountSid || !authToken || !fromNum) {
    const error = "Twilio credentials not configured (TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_WHATSAPP_FROM)";
    console.warn(`[whatsapp] ${template}: ${error}`);
    await _log({ to, template, status: "skipped", error, sb });
    return { success: false, error };
  }

  let toNorm: string;
  try {
    toNorm = normalisePhone(to);
  } catch (e) {
    const error = `phone_normalise_failed: ${e}`;
    console.error(`[whatsapp] ${template}: ${error}`);
    await _log({ to, template, status: "failed", error, sb });
    return { success: false, error };
  }

  const tpl = TEMPLATES[template];
  // ContentVariables must be a JSON string of {"1":"…","2":"…"} — positional
  const contentVars: Record<string, string> = {};
  variables.forEach((v, i) => { contentVars[String(i + 1)] = v; });

  const params = new URLSearchParams({
    From: fromNum,
    To: toNorm,
    ContentSid: tpl.sid,
    ContentVariables: JSON.stringify(contentVars),
  });

  let result: SendResult;
  try {
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${btoa(`${accountSid}:${authToken}`)}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params,
      },
    );
    if (res.ok) {
      const data = await res.json() as { sid?: string };
      result = { success: true, twilioSid: data.sid };
      console.log(`[whatsapp] ${template} → ${toNorm} ok (${data.sid})`);
    } else {
      const errText = await res.text();
      console.error(`[whatsapp] ${template} → ${toNorm} HTTP ${res.status}:`, errText);
      result = { success: false, error: `Twilio HTTP ${res.status}: ${errText.slice(0, 400)}` };
    }
  } catch (e) {
    const error = `fetch_error: ${e}`;
    console.error(`[whatsapp] ${template} → ${toNorm} fetch error:`, error);
    result = { success: false, error };
  }

  await _log({
    to: toNorm, template, sb,
    status: result.success ? "sent" : "failed",
    twilioSid: result.twilioSid,
    error: result.error,
    payload: { contentVars, sid: tpl.sid },
  });

  return result;
}

// ── sendWhatsAppFreeText ───────────────────────────────────────────────────
// For status notifications that don't yet have an approved Twilio template.
// Uses Body= (free-form) instead of ContentSid= — works within a 24-h session
// window. Attach templates once approved; use this only as interim fallback.
export interface FreeTextOptions {
  to: string;
  body: string;
  sb?: SupabaseLike;
  tag?: string;  // Stored in whatsapp_messages.template column for tracking
}

export async function sendWhatsAppFreeText({
  to, body, sb, tag,
}: FreeTextOptions): Promise<SendResult> {
  const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const authToken  = Deno.env.get("TWILIO_AUTH_TOKEN");
  const fromNum    = Deno.env.get("TWILIO_WHATSAPP_FROM");

  if (!accountSid || !authToken || !fromNum) {
    const error = "Twilio credentials not configured";
    console.warn(`[whatsapp] freetext(${tag}): ${error}`);
    return { success: false, error };
  }

  let toNorm: string;
  try {
    toNorm = normalisePhone(to);
  } catch (e) {
    const error = `phone_normalise_failed: ${e}`;
    console.error(`[whatsapp] freetext(${tag}): ${error}`);
    return { success: false, error };
  }

  const params = new URLSearchParams({ From: fromNum, To: toNorm, Body: body });
  let result: SendResult;
  try {
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${btoa(`${accountSid}:${authToken}`)}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params,
      },
    );
    if (res.ok) {
      const data = await res.json() as { sid?: string };
      result = { success: true, twilioSid: data.sid };
      console.log(`[whatsapp] freetext(${tag}) → ${toNorm} ok (${data.sid})`);
    } else {
      const errText = await res.text();
      console.error(`[whatsapp] freetext(${tag}) → ${toNorm} HTTP ${res.status}:`, errText);
      result = { success: false, error: `Twilio HTTP ${res.status}: ${errText.slice(0, 400)}` };
    }
  } catch (e) {
    const error = `fetch_error: ${e}`;
    result = { success: false, error };
    console.error(`[whatsapp] freetext(${tag}) fetch error:`, error);
  }

  if (sb) {
    try {
      await sb.from("whatsapp_messages").insert({
        to_number:   toNorm,
        template:    tag ?? "freetext",
        content_sid: null,
        status:      result.success ? "sent" : "failed",
        twilio_sid:  result.twilioSid ?? null,
        error:       result.error    ?? null,
        payload:     { body: body.slice(0, 200) },
      });
    } catch (e) {
      console.error("[whatsapp] log insert failed (non-fatal):", e);
    }
  }

  return result;
}

// ── Internal logger ────────────────────────────────────────────────────────
async function _log(p: {
  to: string;
  template: string;
  status: "sent" | "failed" | "skipped";
  twilioSid?: string;
  error?: string;
  payload?: Record<string, unknown>;
  sb?: SupabaseLike;
}): Promise<void> {
  if (!p.sb) return;
  try {
    const tpl = TEMPLATES[p.template as TemplateName];
    await p.sb.from("whatsapp_messages").insert({
      to_number:   p.to,
      template:    p.template,
      content_sid: tpl?.sid ?? null,
      status:      p.status,
      twilio_sid:  p.twilioSid ?? null,
      error:       p.error    ?? null,
      payload:     p.payload  ?? null,
    });
  } catch (e) {
    // Logging must never break the calling function
    console.error("[whatsapp] log insert failed (non-fatal):", e);
  }
}
