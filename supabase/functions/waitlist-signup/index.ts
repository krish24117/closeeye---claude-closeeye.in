import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendWhatsAppTemplate } from "../_shared/whatsapp.ts";
import { corsHeaders, checkOrigin } from "../_shared/cors.ts";

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
  };
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }

  const { full_name, email, whatsapp_number, country, loved_one_city, urgency, support_needed } = body;
  if (!full_name || !email || !whatsapp_number) {
    return json({ error: "full_name, email, and whatsapp_number are required" }, 400);
  }

  const name = full_name.trim();
  const emailLower = email.trim().toLowerCase();
  const waNum = whatsapp_number.trim();

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
