// ─────────────────────────────────────────────────────────────────────────
// Ask Close Eye · care-intelligence-scan (Flow D)
//
// Runs on a schedule (e.g. daily via pg_cron / Supabase scheduled function).
// Looks back over a window for clusters of questions in SENSITIVE topics for
// the same parent. When a cluster crosses the threshold and no open flag
// exists, it raises a care_flag and alerts the coordinator — so a human can
// reach out BEFORE the family asks. That proactive move is the retention moat.
// ─────────────────────────────────────────────────────────────────────────

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SENSITIVE_TOPICS } from "../ask-health/types.ts";
import { notifyCareTeam } from "../ask-health/notify.ts";
import type { CareContext } from "../ask-health/types.ts";

const WINDOW_DAYS = Number(Deno.env.get("CLOSEEYE_SCAN_WINDOW_DAYS") ?? "7");
const CLUSTER_THRESHOLD = Number(Deno.env.get("CLOSEEYE_CLUSTER_THRESHOLD") ?? "3");

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

Deno.serve(async (): Promise<Response> => {
  const since = new Date(Date.now() - WINDOW_DAYS * 86_400_000).toISOString();

  // Pull recent questions in sensitive topics.
  const { data: rows, error } = await supabase
    .from("questions_log")
    .select("parent_id, user_id, topic, created_at")
    .gte("created_at", since)
    .in("topic", SENSITIVE_TOPICS);

  if (error) {
    console.error("scan query failed:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  // Count per (parent, topic).
  const counts = new Map<string, { parentId: string; userId: string; topic: string; n: number }>();
  for (const r of rows ?? []) {
    const key = `${r.parent_id}::${r.topic}`;
    const cur = counts.get(key) ?? { parentId: r.parent_id, userId: r.user_id, topic: r.topic, n: 0 };
    cur.n += 1;
    counts.set(key, cur);
  }

  let flagsRaised = 0;
  for (const c of counts.values()) {
    if (c.n < CLUSTER_THRESHOLD) continue;

    // Skip if an open flag already exists for this parent+topic.
    const { data: existing } = await supabase
      .from("care_flags")
      .select("id")
      .eq("parent_id", c.parentId)
      .eq("topic", c.topic)
      .eq("status", "open")
      .maybeSingle();
    if (existing) continue;

    // Raise the flag.
    const { error: insErr } = await supabase.from("care_flags").insert({
      parent_id: c.parentId,
      user_id: c.userId,
      topic: c.topic,
      window_days: WINDOW_DAYS,
      count: c.n,
      status: "open",
    });
    if (insErr) {
      console.error("care_flag insert failed:", insErr);
      continue;
    }
    flagsRaised++;

    // Alert the coordinator with parent context.
    const { data: profile } = await supabase
      .from("care_profiles")
      .select("parent_name, city")
      .eq("id", c.parentId)
      .single();

    const ctx = {
      parentId: c.parentId,
      parentName: profile?.parent_name ?? "a parent",
      city: profile?.city ?? undefined,
      conditions: [],
      medications: [],
      recentVitals: [],
      tier: "care",
    } as unknown as CareContext;

    await notifyCareTeam(
      ctx,
      `pattern detected: ${c.n} questions about "${c.topic}" in ${WINDOW_DAYS} days`,
      `Consider a proactive check-in and, if appropriate, a screening with the medical team.`,
    );
  }

  return new Response(JSON.stringify({ scanned: rows?.length ?? 0, flagsRaised }), {
    headers: { "content-type": "application/json" },
  });
});
