// ─────────────────────────────────────────────────────────────────────────
// Ask Close Eye · ask-health edge function
//
// Flow (every point from the triage spec):
//   1. Validate input + load the parent's care context (the moat).
//   2. RED-FLAG scan (deterministic) → Lane 3 escalate immediately.
//   3. Classify (cheap model) → lane + topic + inScope. Fails safe to "connect".
//   4. Branch:
//        out of scope        → polite redirect (not logged against the cap)
//        escalate (Lane 3)   → vetted emergency template + alert team + hospital
//        connect  (Lane 2)   → vetted "offer a doctor" template + consult hook
//        inform   (Lane 1)   → cap check; if over → cap template (still offers
//                              a doctor); else generate the warm answer.
//   5. Log every question with its topic (powers the care-intelligence scan).
//
// The cap applies to Lane 1 ONLY. Lanes 2 and 3 are NEVER blocked by it.
// ─────────────────────────────────────────────────────────────────────────

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import type { CareContext, TriageResponse, VitalReading } from "./types.ts";
import { detectRedFlag } from "./redflags.ts";
import { classify, generateInform } from "./claude.ts";
import {
  capReachedTemplate,
  connectTemplate,
  DISCLAIMER,
  escalateTemplate,
  outOfScopeMessage,
} from "./prompts.ts";
import { findNearestHospital, notifyCareTeam } from "./notify.ts";

const FREE_QUESTION_CAP = Number(Deno.env.get("CLOSEEYE_FREE_QUESTION_CAP") ?? "5");
const AMBULANCE_NUMBER = Deno.env.get("CLOSEEYE_AMBULANCE_NUMBER") ?? "108";

const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("CLOSEEYE_ALLOWED_ORIGIN") ?? "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "content-type": "application/json" },
  });
}

interface RequestBody {
  userId: string;
  parentId: string;
  question: string;
}

/** Load the parent's care context. Adjust table/column names to your schema. */
async function loadContext(userId: string, parentId: string): Promise<CareContext | null> {
  const { data: profile, error } = await supabase
    .from("care_profiles")
    .select("parent_name, age, conditions, medications, city, lat, lng, tier")
    .eq("id", parentId)
    .eq("user_id", userId) // ownership guard
    .single();
  if (error || !profile) return null;

  const { data: vitals } = await supabase
    .from("vitals")
    .select("type, value, unit, taken_at")
    .eq("parent_id", parentId)
    .order("taken_at", { ascending: false })
    .limit(5);

  const recentVitals: VitalReading[] = (vitals ?? []).map((v) => ({
    type: v.type,
    value: v.value,
    unit: v.unit ?? undefined,
    takenAt: v.taken_at,
  }));

  return {
    parentId,
    parentName: profile.parent_name,
    age: profile.age ?? undefined,
    conditions: profile.conditions ?? [],
    medications: profile.medications ?? [],
    recentVitals,
    city: profile.city ?? undefined,
    location: profile.lat && profile.lng ? { lat: profile.lat, lng: profile.lng } : undefined,
    tier: (profile.tier as CareContext["tier"]) ?? "free",
  };
}

/** Count this month's Lane-1 questions for the free-tier cap. */
async function laneOneCountThisMonth(userId: string): Promise<number> {
  const start = new Date();
  start.setUTCDate(1);
  start.setUTCHours(0, 0, 0, 0);
  const { count } = await supabase
    .from("questions_log")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("lane", "inform")
    .gte("created_at", start.toISOString());
  return count ?? 0;
}

async function logQuestion(
  userId: string,
  ctx: CareContext,
  question: string,
  lane: string,
  topic: string,
  requiresHuman: boolean,
): Promise<void> {
  const { error } = await supabase.from("questions_log").insert({
    user_id: userId,
    parent_id: ctx.parentId,
    question,
    lane,
    topic,
    requires_human: requiresHuman,
  });
  if (error) console.error("logQuestion failed:", error);
}

