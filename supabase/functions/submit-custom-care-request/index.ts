import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, checkOrigin } from "../_shared/cors.ts";

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
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

  let body: {
    full_name?: string;
    email?: string;
    whatsapp_number?: string;
    country?: string;
    parent_city?: string;
    people_count?: number;
    care_types?: string[];
    situation?: string;
    urgency?: string;
    budget_range?: string;
  };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const {
    full_name, email, whatsapp_number, country, parent_city,
    people_count, care_types, situation, urgency, budget_range,
  } = body;

  if (!full_name || !email || !whatsapp_number || !country || !parent_city || !care_types?.length) {
    return json({ error: "Missing required fields" }, 400);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const sb = createClient(supabaseUrl, supabaseServiceKey);

  const { error: insertErr } = await sb.from("custom_care_requests").insert({
    full_name,
    email,
    whatsapp_number,
    country,
    parent_city,
    people_count: people_count ?? null,
    care_types,
    situation: situation?.trim() || null,
    urgency: urgency || null,
    budget_range: budget_range || null,
  });

  if (insertErr) {
    console.error("custom_care_requests insert error:", insertErr);
    return json({ error: "Could not save your request" }, 500);
  }

  // Notification email — non-fatal
  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const resendFromEmail = Deno.env.get("RESEND_FROM_EMAIL") ?? "invoices@closeeye.in";
    if (resendApiKey) {
      const emailRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
          from: resendFromEmail,
          to: ["hello@closeeye.in"],
          subject: `New custom care request — ${full_name}`,
          html: `
            <h2>New custom care request</h2>
            <p><strong>Name:</strong> ${escapeHtml(full_name)}</p>
            <p><strong>Email:</strong> ${escapeHtml(email)}</p>
            <p><strong>WhatsApp:</strong> ${escapeHtml(whatsapp_number)}</p>
            <p><strong>Country:</strong> ${escapeHtml(country)}</p>
            <p><strong>Parent(s) city:</strong> ${escapeHtml(parent_city)}</p>
            ${people_count ? `<p><strong>People needing care:</strong> ${people_count}</p>` : ""}
            <p><strong>Care types:</strong> ${care_types.map(escapeHtml).join(", ")}</p>
            ${urgency ? `<p><strong>How soon:</strong> ${escapeHtml(urgency)}</p>` : ""}
            ${budget_range ? `<p><strong>Budget range:</strong> ${escapeHtml(budget_range)}</p>` : ""}
            ${situation?.trim() ? `<p><strong>Situation:</strong> ${escapeHtml(situation.trim())}</p>` : ""}
          `,
        }),
      });
      if (!emailRes.ok) {
        console.error("Resend email error:", await emailRes.text());
      }
    }
  } catch (emailErr) {
    console.error("Custom care notification email failed (non-fatal):", emailErr);
  }

  return json({ success: true });
});
