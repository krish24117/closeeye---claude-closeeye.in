// ask-health-public — Tier 0: unauthenticated, general guidance only.
//
// This is a SEPARATE function from ask-health. It shares zero code with the
// triage engine so the triage engine is never modified.
//
// Flow:
//   1. No JWT required — anyone can call this.
//   2. Red-flag scan (THE canonical floor: ../_shared/crisis.ts — shared with Connect,
//      reached here via classifyCrisis. There is no second copy to keep in sync.)
//   3. If red flag → ambulance number + escalation message (always, never gated).
//   4. Otherwise → Claude haiku for general guidance (no parent context injected).
//   5. Returns nudge to register for personalised answers.
//
// Cap: frontend-enforced (localStorage). No server-side user tracking because
//      there is no user — this is the free public hook.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, checkOrigin } from "../_shared/cors.ts";
// Layer-1 rate limiting + Layer-2 AI cost budget (fail-OPEN). Wired here in LOG-ONLY
// mode until RATE_LIMIT_ENFORCE=true, so limits are tuned on real traffic before they block.
import { clientId, hashId, rateLimit, recordAbuseEvent, tooMany, withinAiBudget } from "../_shared/ratelimit.ts";
// Single source of truth — the SAME Safety Engine the authed path uses, so the two can never
// drift again (that drift is what let "not breathing" slip past this public endpoint). The
// engine returns category/severity/action; the router maps action -> India resources.
import { classifyCrisis } from "../ask-health/safety-engine.ts";
import { routeResources } from "../ask-health/resource-router.ts";
import { INDIA_RESOURCE_PACK } from "../ask-health/resources.india.ts";

const AMBULANCE_NUMBER = Deno.env.get("CLOSEEYE_AMBULANCE_NUMBER") ?? "108";

