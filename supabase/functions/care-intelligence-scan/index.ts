// Ask Close Eye · care-intelligence-scan (Flow D)
//
// Runs daily via pg_cron. Looks back over a window for clusters of sensitive-topic
// questions for the same parent. When a cluster crosses the threshold and no open
// flag exists, it raises a care_flag and SMS-alerts the coordinator — so a human
// can reach out proactively BEFORE the family has to ask again.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SENSITIVE_TOPICS } from "../ask-health/types.ts";
import { notifyCareTeam } from "../ask-health/notify.ts";
import type { CareContext } from "../ask-health/types.ts";
import { requireCronSecret } from "../_shared/cron-auth.ts";

const WINDOW_DAYS       = Number(Deno.env.get("CLOSEEYE_SCAN_WINDOW_DAYS")  ?? "7");
const CLUSTER_THRESHOLD = Number(Deno.env.get("CLOSEEYE_CLUSTER_THRESHOLD") ?? "3");

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

Deno.serve(async (req: Request): Promise<Response> => {
  const denied = requireCronSecret(req); if (denied) return denied;
  const since = new Date(Date.now() - WINDOW_DAYS * 86_400_000).toISOString();

  const { data: rows, error } = await supabase
    .from("questions_log")
    .select("loved_one_id, user_id, topic, created_at")
    .gte("created_at", since)
    .in("topic", SENSITIVE_TOPICS);

  if (error) {
    console.error("scan query failed:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  // Count per (parent, topic). Society users (null loved_one_id) are keyed by user_id.
  const counts = new Map<string, { lovedOneId: string | null; userId: string; topic: string; n: number }>();
  for (const r of rows ?? []) {
    const key = `${r.loved_one_id ?? r.user_id}::${r.topic}`;
    const cur = counts.get(key) ?? { lovedOneId: r.loved_one_id, userId: r.user_id, topic: r.topic, n: 0 };
    cur.n += 1;
    counts.set(key, cur);
  }

  let flagsRaised = 0;
  for (const c of counts.values()) {
    if (c.n < CLUSTER_THRESHOLD) continue;

    // Skip if an open flag already exists for this parent + topic
    let existingQ = supabase
      .from("care_flags")
      .select("id")
      .eq("topic", c.topic)
      .eq("status", "open")
      .eq("user_id", c.userId);
    existingQ = c.lovedOneId
      ? existingQ.eq("loved_one_id", c.lovedOneId)
      : existingQ.is("loved_one_id", null);
    const { data: existing } = await existingQ.maybeSingle();
    if (existing) continue;

    // Raise the flag
    const { error: insErr } = await supabase.from("care_flags").insert({
      loved_one_id: c.lovedOneId,
      user_id:      c.userId,
      topic:        c.topic,
      window_days:  WINDOW_DAYS,
      count:        c.n,
      status:       "open",
    });
    if (insErr) { console.error("care_flag insert failed:", insErr); continue; }
    flagsRaised++;

    // Alert coordinator with parent context
    let parentName = "a parent";
    let city: string | undefined;
    if (c.lovedOneId) {
      const { data: lo } = await supabase
        .from("loved_ones")
        .select("full_name, city")
        .eq("id", c.lovedOneId)
        .single();
      parentName = lo?.full_name ?? "a parent";
      city       = lo?.city     ?? undefined;
    }

    const ctx: CareContext = {
      parentId:     c.lovedOneId ?? c.userId,
      parentName,
      city,
      conditions:   [],
      medications:  [],
      recentVitals: [],
      tier:         "care",
    };

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
