// ask-health-public — Tier 0: unauthenticated, general guidance only.
//
// This is a SEPARATE function from ask-health. It shares zero code with the
// triage engine so the triage engine is never modified.
//
// Flow:
//   1. No JWT required — anyone can call this.
//   2. Red-flag scan (patterns identical to ask-health/redflags.ts; keep in sync).
//   3. If red flag → ambulance number + escalation message (always, never gated).
//   4. Otherwise → Claude haiku for general guidance (no parent context injected).
//   5. Returns nudge to register for personalised answers.
//
// Cap: frontend-enforced (localStorage). No server-side user tracking because
//      there is no user — this is the free public hook.

const AMBULANCE_NUMBER = Deno.env.get("CLOSEEYE_AMBULANCE_NUMBER") ?? "108";
const ALLOWED_ORIGIN = Deno.env.get("CLOSEEYE_ALLOWED_ORIGIN") ?? "*";

const CORS = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

// ── Red-flag patterns ────────────────────────────────────────────────────────
// IDENTICAL to supabase/functions/ask-health/redflags.ts
// Medical team owns both; any change here must be mirrored there and vice-versa.
const RED_FLAGS: { category: string; patterns: RegExp[] }[] = [
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

function detectRedFlag(rawMessage: string): { matched: boolean; category?: string } {
  const msg = rawMessage.toLowerCase().replace(/\s+/g, " ").trim();
  for (const flag of RED_FLAGS) {
    for (const pattern of flag.patterns) {
      if (pattern.test(msg)) return { matched: true, category: flag.category };
    }
  }
  return { matched: false };
}

// ── Service intent detection ─────────────────────────────────────────────────
// Patterns that signal the user is asking about Close Eye itself — not a health question.
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

// ── Claude call (general guidance; NO parent context) ────────────────────────
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
      system: `You are Ask Close Eye, a warm and knowledgeable health advisor for families with elderly parents in India. Give caring, practical guidance.

Rules:
- 2-4 sentences. Lead with the most useful thing.
- Warm but direct — NRI families need clarity.
- General guidance only (you don't know this family's specific parent).
- Be honest: say when a doctor is needed, not just "consult a doctor" every time.
- Never diagnose. End with one gentle prompt toward professional care if relevant.
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
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST")    return json({ error: "Method not allowed" }, 405);

  let body: { question?: string };
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }

  const question = (body.question ?? "").trim();
  if (!question) return json({ error: "question is required" }, 400);
  if (question.length > 800) return json({ error: "Question too long (max 800 chars)" }, 400);

  // Safety floor — never gated, never paywalled
  const flag = detectRedFlag(question);
  if (flag.matched) {
    return json({
      lane: "escalate",
      message: `This sounds like it needs urgent help right now. Please call **${AMBULANCE_NUMBER}** (ambulance) immediately. Don't wait to see if it passes — go to the nearest hospital emergency department now.`,
      ambulanceNumber: AMBULANCE_NUMBER,
      disclaimer: "This is not a diagnosis. In any emergency, call professional help immediately.",
      requiresHuman: true,
    });
  }

  // ── Service intent — runs after red-flag so real emergencies still escalate ─
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
    // Soft fallback — still helpful, not a hard wall
    message = "That's a caring question. Our medical team would be happy to give you a personalised answer — register your parent for free to ask directly and get guidance specific to their health history.";
  }

  return json({
    lane: "inform",
    message,
    disclaimer: "General guidance from Ask Close Eye, guided by our medical team. Not a substitute for professional medical advice.",
    requiresHuman: false,
    nudge: "Want answers specific to your parent — their conditions, medicines, and history? Register to unlock personalised Ask Close Eye.",
  });
});