// ── Red-flag patterns — SUPERSEDED, kept for reviewer reference only ──────────
// The LIVE safety floor is the canonical `../_shared/crisis.ts` (reached via classifyCrisis,
// top). This array is unused; do not edit it — edit the shared module.
const _RED_FLAGS_REFERENCE: { category: string; patterns: RegExp[] }[] = [
  {
    category: "cardiac",
    patterns: [
      /chest (pain|tight|tightness|pressure|heavy|heaviness|discomfort)/,
      /(tight|tightness|pressure|heaviness|pain) (in|on) (his|her|their|the) chest/,
      /chest\b.{0,25}\b(tight|pressure|heav|crush|squeez)/,
      /\b(tight|pressure|crush|squeez)\w*\b.{0,25}\bchest/,
      /(clutch\w*|holding|grabbing|gripping) (his|her|their|the) chest/,
      /pain (in|down) (his|her|their|the) (left )?arm/,
      /heart (attack|racing|pounding)/,
    ],
  },
  {
    category: "breathing",
    patterns: [
      /(can('| ?)t|cannot|trouble|difficulty|struggling to) breath/,
      /short(ness)? of breath/,
      /gasping|choking|suffocat/,
      /(lips|face|skin|fingers|nails|hands)\b.{0,15}\b(blue|grey|gray|purple)/,
      /\b(blue|grey|gray|purple)\b.{0,10}\b(lips|face|skin|fingers|nails)/,
      /breathing (very |really )?(fast|rapid|heavy|hard)/,
    ],
  },
  {
    category: "stroke",
    patterns: [
      /face (is |looks |looking )?(drooping|droopy|crooked|twisted)/,
      /slurred speech|can('| ?)t speak|words? (are )?jumbled|speech (is )?slurred/,
      /one side (of (his|her|the) )?(body|face) (is )?(weak|numb|paralys|drooping)/,
      /sudden(ly)? (numb|weak)(ness)? (on|in) one side/,
      /(arm|leg) (went |is )?numb (and|on) one side/,
    ],
  },
  {
    category: "consciousness",
    patterns: [
      /(passed out|fainted|unconscious|won('| ?)t wake|can('| ?)t wake|unresponsive|not responding|collapsed)/,
      /(suddenly )?(very )?confused|doesn('| ?)t know (where|who)/,
      /seizure|convuls|fitting/,
    ],
  },
  {
    category: "fall_injury",
    patterns: [
      /(fell|fallen|had a fall).*(can('| ?)t get up|hurt|bleeding|head|hip|broke|broken|unconscious|not moving)/,
      /(can('| ?)t get up|unable to get up).*(fell|fall)/,
      /hit (his|her|their) head/,
    ],
  },
  {
    category: "bleeding",
    patterns: [
      /(heavy|severe|won('| ?)t stop|a lot of|lots of|uncontrolled) bleed/,
      /vomit(ing|ed)? blood|throwing up blood|coughing (up )?blood/,
      /blood in (his|her|the|its|it)\b/,
    ],
  },
  {
    category: "overdose",
    patterns: [
      /overdose/,
      /took too many (pill|tablet)/,
      /(whole|entire|full) (strip|sheet|packet|bottle|box) of (the )?(pill|tablet|medicine|sleeping|tabl)/,
    ],
  },
  {
    category: "allergic",
    patterns: [
      /(throat|tongue|face|lips) (is |are )?swell/,
      /anaphyla|severe allergic|can('| ?)t swallow/,
    ],
  },
  {
    category: "self_harm",
    patterns: [
      /(wants?|wanting|trying) to (die|kill (him|her|them)self|end (his|her|their) life)/,
      /suicid|self[- ]harm|hurt (him|her|them)self/,
      /doesn('| ?)t want to live/,
    ],
  },
  {
    category: "severe_pain",
    patterns: [
      /(worst|unbearable|extreme|severe) (pain|headache)/,
      /sudden (severe|terrible) (pain|headache)/,
    ],
  },
  // Multilingual (romanized Hindi / Hinglish + Telugu)
  { category: "ml_consciousness", patterns: [/\bbehosh\b|\bbesudh\b/, /spruha thapp/, /gir ke behosh/] },
  {
    category: "ml_breathing",
    patterns: [
      /saans (nahi|nai|band|ruk|tez|takleef)/,
      /saans lene me(i)?n? (takleef|dikkat|problem)/,
      /dam ghut/,
      /oopiri (andatledu|raavatledu|aadatledu|raatledu)/,
    ],
  },
  {
    category: "ml_cardiac",
    patterns: [
      /(seene|seena|chhati|chhaati|chaati|chati) me(i)?n? .{0,12}dard/,
      /gunde no(p|op)pi/,
      /dil ka daura/,
      /heart .{0,6}daura/,
    ],
  },
  {
    category: "ml_fall",
    patterns: [
      /gir ga(ya|yi|ye|e).{0,30}(uth nahi|utha nahi|uth nai|chot|sar|khoon|bleeding)/,
      /padipoy.{0,40}(lechi|lecha|nilab|leva|levalek)/,
    ],
  },
  { category: "ml_bleeding",  patterns: [/khoon .{0,15}(beh|ruk nahi|ruk nai|zyada|bahut)/, /(bahut|zyada) khoon/] },
  { category: "ml_seizure",   patterns: [/daura (pada|aaya|aa raha|padaa)/, /\bmirgi\b/, /fit aa ?(gayi|gaya|raha)/] },
  { category: "ml_self_harm", patterns: [/(marna|mar jana) chahta/, /jeena nahi chahta|jeena nai chahta/] },
];

// The crisis floor arrives via classifyCrisis (top of file) -> ../_shared/crisis.ts.

// ── Service intent detection ─────────────────────────────────────────────────
const SERVICE_TRIGGERS: RegExp[] = [
  /how (do|will|does|would) (you|close ?eye) (send|assign|find|choose|select|bring|provide|hire|match)/,
  /how (does|do|will) (the|a|your)? ?(companion|carer|care ?giver|helper|staff|person|someone)/,
  /(vet|background.?check|screen|verify|train|safe|trusted?|who comes?|who (are|is) (your|the))/,
  /how much|what (is|are) (the )?charges?|pricing|price|plan cost|fees?|kitna/,
  /what (is|are|does) (the plan|it) ?(include|cover|offer|contain|come with)/,
  /what (do|would) (i|we|you) (get|receive|have)/,
  /which (areas?|cities|locations?|places?|zones?)|where do you (operate|work|serve|cover)/,
  /do you (come|operate|work|serve|cover) in\b/,
  /how (do i|do we|can i|to) (start|sign up|register|get started|join|book|subscribe|begin)/,
  /what (is|does|are) (close ?eye|closeeye)|what do (you|close ?eye) do/,
  /how (do|does|do) (visit|the visit|visits?) (work|happen|go)/,
  /what happens (during|in|at) (the|a) visit/,
  /(can i|can we) (talk|speak|chat|call) (to|with) (you|someone|the team|a person)/,
  /do you (do|offer|provide|cover|have) (hospital|escort|errand|pickup|transport)/,
  /how (quickly|fast|soon) (can|do|will) you/,
  /what (areas?|location|city|cities|zone)/,
];

function isServiceQuestion(text: string): boolean {
  const q = text.toLowerCase();
  return SERVICE_TRIGGERS.some((p) => p.test(q));
}

// Inline KB context — mirrors service-kb.ts answers. Keep in sync.
const SERVICE_KB_CONTEXT = `
WHAT WE DO: Close Eye is your trusted presence in India when you can't be there. A trained companion visits your parent regularly for wellness check-ins and company. You get a WhatsApp update — often with a photo — after every visit. A dedicated care coordinator helps with doctor appointments, medicines and daily needs, and steps in quickly in an emergency. Ask Close Eye is here any time you have a health question.

HOW COMPANIONS ARE SENT / FOUND: Every Close Eye companion is identity- and background-verified, interviewed in person, and trained under our Chief of Care with guidance from our medical advisors. We match a companion to your parent's needs and personality, supervise every visit, and act on your feedback. You are never handing your parent to a stranger.

PRICING: You can start as a Founding Member for ₹100. Our NRI elder-care plan is ₹1,500/month and includes regular companion visits, check-ins, WhatsApp updates and coordinator support, with on-demand services available as add-ons.

WHAT'S INCLUDED: Regular in-person companion visits, wellness check-ins, a WhatsApp update after each visit, a dedicated care coordinator, help coordinating doctor visits, medication reminders, and access to Ask Close Eye.

WHERE WE WORK: We currently serve families in Hyderabad. Message us on WhatsApp at +91 90002 21261 if your parent is in a different area and we'll let you know our plans.

HOW TO START: Sign up at closeeye.in or message us on WhatsApp (+91 90002 21261), share a few details about your parent, and our team sets up their care within a couple of days.

HOW VISITS WORK: A companion visits in person, spends time with your parent — health check, conversation, helping with daily needs — and sends you a WhatsApp report with a summary and often a photo within the hour.

EMERGENCIES: If something urgent happens, your care coordinator is alerted immediately and helps arrange care, including getting your parent to a nearby hospital, while keeping you informed across time zones.
`.trim();

async function generateServiceAnswer(question: string): Promise<string> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 200,
      system: `You are Ask Close Eye, the warm voice of an NRI elder-care service. Answer the question using ONLY the facts in the knowledge base below. Be brief (2-3 sentences), warm, and direct. If the knowledge base doesn't cover it, say warmly you'll connect them to the team via WhatsApp at +91 90002 21261. Never give medical advice. Never invent prices, policies, or facts.\n\nKNOWLEDGE BASE:\n${SERVICE_KB_CONTEXT}`,
      messages: [{ role: "user", content: question }],
    }),
  });
  if (!res.ok) throw new Error(`Claude API ${res.status}`);
  const data = await res.json() as { content?: { text?: string }[] };
  return data.content?.[0]?.text?.trim() ?? "";
}

async function generateGeneralAnswer(question: string): Promise<string> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 280,
      system: `You are Close Eye — a warm, knowledgeable companion that helps families in India stay close to and care for the people they love: elderly parents, a spouse, a child or new baby, or themselves. Health is one of the things you help with, not the only one. Give caring, practical general guidance for ANY family member.

Rules:
- 2-4 sentences. Lead with the most useful thing.
- Warm but direct.
- General guidance only (you don't know this family's specific member).
- For a child, infant, or pregnancy, include the warning signs that mean "see a doctor now" — a parent may not know them.
- Be honest: say when a doctor is needed, not just "consult a doctor" every time.
- Never diagnose. Never turn a worried family member away because of who they ask about.
- Don't mention you are an AI.`,
      messages: [{ role: "user", content: question }],
    }),
  });

  if (!res.ok) throw new Error(`Claude API ${res.status}`);
  const data = await res.json() as { content?: { text?: string }[] };
  return data.content?.[0]?.text?.trim() ?? "";
}

// ── Handler ──────────────────────────────────────────────────────────────────
Deno.serve(async (req: Request): Promise<Response> => {
  const cors = corsHeaders(req);

  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });

  const originErr = checkOrigin(req);
  if (originErr) return originErr;

  const json = (body: unknown, status = 200): Response =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...cors, "Content-Type": "application/json" },
    });

  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let body: { question?: string };
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }

  const question = (body.question ?? "").trim();
  if (!question) return json({ error: "question is required" }, 400);
  if (question.length > 800) return json({ error: "Question too long (max 800 chars)" }, 400);

  // Safety floor — never gated, never paywalled. Same Safety Engine as the authed path,
  // routed by lane: medical -> 108; mental-health/safeguarding -> the helpline lane.
  const crisis = classifyCrisis(question);
  if (crisis) {
    const routed  = routeResources(crisis.action, crisis.category, INDIA_RESOURCE_PACK);
    const line    = routed.primary && routed.primary.number ? routed.primary : null;
    const lineTxt = line ? `**${line.label} — ${line.number}**` : "";
    let message: string;
    if (crisis.category === "medical_emergency") {
      message = `This sounds like it needs urgent help right now. Please call **${AMBULANCE_NUMBER}** (ambulance) immediately, or go to the nearest emergency room. Don't wait to see if it passes.`;
    } else if (crisis.category === "mental_health_crisis") {
      // TODO(clinical): review crisis wording with the medical team before launch.
      message = `I'm really glad you reached out — you don't have to carry this alone.${lineTxt ? ` Please reach ${lineTxt} — they listen, any time, day or night.` : ""}\n\nIf you might act on these thoughts right now, please call ${AMBULANCE_NUMBER}.`;
    } else {
      // TODO(safeguarding): review wording + reporting duties with the safeguarding lead.
      message = `Thank you for telling me — you are not alone, and there is help.${lineTxt ? ` ${lineTxt} can support you, without judgement.` : ""}\n\nIf anyone is in danger right now, please call ${AMBULANCE_NUMBER}.`;
    }
    return json({
      lane: "escalate",
      message,
      ambulanceNumber: crisis.category === "medical_emergency" ? AMBULANCE_NUMBER : undefined,
      helpline: line ? { label: line.label, number: line.number } : undefined,
      disclaimer: "This is not a diagnosis. In any emergency, call professional help immediately.",
      requiresHuman: true,
    });
  }

  // ── Abuse prevention (Layers 1 & 2) — applies ONLY to the paid AI paths below; the
  //    deterministic safety floor above is never gated. LOG-ONLY until
  //    RATE_LIMIT_ENFORCE=true. Everything here FAILS OPEN (Constitution §2). ──
  {
    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (url && key) {
      const enforce = (Deno.env.get("RATE_LIMIT_ENFORCE") ?? "").toLowerCase() === "true";
      const sb = createClient(url, key);
      const ip = clientId(req);
      const burst = await rateLimit(sb, `askpublic:burst:${ip}`, { limit: 6, windowSeconds: 600 });   // anti-flood
      const daily = await rateLimit(sb, `askpublic:day:${ip}`, { limit: 25, windowSeconds: 86400 });   // server-side free cap
      const budget = Number(Deno.env.get("AI_DAILY_BUDGET") ?? "500");
      const budgetOk = await withinAiBudget(sb, budget);                                                // Layer-2 cost ceiling (increments the day counter)
      const limited = !burst.allowed || !daily.allowed;
      // Log-only measurement (no PII — decision + counts only). Flip to enforce in M5.
      console.log(JSON.stringify({
        evt: "abuse_guard", endpoint: "ask-health-public", enforce,
        wouldBlock: limited || !budgetOk, limited, budgetOk,
        burstOk: burst.allowed, dailyOk: daily.allowed, remainingDay: daily.remaining,
      }));
      if (limited || !budgetOk) {
        await recordAbuseEvent(sb, {
          endpoint: "ask-health-public",
          reason: limited ? "rate_limited" : "ai_budget",
          enforced: enforce,
          tier: "anon",
          actor: await hashId(ip),
        });
      }
      if (enforce && limited) {
        const retry = Math.max(burst.retryAfter, daily.retryAfter);
        return tooMany(cors, retry, !daily.allowed
          ? "You've reached today's free questions — sign in for more, or reach a real person on WhatsApp at +91 90002 21261."
          : "You're going a little fast — give it a moment and try again.");
      }
      if (enforce && !budgetOk) {
        // Cost ceiling hit → DEGRADE, never break: skip Claude, hand to a person.
        return json({
          lane: "inform",
          message: "I'd rather not guess right now — our team can give you a proper answer. Message us on WhatsApp at +91 90002 21261 and we'll help right away.",
          disclaimer: "General guidance from Close Eye. Not a substitute for professional or medical advice.",
          requiresHuman: true,
        });
      }
    }
  }

  // Service intent — runs after red-flag so real emergencies still escalate
  if (isServiceQuestion(question)) {
    let svcMessage: string;
    try {
      svcMessage = await generateServiceAnswer(question);
      if (!svcMessage) throw new Error("empty");
    } catch {
      svcMessage = "I'm not sure — please message us on WhatsApp at +91 90002 21261 and our team will answer right away.";
    }
    return json({ lane: "service", message: svcMessage, requiresHuman: false });
  }

  // General health guidance (no parent context — Tier 0)
  let message: string;
  try {
    message = await generateGeneralAnswer(question);
    if (!message) throw new Error("empty response");
  } catch {
    message = "That's a caring question. Our team would be happy to give you a personalised answer — register your family for free to ask directly and get guidance specific to their history.";
  }

  return json({
    lane: "inform",
    message,
    disclaimer: "General guidance from Close Eye. Not a substitute for professional or medical advice.",
    requiresHuman: false,
    nudge: "Want answers specific to your family member — their conditions, medicines, and history? Register to unlock personalised Ask Close Eye.",
  });
});
