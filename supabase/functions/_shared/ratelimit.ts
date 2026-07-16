/**
 * Layer-1 rate limiting + Layer-2 AI budget — the shared abuse-prevention primitive.
 *
 * A per-identifier token bucket backed by Postgres (atomic RPC), and a global daily
 * AI-call budget. Both FAIL OPEN by design (Constitution §2): if the store errors or
 * times out, the request is ALLOWED — we never take a real family down on our own
 * infrastructure failure. The global budget is the independent cost backstop.
 *
 * The store is deliberately behind this thin interface so it can be swapped for
 * Upstash Redis / edge KV at scale with no change to call sites.
 *
 * Usage (inside an edge function that already has a service-role `sb` client):
 *
 *   import { rateLimit, clientId, tooMany } from "../_shared/ratelimit.ts";
 *   const rl = await rateLimit(sb, `askpublic:${clientId(req)}`, { limit: 6, windowSeconds: 600 });
 *   if (!rl.allowed) return tooMany(cors, rl.retryAfter, "You're going a little fast — give it a moment.");
 *
 * NOTE: this ships as CODE now; it is DEPLOY-GATED — the founder runs
 * `supabase functions deploy` + the 20260741000000_rate_limit migration.
 */

// deno-lint-ignore no-explicit-any
type Sb = any; // the caller's already-created supabase-js client (service role)

export interface RatePolicy {
  limit: number;         // tokens (requests) per window
  windowSeconds: number; // refill window
}
export interface RateResult {
  allowed: boolean;
  remaining: number;
  retryAfter: number; // seconds
}

/** A composite, privacy-preserving caller identifier: prefer IP, fall back gracefully. */
export function clientId(req: Request): string {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-real-ip") ||
    "unknown";
  return ip;
}

/**
 * A stable, non-reversible id for a value we must limit on but must not store — an
 * email address or a phone number. The bucket table then holds `waitlist:email:9f2a…`
 * instead of a real person's address, so the abuse-prevention layer never becomes a
 * new place PII lives.
 */
export async function hashId(value: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value.trim().toLowerCase()));
  return Array.from(new Uint8Array(buf))
    .slice(0, 8)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Per-identifier token-bucket check. FAILS OPEN on any error. */
export async function rateLimit(sb: Sb, key: string, policy: RatePolicy): Promise<RateResult> {
  try {
    const { data, error } = await sb.rpc("rate_limit_hit", {
      p_key: key,
      p_limit: policy.limit,
      p_window: policy.windowSeconds,
    });
    if (error || !data) return { allowed: true, remaining: policy.limit, retryAfter: 0 }; // FAIL OPEN
    return {
      allowed: Boolean(data.allowed),
      remaining: Number(data.remaining ?? 0),
      retryAfter: Number(data.retry_after ?? 0),
    };
  } catch {
    return { allowed: true, remaining: policy.limit, retryAfter: 0 }; // FAIL OPEN (infrastructure)
  }
}

/** Layer-2 global AI budget: increment the day's counter, report whether we're within
 *  the cap. FAILS OPEN (allow) on error — but callers should treat "not within budget"
 *  as the signal to DEGRADE to the deterministic path rather than call the model. */
export async function withinAiBudget(sb: Sb, dailyLimit: number): Promise<boolean> {
  try {
    const { data, error } = await sb.rpc("ai_budget_hit", { p_limit: dailyLimit });
    if (error || !data) return true; // FAIL OPEN — don't block on a telemetry error
    return Boolean(data.within_budget);
  } catch {
    return true; // FAIL OPEN
  }
}

/** A friendly 429 with Retry-After — never a raw error. */
export function tooMany(cors: Record<string, string>, retryAfter: number, message: string): Response {
  return new Response(JSON.stringify({ error: "rate_limited", message }), {
    status: 429,
    headers: {
      ...cors,
      "Content-Type": "application/json",
      "Retry-After": String(Math.max(1, Math.ceil(retryAfter))),
    },
  });
}
