/**
 * Cloudflare Turnstile — the Layer-1 "is there a human here?" check.
 *
 * Used on public, unauthenticated endpoints that cost real money or touch a real
 * person's inbox/phone (waitlist signup, booking requests). It is invisible to
 * almost every genuine family — no puzzles, no "pick the traffic lights".
 *
 * FAIL MODES (Engineering Constitution §2 — this is infrastructure, so it fails OPEN):
 *   - secret not configured  -> { configured: false, ok: true }  — never block a launch
 *                               on a key we haven't set yet. Caller logs it.
 *   - Cloudflare unreachable -> { ok: true, reason: "verify_unavailable" } — an outage at
 *     / times out / 5xx        Cloudflare must never stop a family reaching us.
 *   - token missing/invalid  -> { ok: false } — this is a real verification result, not an
 *                               infrastructure failure, so the caller may act on it.
 *
 * The caller decides what to DO with ok:false — while RATE_LIMIT_ENFORCE is off, it
 * only logs, so we can measure the true-bot rate before anything blocks a family.
 */

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const TIMEOUT_MS = 5000;

export interface TurnstileResult {
  configured: boolean;
  ok: boolean;
  reason: string;
}

export async function verifyTurnstile(token: string | undefined, ip?: string): Promise<TurnstileResult> {
  const secret = Deno.env.get("TURNSTILE_SECRET_KEY");
  if (!secret) return { configured: false, ok: true, reason: "not_configured" }; // FAIL OPEN

  if (!token) return { configured: true, ok: false, reason: "missing_token" };

  try {
    const form = new FormData();
    form.append("secret", secret);
    form.append("response", token);
    if (ip && ip !== "unknown") form.append("remoteip", ip);

    const res = await fetch(VERIFY_URL, {
      method: "POST",
      body: form,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) return { configured: true, ok: true, reason: "verify_unavailable" }; // FAIL OPEN

    const data = await res.json() as { success?: boolean; "error-codes"?: string[] };
    if (data.success) return { configured: true, ok: true, reason: "verified" };
    return { configured: true, ok: false, reason: (data["error-codes"] ?? ["failed"]).join(",") };
  } catch {
    return { configured: true, ok: true, reason: "verify_unavailable" }; // FAIL OPEN (infrastructure)
  }
}
