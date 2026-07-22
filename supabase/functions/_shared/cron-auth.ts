/**
 * Cron / scheduled-job authorization — a shared guard for the internal functions that fan out
 * WhatsApp/email or scan whole tables and have NO legitimate public caller (visit reminders, monthly
 * summaries, overdue-booking checks, care-intelligence scans, founder briefings/nurture).
 *
 * SAFE TO DEPLOY BEFORE CONFIGURING: if `CRON_SECRET` is unset, this is a NO-OP (returns null →
 * allow), so shipping it changes nothing until you opt in. Once you set `CRON_SECRET` in the
 * function env AND pass it on each schedule (header `x-cron-secret`, or as the Bearer token), the
 * guard enforces. It also accepts the Supabase service-role key as Bearer, so a Supabase-scheduled
 * job that already sends the service-role token keeps working.
 *
 * Usage — first lines of the handler, right after the OPTIONS short-circuit:
 *   import { requireCronSecret } from "../_shared/cron-auth.ts";
 *   const denied = requireCronSecret(req);
 *   if (denied) return denied;
 */
export function requireCronSecret(req: Request): Response | null {
  const secret = Deno.env.get("CRON_SECRET");
  if (!secret) return null; // not configured yet → no-op (fail-open, safe to deploy)

  const authHeader = req.headers.get("Authorization") || "";
  const bearer = authHeader.replace(/^Bearer\s+/i, "").trim();
  const provided = (req.headers.get("x-cron-secret") || bearer).trim();
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (provided === secret) return null;
  if (serviceKey && bearer === serviceKey) return null;

  return new Response(JSON.stringify({ error: "Unauthorized" }), {
    status: 401,
    headers: { "Content-Type": "application/json" },
  });
}
