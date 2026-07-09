// ─────────────────────────────────────────────────────────────────────────
// Ask Close Eye · Red-flag detection (Lane 3 safety floor)
//
// This runs BEFORE any model call. If a message trips a red flag we escalate
// immediately and deterministically — we never wait on the model to decide an
// emergency. Bias is intentionally toward RECALL (the "round up" rule): a false
// positive only offers help that wasn't strictly needed; a false negative could
// miss a real emergency.
//
// OWNED BY THE MEDICAL TEAM. Dr. Sidharth should review and extend this list.
// ─────────────────────────────────────────────────────────────────────────

export interface RedFlagHit {
  matched: true;
  category: string;
  phrase: string;
}
export interface NoRedFlag {
  matched: false;
}
export type RedFlagResult = RedFlagHit | NoRedFlag;

/**
 * Each entry is a category + a set of regex patterns. Patterns are matched
 * case-insensitively against the normalised message. Keep phrases broad and
 * colloquial — families type the way they speak, often in a panic.
 */
const RED_FLAGS: { category: string; patterns: RegExp[] }[] = [
  {
    category: "cardiac",
    patterns: [
      /chest (pain|tight|tightness|pressure|heavy|heaviness|discomfort)/,
      /(tight|tightness|pressure|heaviness|pain) (in|on) (his|her|their|the) chest/,
      /chest\b.{0,25}\b(tight|pressure|heav|crush|squeez)/, // "chest ... it's tight"
      /\b(tight|pressure|crush|squeez)\w*\b.{0,25}\bchest/, // "tightness ... chest"
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
      /(lips|face|skin|fingers|nails|hands)\b.{0,15}\b(blue|grey|gray|purple)/, // cyanosis, any order
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
      /blood in (his|her|the|its|it)\b/, // "blood in it / his vomit / the stool"
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

  // ── MULTILINGUAL (romanized Hindi / Hinglish + Telugu) ──────────────────
  // The English patterns above miss code-switched emergencies, so these add a
  // floor for the way families actually type in a panic. NOT exhaustive —
  // Aishwarya / a Telugu-speaking coordinator should review and expand. Each
  // fall/bleeding pattern requires an injury or "can't get up" cue so that
  // benign phrases ("papa ka phone gir gaya" = the phone fell) don't fire.
  {
    category: "ml_consciousness",
    patterns: [/\bbehosh\b|\bbesudh\b/, /spruha thapp/, /gir ke behosh/],
  },
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
      /padipoy.{0,40}(lechi|lecha|nilab|leva|lekapo|noppi|levalek)/,
    ],
  },
  {
    category: "ml_bleeding",
    patterns: [/khoon .{0,15}(beh|ruk nahi|ruk nai|zyada|bahut)/, /(bahut|zyada) khoon/],
  },
  {
    category: "ml_seizure",
    patterns: [/daura (pada|aaya|aa raha|padaa)/, /\bmirgi\b/, /fit aa ?(gayi|gaya|raha)/],
  },
  {
    category: "ml_self_harm",
    patterns: [/(marna|mar jana) chahta/, /jeena nahi chahta|jeena nai chahta/],
  },
];

/** Normalise the message for matching: lowercase, collapse whitespace. */
function normalise(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

/** Returns the first red-flag category that matches, or { matched: false }. */
export function detectRedFlag(rawMessage: string): RedFlagResult {
  const message = normalise(rawMessage);
  for (const flag of RED_FLAGS) {
    for (const pattern of flag.patterns) {
      const m = message.match(pattern);
      if (m) {
        return { matched: true, category: flag.category, phrase: m[0] };
      }
    }
  }
  return { matched: false };
}