async function createConsultRequest(userId: string, ctx: CareContext, question: string): Promise<void> {
  const { error } = await supabase.from("consult_requests").insert({
    user_id: userId,
    parent_id: ctx.parentId,
    source_question: question,
    status: "requested",
  });
  if (error) console.error("createConsultRequest failed:", error);
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let payload: RequestBody;
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }
  const question = (payload.question ?? "").trim();
  if (!payload.userId || !payload.parentId || !question) {
    return json({ error: "userId, parentId and question are required" }, 400);
  }
  if (question.length > 1000) {
    return json({ error: "Question is too long" }, 400);
  }

  const ctx = await loadContext(payload.userId, payload.parentId);
  if (!ctx) return json({ error: "Care profile not found for this user" }, 404);

  // ── 2. RED-FLAG SCAN (deterministic, before any model) ──────────────────
  const flag = detectRedFlag(question);
  if (flag.matched) {
    const hospital = await findNearestHospital(ctx);
    const alerted = await notifyCareTeam(ctx, `red-flag: ${flag.category}`, question);
    const { message, actions } = escalateTemplate(ctx, AMBULANCE_NUMBER, hospital);
    await logQuestion(payload.userId, ctx, question, "escalate", flag.category, true);
    const response: TriageResponse = {
      lane: "escalate",
      topic: "pain", // category recorded in log; topic kept within enum
      message,
      suggestedActions: actions,
      requiresHuman: true,
      escalation: { ambulanceNumber: AMBULANCE_NUMBER, nearestHospital: hospital, alertedTeam: alerted },
    };
    return json(response);
  }

  // ── 3. CLASSIFY (fails safe to "connect") ───────────────────────────────
  const cls = await classify(question, ctx);

  // Out of scope → gentle redirect (does not count against the cap).
  if (!cls.inScope || cls.topic === "out_of_scope") {
    await logQuestion(payload.userId, ctx, question, "inform", "out_of_scope", false);
    const response: TriageResponse = {
      lane: "inform",
      topic: "out_of_scope",
      message: outOfScopeMessage(),
      suggestedActions: [],
      requiresHuman: false,
    };
    return json(response);
  }

  // ── 4. ESCALATE from the model (rare; red flags catch most) ─────────────
  if (cls.lane === "escalate") {
    const hospital = await findNearestHospital(ctx);
    const alerted = await notifyCareTeam(ctx, `model-escalate: ${cls.topic}`, question);
    const { message, actions } = escalateTemplate(ctx, AMBULANCE_NUMBER, hospital);
    await logQuestion(payload.userId, ctx, question, "escalate", cls.topic, true);
    const response: TriageResponse = {
      lane: "escalate",
      topic: cls.topic,
      message,
      suggestedActions: actions,
      requiresHuman: true,
      escalation: { ambulanceNumber: AMBULANCE_NUMBER, nearestHospital: hospital, alertedTeam: alerted },
    };
    return json(response);
  }

  // ── 4. CONNECT — offer a doctor (never capped) ──────────────────────────
  if (cls.lane === "connect") {
    const { message, actions } = connectTemplate(ctx);
    await createConsultRequest(payload.userId, ctx, question);
    await logQuestion(payload.userId, ctx, question, "connect", cls.topic, true);
    const response: TriageResponse = {
      lane: "connect",
      topic: cls.topic,
      message,
      disclaimer: DISCLAIMER,
      suggestedActions: actions,
      requiresHuman: true,
    };
    return json(response);
  }

  // ── 4. INFORM — cap check, then generate ────────────────────────────────
  const capped = ctx.tier === "free" && (await laneOneCountThisMonth(payload.userId)) >= FREE_QUESTION_CAP;
  if (capped) {
    const { message, actions } = capReachedTemplate(ctx);
    // Not logged as a consumed Lane-1 question.
    const response: TriageResponse = {
      lane: "inform",
      topic: cls.topic,
      message,
      suggestedActions: actions,
      requiresHuman: false,
      capReached: true,
    };
    return json(response);
  }

  let message: string;
  try {
    message = await generateInform(question, ctx);
  } catch (err) {
    // Fail safe: if generation fails, route to a human rather than guess.
    console.error("generateInform failed, falling back to connect:", err);
    const { message: m, actions } = connectTemplate(ctx);
    await createConsultRequest(payload.userId, ctx, question);
    await logQuestion(payload.userId, ctx, question, "connect", cls.topic, true);
    const response: TriageResponse = {
      lane: "connect",
      topic: cls.topic,
      message: m,
      disclaimer: DISCLAIMER,
      suggestedActions: actions,
      requiresHuman: true,
    };
    return json(response);
  }

  await logQuestion(payload.userId, ctx, question, "inform", cls.topic, false);
  const response: TriageResponse = {
    lane: "inform",
    topic: cls.topic,
    message,
    disclaimer: DISCLAIMER,
    suggestedActions: [
      { id: "note_only", label: "Have a coordinator check on them this week", kind: "note_only", payload: { parentId: ctx.parentId } },
    ],
    requiresHuman: false,
  };
  return json(response);
});
