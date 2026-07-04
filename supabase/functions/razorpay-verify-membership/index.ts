import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendWhatsAppTemplate } from "../_shared/whatsapp.ts";
import { corsHeaders, checkOrigin } from "../_shared/cors.ts";

// Verify a founding-membership payment SERVER-SIDE (HMAC of order_id|payment_id).
// Called directly from the Razorpay handler callback in the client — no polling.
// Idempotent: if already activated, returns the existing founding_number.

async function verifySignature(orderId: string, paymentId: string, signature: string, secret: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(`${orderId}|${paymentId}`));
  const computed = Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
  return computed === signature;
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

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Missing Authorization header" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const callerSb = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: userErr } = await callerSb.auth.getUser();
  if (userErr || !user) return json({ error: "Unauthorized" }, 401);

  let body: { razorpay_payment_id?: string; razorpay_order_id?: string; razorpay_signature?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }
  const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = body;
  if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
    return json({ error: "Missing payment fields" }, 400);
  }

  const secret = Deno.env.get("RAZORPAY_KEY_SECRET")!;
  const valid = await verifySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature, secret);
  if (!valid) return json({ error: "Invalid signature" }, 400);

  const sb = createClient(supabaseUrl, supabaseServiceKey);

  // Bind to the caller's own pending membership for this order
  const { data: membership, error: mErr } = await sb
    .from("memberships")
    .select("id, user_id, status")
    .eq("razorpay_order_id", razorpay_order_id)
    .single();

  if (mErr || !membership) return json({ error: "Membership not found" }, 404);
  if (membership.user_id !== user.id) return json({ error: "Forbidden" }, 403);

  // Idempotent: already activated (webhook beat us to it or client called twice).
  // Still send WhatsApp if it was never delivered (race guard: check whatsapp_messages).
  if (membership.status === "active") {
    const { data: prof } = await sb.from("profiles")
      .select("founding_number, whatsapp_number, full_name")
      .eq("id", user.id)
      .maybeSingle();
    const waNum = (prof?.whatsapp_number as string | null)?.trim();
    if (waNum) {
      const last10 = waNum.replace(/\D/g, "").slice(-10);
      const { count } = await sb.from("whatsapp_messages")
        .select("id", { count: "exact", head: true })
        .eq("template", "founding_welcome")
        .ilike("to_number", `%${last10}%`);
      if (!count) {
        const name = (prof?.full_name as string | null) || "there";
        const fn   = String(prof?.founding_number ?? 1);
        await sendWhatsAppTemplate({ to: waNum, template: "payment_received", variables: [name, "100", "Founding Membership"], sb }).catch(() => {});
        await sendWhatsAppTemplate({ to: waNum, template: "founding_welcome", variables: [name, fn], sb }).catch(() => {});
      }
    }
    return json({ ok: true, founding_number: prof?.founding_number ?? 1 });
  }

  // Mark membership active
  await sb.from("memberships").update({
    status: "active",
    razorpay_payment_id,
    activated_at: new Date().toISOString(),
  }).eq("id", membership.id);

  // Assign sequential founding number (low-volume pre-launch, non-atomic is fine)
  const { count: fmCount } = await sb
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("is_founding_member", true);
  const foundingNumber = (fmCount ?? 0) + 1;
  const foundingDate = new Date().toISOString();

  await sb.from("profiles").update({
    is_founding_member: true,
    founding_number: foundingNumber,
    founding_date: foundingDate,
  }).eq("id", user.id);

  // Non-fatal WhatsApp notifications (payment_received then founding_welcome).
  try {
    const { data: prof } = await sb.from("profiles")
      .select("whatsapp_number, full_name")
      .eq("id", user.id)
      .maybeSingle();
    const waNum = (prof?.whatsapp_number as string | null)?.trim();
    if (waNum) {
      const name = (prof?.full_name as string | null) || "there";
      await sendWhatsAppTemplate({ to: waNum, template: "payment_received", variables: [name, "100", "Founding Membership"], sb });
      await sendWhatsAppTemplate({ to: waNum, template: "founding_welcome", variables: [name, String(foundingNumber)], sb });
    } else {
      console.warn("[verify-membership] WhatsApp skipped — no whatsapp_number on profile");
    }
  } catch (waErr) {
    console.error("Membership welcome WhatsApp failed (non-fatal):", waErr);
  }

  return json({ ok: true, founding_number: foundingNumber });
});
