// Smoke-test function — send any approved WhatsApp template to any number.
// Admin auth enforced in-function. Deploy, test, then delete.
//
// Usage:
//   curl -s -X POST \
//     "https://kghwmiriboavmyswcqnr.supabase.co/functions/v1/send-whatsapp-test" \
//     -H "Authorization: Bearer <your-jwt>" \
//     -H "Content-Type: application/json" \
//     -d '{"to":"+919999999999","template":"founding_welcome","variables":["Krishna","1"]}'

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendWhatsAppTemplate, TemplateName, TEMPLATES } from "../_shared/whatsapp.ts";
import { corsHeaders, checkOrigin } from "../_shared/cors.ts";

Deno.serve(async (req: Request) => {
  const cors = corsHeaders(req);

  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });

  const originErr = checkOrigin(req);
  if (originErr) return originErr;

  const json = (body: unknown, status = 200): Response =>
    new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

  // Require admin auth
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Missing Authorization header" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const callerSb = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user } } = await callerSb.auth.getUser();
  if (!user) return json({ error: "Unauthorized" }, 401);

  const sbService = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: prof } = await sbService.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (prof?.role !== "admin") return json({ error: "Forbidden — admin only" }, 403);

  let body: { to?: string; template?: string; variables?: string[] };
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }

  const { to, template, variables } = body;
  if (!to || !template || !Array.isArray(variables)) {
    return json({ error: "to, template (string), and variables (array) are required" }, 400);
  }
  if (!(template in TEMPLATES)) {
    return json({ error: `Unknown template "${template}". Valid: ${Object.keys(TEMPLATES).join(", ")}` }, 400);
  }

  const result = await sendWhatsAppTemplate({
    to,
    template: template as TemplateName,
    variables,
    sb: sbService,
  });

  return json({ ...result, template, to });
});
