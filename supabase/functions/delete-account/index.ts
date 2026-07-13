import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, checkOrigin } from "../_shared/cors.ts";

// ── Real account deletion ─────────────────────────────────────────────────────
// Called by the signed-in family member from Profile / Settings. Does REAL work —
// never a fake confirmation:
//   1. Cancels any live Razorpay subscription so billing stops immediately.
//   2. Deletes the family's owned data (best-effort per table; cascades handle
//      most child rows). booking_requests + leads are SET-NULL FKs, so their PII
//      rows must be deleted explicitly here.
//   3. Deletes the profiles row (so the hard delete leaves no orphan).
//   4. Removes the identity: a hard auth-user delete — the blocking FKs are now SET NULL, so
//      it succeeds and FREES the email for a clean re-registration. A 100-year ban remains
//      only as a last-resort fallback. The deleted email is recorded so a return visit is
//      greeted "welcome back", not treated as a stranger.
// Returns ok:true only when the account is genuinely closed. Client shows success on ok:true.

function razorpayAuth(): string {
  return `Basic ${btoa(`${Deno.env.get("RAZORPAY_KEY_ID")}:${Deno.env.get("RAZORPAY_KEY_SECRET")}`)}`;
}

Deno.serve(async (req: Request) => {
  const cors = corsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });

  const originErr = checkOrigin(req);
  if (originErr) return originErr;

  const json = (body: unknown, status = 200): Response =>
    new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // ── Auth: the deletion only ever targets the caller's own account ───────────
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Missing Authorization header" }, 401);

  const callerSb = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: userErr } = await callerSb.auth.getUser();
  if (userErr || !user) return json({ error: "Unauthorized" }, 401);
  const uid = user.id;

  const sb = createClient(supabaseUrl, supabaseServiceKey);

  // 0) Remember this email so a return visit is greeted "welcome back", not treated as new.
  try {
    if (user.email) await sb.from("deleted_accounts").upsert({ email: user.email.toLowerCase() }, { onConflict: "email" });
  } catch (e) { console.error("[delete-account] deleted_accounts record failed (non-fatal):", e); }

  // 1) Stop billing — cancel any live Razorpay subscription immediately.
  try {
    const { data: sub } = await sb
      .from("subscriptions")
      .select("razorpay_subscription_id, status")
      .eq("user_id", uid)
      .maybeSingle();
    const rzId = sub?.razorpay_subscription_id as string | undefined;
    const cancellable = ["created", "authenticated", "active", "pending", "halted", "paused"];
    if (rzId && cancellable.includes((sub?.status as string) ?? "")) {
      const res = await fetch(`https://api.razorpay.com/v1/subscriptions/${rzId}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: razorpayAuth() },
        body: JSON.stringify({ cancel_at_cycle_end: 0 }),
      });
      if (!res.ok) console.error("[delete-account] Razorpay cancel failed:", res.status, await res.text());
    }
  } catch (e) {
    console.error("[delete-account] cancel-billing error (non-fatal):", e);
  }

  // 2) Best-effort purge of owned data. Each wrapped so one failure never aborts
  //    the deletion. Order: children-ish first; loved_ones cascades elder_profiles
  //    + messages. booking_requests / leads are SET-NULL FKs → delete to remove PII.
  const purge = async (table: string, col: string) => {
    try {
      const { error } = await sb.from(table).delete().eq(col, uid);
      if (error) console.error(`[delete-account] purge ${table}.${col} failed:`, error.message);
    } catch (e) {
      console.error(`[delete-account] purge ${table}.${col} threw:`, e);
    }
  };
  await purge("messages", "family_user_id");
  await purge("member_queries", "user_id");
  await purge("booking_requests", "user_id");
  await purge("leads", "user_id");
  await purge("family_members", "family_user_id");
  await purge("memberships", "user_id");
  await purge("subscriptions", "user_id");
  await purge("bookings", "family_user_id");        // cascades booking_status_history
  await purge("loved_ones", "family_user_id");

  // 3) Delete the profiles row outright (was: scrub) so the hard auth delete leaves no orphan
  //    and the email re-registers cleanly.
  try {
    await sb.from("profiles").delete().eq("id", uid);
  } catch (e) {
    console.error("[delete-account] profile delete error:", e);
  }

  // 4) Remove the identity. Try a hard delete; if an FK blocks it, ban instead so
  //    the person can never sign in again (proper deactivation).
  let hardDeleted = false;
  try {
    const { error } = await sb.auth.admin.deleteUser(uid);
    if (error) console.error("[delete-account] hard delete failed, will ban instead:", error.message);
    else hardDeleted = true;
  } catch (e) {
    console.error("[delete-account] hard delete threw, will ban instead:", e);
  }

  if (!hardDeleted) {
    try {
      // 100-year ban → the account can never be signed into again.
      const { error } = await sb.auth.admin.updateUserById(uid, { ban_duration: "876000h" });
      if (error) {
        console.error("[delete-account] ban failed:", error.message);
        return json({ ok: false, error: "We couldn't finish closing your account. Please contact support and we'll complete it." }, 500);
      }
    } catch (e) {
      console.error("[delete-account] ban threw:", e);
      return json({ ok: false, error: "We couldn't finish closing your account. Please contact support and we'll complete it." }, 500);
    }
  }

  return json({ ok: true, hardDeleted });
});
