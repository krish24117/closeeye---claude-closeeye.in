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

  // General guidance (no parent context — Tier 0)
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
