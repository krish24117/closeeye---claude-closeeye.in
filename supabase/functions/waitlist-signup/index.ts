import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendWhatsAppTemplate } from "../_shared/whatsapp.ts";
import { corsHeaders, checkOrigin } from "../_shared/cors.ts";
import { clientId, hashId, rateLimit, recordAbuseEvent, tooMany } from "../_shared/ratelimit.ts";
import { verifyTurnstile } from "../_shared/turnstile.ts";

// Public endpoint — saves waitlist entry, creates auth account with is_waitlisted=true,
// and sends a WhatsApp welcome via Twilio. Called from the /waitlist page (anon).

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

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const sb = createClient(supabaseUrl, serviceKey);

  let body: {
    full_name?: string;
    email?: string;
    whatsapp_number?: string;
    country?: string;
    loved_one_city?: string;
    urgency?: string;
    support_needed?: string;
    turnstile_token?: string;
  };
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }

  const { full_name, email, whatsapp_number, country, loved_one_city, urgency, support_needed } = body;
  if (!full_name || !email || !whatsapp_number) {
    return json({ error: "full_name, email, and whatsapp_number are required" }, 400);
  }

  const name = full_name.trim();
  const emailLower = email.trim().toLowerCase();
  const waNum = whatsapp_number.trim();

  // ── Abuse prevention (Layers 1 & 2) — LOG-ONLY until RATE_LIMIT_ENFORCE=true. ──
  //
  // This endpoint is worth protecting for a reason beyond our own cost: unthrottled, it
  // lets anyone make Close Eye send a confirmation email to any address and a WhatsApp to
  // any number. So we limit per-VICTIM (email, number) as well as per-caller (IP) — a
  // rotating-IP attacker still can't bomb one person's inbox or phone.
  //
  // Everything here FAILS OPEN (Constitution §2): a broken limiter must never stop a real
  // family joining the waitlist. Buckets key on a hash — never a raw email or number.
  {
    const enforce = (Deno.env.get("RATE_LIMIT_ENFORCE") ?? "").toLowerCase() === "true";
    const ip = clientId(req);
    const [emailKey, waKey] = await Promise.all([hashId(emailLower), hashId(waNum)]);

    const turnstile = await verifyTurnstile(body.turnstile_token, ip);

    const [ipBurst, ipDay, perEmail, perNumber] = await Promise.all([
      rateLimit(sb, `waitlist:ip:burst:${ip}`, { limit: 3, windowSeconds: 900 }),     // anti-flood
      rateLimit(sb, `waitlist:ip:day:${ip}`, { limit: 10, windowSeconds: 86400 }),    // generous: offices/CGNAT share IPs
      rateLimit(sb, `waitlist:email:${emailKey}`, { limit: 3, windowSeconds: 86400 }), // protects an inbox
      rateLimit(sb, `waitlist:wa:${waKey}`, { limit: 3, windowSeconds: 86400 }),       // protects a phone (also Twilio cost)
    ]);

    const limited = !ipBurst.allowed || !ipDay.allowed || !perEmail.allowed || !perNumber.allowed;
    const botBlocked = turnstile.configured && !turnstile.ok;
    // Decisions and counts only — no email, number, or IP is ever logged.
    console.log(JSON.stringify({
      evt: "abuse_guard", endpoint: "waitlist-signup", enforce,
      wouldBlock: limited || botBlocked, limited, botBlocked,
      turnstile: turnstile.reason,
      ipBurstOk: ipBurst.allowed, ipDayOk: ipDay.allowed,
      emailOk: perEmail.allowed, numberOk: perNumber.allowed,
    }));

    if (limited || botBlocked) {
      await recordAbuseEvent(sb, {
        endpoint: "waitlist-signup",
        reason: botBlocked ? "bot" : "rate_limited",
        enforced: enforce,
        tier: "anon",
        actor: await hashId(ip),
      });
    }

    if (enforce && botBlocked) {
      return json({
        error: "verification_failed",
        message: "We couldn't confirm that request came from a person. Please refresh and try once more — or just message us on WhatsApp at +91 90002 21261 and we'll add you ourselves.",
      }, 403);
    }
    if (enforce && limited) {
      const retry = Math.max(ipBurst.retryAfter, ipDay.retryAfter, perEmail.retryAfter, perNumber.retryAfter);
      return tooMany(cors, retry, "You're already on our list — we've got your details. If something looks wrong, message us on WhatsApp at +91 90002 21261 and a person will sort it out.");
    }
  }

  // 1) Create auth account (confirm email immediately so they can log in after clicking the link)
  const { data: authData, error: authErr } = await sb.auth.admin.createUser({
    email: emailLower,
    email_confirm: false, // Supabase sends confirmation email
    user_metadata: { full_name: name },
  });

  let userId: string | null = null;

  if (authErr) {
    if (authErr.message?.includes("already been registered") || authErr.code === "email_exists" || (authErr as { status?: number }).status === 422) {
      // Email already exists — fetch the existing user so we can still set is_waitlisted
      const { data: existingUsers } = await sb.auth.admin.listUsers();
      const existing = existingUsers?.users?.find((u) => u.email === emailLower);
      if (existing) userId = existing.id;
    } else {
      console.error("Auth user create error:", authErr);
      return json({ error: "Could not create account. Please try again." }, 500);
    }
  } else {
    userId = authData.user?.id ?? null;
  }

  // 2) Set is_waitlisted=true on the profile (upsert handles both new and existing users)
  if (userId) {
    await sb.from("profiles").upsert({
      id: userId,
      full_name: name,
      whatsapp_number: waNum,
      is_waitlisted: true,
      role: "family",
    }, { onConflict: "id" });
  }

  // 3) Insert waitlist row (upsert by email — idempotent)
  await sb.from("waitlist").upsert({
    full_name: name,
    email: emailLower,
    whatsapp_number: waNum,
    country: country || null,
    loved_one_city: loved_one_city || null,
    urgency: urgency || "exploring",
    support_needed: support_needed || null,
  }, { onConflict: "email" });

  // 4) Send WhatsApp welcome (non-fatal)
  if (waNum) {
    await sendWhatsAppTemplate({ to: waNum, template: "waitlist_welcome", variables: [name], sb })
      .catch((e) => console.error("[waitlist-signup] WhatsApp failed (non-fatal):", e));
  }

  return json({ ok: true });
});
