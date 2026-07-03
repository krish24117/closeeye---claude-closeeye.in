import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, checkOrigin } from "../_shared/cors.ts";

// Manually-triggered WhatsApp broadcast for pre-launch engagement.
// Protected by the BROADCAST_SECRET header.
//
// Usage:
//   curl -X POST https://<project>.supabase.co/functions/v1/whatsapp-broadcast \
//     -H "Authorization: Bearer <anon_key>" \
//     -H "x-broadcast-secret: <BROADCAST_SECRET>" \
//     -H "Content-Type: application/json" \
//     -d '{"template": "weekly_update", "audience": "founding_members", "custom_vars": {"week": "1", "tip": "..."}}'
//
// Templates: weekly_update | pre_launch_teaser | launch_announcement | city_milestone | ask_nudge
// Audience:  founding_members | waitlist | all


type Template = "weekly_update" | "pre_launch_teaser" | "launch_announcement" | "city_milestone" | "ask_nudge";
type Audience = "founding_members" | "waitlist" | "all";

function buildMessage(
  template: Template,
  vars: { name?: string; foundingNum?: number | null; customVars?: Record<string, string> },
): string {
  const name = vars.name || "there";
  const num = vars.foundingNum;
  const v = vars.customVars || {};

  switch (template) {
    case "weekly_update":
      return [
        `Hi ${name}${num ? ` (Founding Member #${num})` : ""} 🌿`,
        ``,
        `A quick update from Close Eye — we're getting ready for 15 August.`,
        ``,
        v.update || "Our team is meeting and verifying companions this week. Each one is being interviewed, background-checked, and trained before their first visit.",
        ``,
        v.tip ? `Elder-care tip: ${v.tip}` : `Elder-care tip: Encourage your loved one to drink water regularly — dehydration in older adults is easy to miss.`,
        ``,
        `Talk soon,`,
        `Krishna & Aishwarya`,
        `Close Eye 🌿`,
      ].join("\n");

    case "pre_launch_teaser":
      return [
        `Hi ${name}${num ? ` (Founding Member #${num})` : ""} 🌿`,
        ``,
        `10 days to 15 August.`,
        ``,
        `We're scheduling first visits now — your family is at the top of the list.`,
        ``,
        `If you haven't already, log in and add your loved one's details so we can match the right companion:`,
        `closeeye.in/dashboard`,
        ``,
        `We're excited. See you on 15 August 🇮🇳`,
        ``,
        `Krishna & Aishwarya`,
        `Close Eye`,
      ].join("\n");

    case "launch_announcement":
      return [
        `Hi ${name}${num ? ` (Founding Member #${num})` : ""} 🌿`,
        ``,
        `🇮🇳 Today is 15 August — and Close Eye is live.`,
        ``,
        `Companion visits are now open for booking${num ? " — and you're first" : ""}.`,
        ``,
        `Book your first visit at closeeye.in/dashboard`,
        ``,
        `Thank you for trusting us. We won't let your family down.`,
        ``,
        `With care,`,
        `Krishna & Aishwarya`,
        `Close Eye`,
      ].join("\n");

    case "city_milestone":
      return [
        `Hi ${name} 🌿`,
        ``,
        `A milestone: ${v.count || "X"} families have now joined Close Eye in ${v.city || "Hyderabad"}.`,
        ``,
        `We're growing — and so is our companion team. Every family added means more visits, more care, more presence.`,
        ``,
        `Thank you for being part of this.`,
        ``,
        `With care,`,
        `Team Close Eye`,
      ].join("\n");

    case "ask_nudge":
      return [
        `Hi ${name} 🌿`,
        ``,
        `A quick reminder — Ask Close Eye is available for you right now.`,
        ``,
        `Have a question about your loved one's health, medicines, or daily care? Our medical team reviews every response.`,
        ``,
        `closeeye.in/dashboard/ask`,
        ``,
        `(5 free questions/month — renews on the 1st)`,
        ``,
        `With care,`,
        `Team Close Eye`,
      ].join("\n");

    default:
      return `Hi ${name} 🌿\n\nA message from Close Eye.`;
  }
}

Deno.serve(async (req: Request) => {
  // x-broadcast-secret is a custom auth header — add it to the allowed list
  const cors = {
    ...corsHeaders(req),
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-broadcast-secret",
  };

  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });

  const originErr = checkOrigin(req);
  if (originErr) return originErr;

  const json = (body: unknown, status = 200): Response =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...cors, "Content-Type": "application/json" },
    });

  // Auth: require broadcast secret header
  const secret = Deno.env.get("BROADCAST_SECRET");
  if (secret && req.headers.get("x-broadcast-secret") !== secret) {
    return json({ error: "Unauthorized" }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const sb = createClient(supabaseUrl, serviceKey);

  let body: { template?: string; audience?: string; custom_vars?: Record<string, string>; dry_run?: boolean };
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }

  const template = (body.template || "weekly_update") as Template;
  const audience = (body.audience || "founding_members") as Audience;
  const customVars = body.custom_vars || {};
  const dryRun = body.dry_run === true;

  // Fetch recipients
  let query = sb.from("profiles").select("id, full_name, whatsapp_number, founding_number, is_founding_member, is_waitlisted").eq("role", "family");

  if (audience === "founding_members") {
    query = query.eq("is_founding_member", true);
  } else if (audience === "waitlist") {
    query = query.eq("is_waitlisted", true).eq("is_founding_member", false);
  }
  // "all" → no additional filter

  const { data: recipients, error: fetchErr } = await query;
  if (fetchErr) return json({ error: "Could not fetch recipients", detail: fetchErr.message }, 500);
  if (!recipients?.length) return json({ ok: true, sent: 0, skipped: 0, message: "No recipients found" });

  const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const authToken  = Deno.env.get("TWILIO_AUTH_TOKEN");
  const fromNum    = Deno.env.get("TWILIO_WHATSAPP_FROM") ?? "whatsapp:+14155238886";

  if (!accountSid || !authToken) {
    return json({ error: "Twilio credentials not set (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)" }, 500);
  }

  let sent = 0, skipped = 0;
  const errors: string[] = [];

  for (const r of recipients) {
    const waNum = (r.whatsapp_number as string | null)?.trim();
    if (!waNum) { skipped++; continue; }

    const msgBody = buildMessage(template, {
      name: (r.full_name as string | null) || undefined,
      foundingNum: r.founding_number as number | null,
      customVars,
    });

    if (dryRun) {
      console.log(`[DRY RUN] → ${waNum}\n${msgBody}\n---`);
      sent++;
      continue;
    }

    try {
      const to = waNum.startsWith("whatsapp:") ? waNum : `whatsapp:${waNum}`;
      const params = new URLSearchParams({ From: fromNum, To: to, Body: msgBody });
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
      if (res.ok) { sent++; } else {
        const t = await res.text();
        errors.push(`${waNum}: ${res.status} ${t.slice(0, 100)}`);
        skipped++;
      }
    } catch (err) {
      errors.push(`${waNum}: ${String(err).slice(0, 80)}`);
      skipped++;
    }

    // Rate-limit: Twilio recommends ≤1 msg/s per number
    await new Promise((r) => setTimeout(r, 1100));
  }

  return json({ ok: true, template, audience, sent, skipped, errors: errors.length ? errors : undefined });
});
