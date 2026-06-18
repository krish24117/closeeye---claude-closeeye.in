import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

  let body: {
    q1_location?: string;
    q2_residence?: string;
    q3_worries?: string[];
    q4_check_method?: string;
    q5_value_perception?: string;
    name?: string;
    whatsapp?: string;
    email?: string;
    parent_city?: string;
    source?: string;
  };

  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const { name, whatsapp, email, parent_city } = body;
  if (!name || !whatsapp || !email || !parent_city) {
    return json({ error: "Missing required fields: name, whatsapp, email, parent_city" }, 400);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const sb = createClient(supabaseUrl, supabaseServiceKey);

  const { error: insertErr } = await sb.from("survey_responses").insert({
    q1_location:        body.q1_location        ?? null,
    q2_residence:       body.q2_residence       ?? null,
    q3_worries:         body.q3_worries         ?? [],
    q4_check_method:    body.q4_check_method    ?? null,
    q5_value_perception: body.q5_value_perception ?? null,
    name:               name.trim(),
    whatsapp:           whatsapp.trim(),
    email:              email.trim().toLowerCase(),
    parent_city:        parent_city.trim(),
    source:             body.source?.trim()      || null,
  });

  if (insertErr) {
    console.error("survey_responses insert error:", insertErr);
    return json({ error: "Failed to save response" }, 500);
  }

  // WhatsApp alert to admin — fire and forget
  try {
    const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const authToken  = Deno.env.get("TWILIO_AUTH_TOKEN");
    const fromNumber = Deno.env.get("TWILIO_WHATSAPP_FROM") ?? "whatsapp:+14155238886";
    const adminTo    = "whatsapp:+919980624117";

    if (accountSid && authToken) {
      const worries = Array.isArray(body.q3_worries) && body.q3_worries.length
        ? body.q3_worries.join(", ")
        : "—";

      const msgBody = [
        `📋 *New Survey Lead — Close Eye*`,
        ``,
        `*Name:* ${name.trim()}`,
        `*WhatsApp:* ${whatsapp.trim()}`,
        `*Email:* ${email.trim()}`,
        `*Parent's city:* ${parent_city.trim()}`,
        `*Lives:* ${body.q2_residence ?? "—"}`,
        `*Worries:* ${worries}`,
        `*Source:* ${body.source?.trim() || "direct"}`,
        ``,
        `_Open admin dashboard → Survey Leads to see full response._`,
      ].join("\n");

      const from = fromNumber.startsWith("whatsapp:") ? fromNumber : `whatsapp:${fromNumber}`;
      await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
        {
          method: "POST",
          headers: {
            Authorization: `Basic ${btoa(`${accountSid}:${authToken}`)}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({ From: from, To: adminTo, Body: msgBody }),
        },
      );
    }
  } catch (alertErr) {
    console.error("WhatsApp alert failed (non-fatal):", alertErr);
  }

  return json({ success: true });
});
