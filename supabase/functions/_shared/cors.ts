/**
 * Shared CORS + origin-guard helper for all Close Eye edge functions.
 *
 * Usage in every browser-facing edge function:
 *
 *   import { corsHeaders, checkOrigin } from "../_shared/cors.ts";
 *
 *   Deno.serve(async (req) => {
 *     const cors = corsHeaders(req);
 *     if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
 *     const badOrigin = checkOrigin(req);
 *     if (badOrigin) return badOrigin;
 *
 *     const json = (body: unknown, status = 200) =>
 *       new Response(JSON.stringify(body), {
 *         status,
 *         headers: { ...cors, "Content-Type": "application/json" },
 *       });
 *     // ...rest of handler
 *   });
 *
 * Server-to-server callers (Razorpay webhooks, cron, curl) do NOT send an
 * Origin header — they pass through checkOrigin unchanged.
 */

const ALLOWED_ORIGINS = new Set([
  "https://closeeye.in",
  "https://www.closeeye.in",
  // Vite dev server — uses ports 5173‑5177 when lower ports are busy
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
  "http://localhost:5176",
  "http://localhost:5177",
]);

function isAllowed(origin: string): boolean {
  if (ALLOWED_ORIGINS.has(origin)) return true;
  // Vercel preview deployments for this project
  if (/^https:\/\/closeeye[a-z0-9-]*\.vercel\.app$/.test(origin)) return true;
  return false;
}

/**
 * Returns per-request CORS response headers.
 * The exact Origin value is reflected back when it's an approved domain
 * (required for credentialed requests). Unknown origins fall back to the
 * primary production domain so the browser still sees a valid header.
 */
export function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") ?? "";
  return {
    "Access-Control-Allow-Origin": isAllowed(origin) ? origin : "https://closeeye.in",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Vary": "Origin",
  };
}

/**
 * Returns a 403 Response when the Origin header is present but not in the
 * allow-list. Server-to-server callers (webhooks, cron, curl) don't send
 * Origin — they pass through unchanged.
 */
export function checkOrigin(req: Request): Response | null {
  const origin = req.headers.get("Origin");
  if (origin && !isAllowed(origin)) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }
  return null;
}
