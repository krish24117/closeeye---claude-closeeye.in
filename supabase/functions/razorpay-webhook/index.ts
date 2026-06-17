import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "x-razorpay-signature, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

const PLAN_DISPLAY: Record<string, string> = {
  companion: "Companion",
  trust: "Trust",
  family_os: "Family OS",
};

// ── Razorpay signature verification ──────────────────────────────────────────
async function verifySignature(
  rawBody: string,
  signature: string,
  secret: string,
): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signatureBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(rawBody));
  const computed = Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return computed === signature;
}

// ── Invoice email HTML ────────────────────────────────────────────────────────
function buildInvoiceHtml(opts: {
  invoiceNumber: number;
  planName: string;
  amountInr: string;
  date: string;
  nextBillingDate: string;
  userName: string;
}): string {
  const { invoiceNumber, planName, amountInr, date, nextBillingDate, userName } = opts;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Close Eye Payment Receipt</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="background:#1a1a2e;padding:28px 36px;">
              <p style="margin:0;color:#ffffff;font-size:22px;font-weight:bold;letter-spacing:1px;">Close Eye</p>
              <p style="margin:4px 0 0;color:#a0a0c0;font-size:13px;">Payment Receipt</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px 36px;">
              <p style="margin:0 0 8px;color:#333;font-size:15px;">Hi ${userName},</p>
              <p style="margin:0 0 24px;color:#555;font-size:14px;">Thank you for your payment. Your Close Eye subscription is active.</p>

              <!-- Invoice details -->
              <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e0e0e0;border-radius:6px;overflow:hidden;">
                <tr style="background:#f9f9f9;">
                  <td style="padding:10px 16px;color:#888;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Invoice #</td>
                  <td style="padding:10px 16px;color:#333;font-size:13px;text-align:right;">${String(invoiceNumber).padStart(4, "0")}</td>
                </tr>
                <tr>
                  <td style="padding:10px 16px;color:#888;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;border-top:1px solid #e0e0e0;">Date</td>
                  <td style="padding:10px 16px;color:#333;font-size:13px;text-align:right;border-top:1px solid #e0e0e0;">${date}</td>
                </tr>
                <tr style="background:#f9f9f9;">
                  <td style="padding:10px 16px;color:#888;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;border-top:1px solid #e0e0e0;">Plan</td>
                  <td style="padding:10px 16px;color:#333;font-size:13px;text-align:right;border-top:1px solid #e0e0e0;">${planName}</td>
                </tr>
                <tr>
                  <td style="padding:10px 16px;color:#888;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;border-top:1px solid #e0e0e0;">Amount Paid</td>
                  <td style="padding:10px 16px;color:#1a1a2e;font-size:15px;font-weight:bold;text-align:right;border-top:1px solid #e0e0e0;">₹${amountInr}</td>
                </tr>
                <tr style="background:#f9f9f9;">
                  <td style="padding:10px 16px;color:#888;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;border-top:1px solid #e0e0e0;">Next Billing</td>
                  <td style="padding:10px 16px;color:#333;font-size:13px;text-align:right;border-top:1px solid #e0e0e0;">${nextBillingDate}</td>
                </tr>
              </table>

              <p style="margin:28px 0 0;color:#777;font-size:12px;">If you have questions, contact us at tech.closeeye@gmail.com</p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#f0f0f5;padding:16px 36px;text-align:center;">
              <p style="margin:0;color:#aaa;font-size:11px;">© ${new Date().getFullYear()} Close Eye · closeeye.in</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function formatDate(ts: number | null | undefined): string {
  if (!ts) return "—";
  return new Date(ts * 1000).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  const rawBody = await req.text();

  // ── Signature verification ────────────────────────────────────────────────
  const webhookSecret = Deno.env.get("RAZORPAY_WEBHOOK_SECRET");
  if (!webhookSecret) {
    console.error("RAZORPAY_WEBHOOK_SECRET not set");
    return json({ error: "Webhook secret not configured" }, 500);
  }

  const signature = req.headers.get("x-razorpay-signature") ?? "";
  const valid = await verifySignature(rawBody, signature, webhookSecret);
  if (!valid) {
    return json({ error: "Invalid signature" }, 400);
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const event = payload.event as string | undefined;
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const sb = createClient(supabaseUrl, supabaseServiceKey);

  // Extract subscription object from payload
  // Razorpay webhook payload: payload.payload.subscription.entity
  // deno-lint-ignore no-explicit-any
  const rzSub = (payload.payload as any)?.subscription?.entity as Record<string, unknown> | undefined;
  // deno-lint-ignore no-explicit-any
  const rzPayment = (payload.payload as any)?.payment?.entity as Record<string, unknown> | undefined;

  if (!rzSub?.id) {
    console.warn("No subscription entity in payload", event);
    return json({ ok: true });
  }

  const rzSubId = rzSub.id as string;

  // ── Fetch local subscription ──────────────────────────────────────────────
  const { data: localSub, error: localSubErr } = await sb
    .from("subscriptions")
    .select("id, user_id, plan_id, invoice_count, total_paid_paise")
    .eq("razorpay_subscription_id", rzSubId)
    .single();

  if (localSubErr || !localSub) {
    console.warn("Subscription not found locally for rzSubId:", rzSubId, localSubErr);
    return json({ ok: true });
  }

  // ── Handle events ─────────────────────────────────────────────────────────
  switch (event) {
    case "subscription.activated": {
      await sb.from("subscriptions").update({
        status: "active",
        current_start: rzSub.current_start ? new Date((rzSub.current_start as number) * 1000).toISOString() : null,
        current_end: rzSub.current_end ? new Date((rzSub.current_end as number) * 1000).toISOString() : null,
        next_billing_at: rzSub.charge_at ? new Date((rzSub.charge_at as number) * 1000).toISOString() : null,
      }).eq("razorpay_subscription_id", rzSubId);
      break;
    }

    case "subscription.charged": {
      const paymentAmount = typeof rzPayment?.amount === "number" ? rzPayment.amount as number : 0;
      const newInvoiceCount = (localSub.invoice_count ?? 0) + 1;
      const newTotalPaid = (localSub.total_paid_paise ?? 0) + paymentAmount;

      await sb.from("subscriptions").update({
        status: "active",
        invoice_count: newInvoiceCount,
        total_paid_paise: newTotalPaid,
        next_billing_at: rzSub.charge_at ? new Date((rzSub.charge_at as number) * 1000).toISOString() : null,
        current_start: rzSub.current_start ? new Date((rzSub.current_start as number) * 1000).toISOString() : null,
        current_end: rzSub.current_end ? new Date((rzSub.current_end as number) * 1000).toISOString() : null,
      }).eq("razorpay_subscription_id", rzSubId);

      // Send invoice email — non-fatal
      try {
        const { data: authUser } = await sb.auth.admin.getUserById(localSub.user_id);
        const userEmail = authUser?.user?.email;
        const userName = authUser?.user?.user_metadata?.full_name || authUser?.user?.email || "Close Eye Member";

        if (userEmail) {
          // Get CC family members (notify_visits = true)
          const { data: ccMembers } = await sb
            .from("family_members")
            .select("email")
            .eq("family_user_id", localSub.user_id)
            .eq("notify_visits", true);

          const ccEmails = (ccMembers ?? []).map((m: { email: string }) => m.email).filter(Boolean);

          const planName = PLAN_DISPLAY[localSub.plan_id] ?? localSub.plan_id;
          const amountInr = (paymentAmount / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 });
          const dateStr = formatDate(rzPayment?.created_at as number | undefined ?? Math.floor(Date.now() / 1000));
          const nextBillingStr = formatDate(rzSub.charge_at as number | undefined);

          const resendFromEmail = Deno.env.get("RESEND_FROM_EMAIL") ?? "invoices@closeeye.in";
          const resendApiKey = Deno.env.get("RESEND_API_KEY")!;

          const emailBody: Record<string, unknown> = {
            from: resendFromEmail,
            to: [userEmail],
            subject: `Close Eye — Payment Receipt #${String(newInvoiceCount).padStart(4, "0")}`,
            html: buildInvoiceHtml({
              invoiceNumber: newInvoiceCount,
              planName,
              amountInr,
              date: dateStr,
              nextBillingDate: nextBillingStr,
              userName,
            }),
          };
          if (ccEmails.length > 0) {
            emailBody.cc = ccEmails;
          }

          const emailRes = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${resendApiKey}`,
            },
            body: JSON.stringify(emailBody),
          });

          if (!emailRes.ok) {
            const errText = await emailRes.text();
            console.error("Resend email error:", errText);
          }
        }
      } catch (emailErr) {
        console.error("Invoice email failed (non-fatal):", emailErr);
      }
      break;
    }

    case "subscription.paused": {
      await sb.from("subscriptions").update({ status: "paused" }).eq("razorpay_subscription_id", rzSubId);
      break;
    }

    case "subscription.resumed": {
      await sb.from("subscriptions").update({ status: "active" }).eq("razorpay_subscription_id", rzSubId);
      break;
    }

    case "subscription.cancelled": {
      await sb.from("subscriptions").update({ status: "cancelled" }).eq("razorpay_subscription_id", rzSubId);
      break;
    }

    case "subscription.completed": {
      await sb.from("subscriptions").update({ status: "completed" }).eq("razorpay_subscription_id", rzSubId);
      break;
    }

    case "subscription.halted": {
      await sb.from("subscriptions").update({ status: "halted" }).eq("razorpay_subscription_id", rzSubId);
      break;
    }

    default:
      console.log("Unhandled Razorpay event:", event);
  }

  return json({ ok: true });
});
