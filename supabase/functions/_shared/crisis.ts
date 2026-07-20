// CloseEye · THE canonical crisis floor. ONE vocabulary. BOTH surfaces.
//
// ─── WHY THIS FILE EXISTS ───────────────────────────────────────────────────────
// There used to be two crisis engines that shared no code:
//
//   Ask Close Eye  supabase/functions/ask-health/redflags.ts   (Deno, LLM surface)
//   Connect        closeeye-next/lib/connect/crisis.ts         (bundled, on-device)
//
// The only thing joining them was a comment reading "KEEP IN SYNC". They did not stay
// in sync. The audit of 2026-07-17 measured the cost against the same 25 emergencies:
// Ask missed 7 that Connect caught ("breathing problem", "having a fit", "blood coming
// from her head"), while Connect missed every curly-apostrophe variant — "she can't
// breathe" typed on an iPhone — which Ask had normalised away long ago, and missed
// "isn't breathing" entirely.
//
// Each engine was better than the other in ways neither could benefit from. This file is
// their union. Neither surface keeps a private copy: Ask imports it as
// `../_shared/crisis.ts`, Connect imports it as `@shared/crisis`.
//
// ─── HOW IT STAYS IMPORTABLE BY BOTH RUNTIMES ───────────────────────────────────
// Deno resolves `.ts` specifiers; webpack does not. This file therefore has ZERO imports
// and uses no Deno or Node globals — it is pure pattern matching, so both toolchains can
// consume the identical bytes. Keep it that way: one import here re-splits the engines.
// (closeeye-next reaches it via `experimental.externalDir` + a SINGLE-FILE tsconfig
// include — including the whole _shared dir breaks the Next build, because its Deno-typed
// neighbours reference the `Deno` global.)
//
// ─── THE TWO TIERS, AND WHY THE DISTINCTION IS LOAD-BEARING ─────────────────────
// STRONG  an unambiguous medical condition. Owned by the medical team (originally
//         redflags.ts — Dr. Sidharth reviews and extends). Recall-biased on purpose: a
//         false positive only offers help that wasn't needed; a false negative can miss a
//         real emergency. NOTHING can veto a STRONG cue.
//
// WEAK    a word that only means crisis in the right frame — "fell", "critical",
//         "emergency", "ICU". Sense-qualified with lookaheads, and vetoable.
//
// VETO    an occupational or administrative frame ("is a nurse in…", "works at…",
//         "insurance", "paperwork"). It can ONLY ever suppress a WEAK cue. This is the
//         load-bearing safety property: "my father is a doctor and he collapsed" still
//         fires, because "collapsed" is STRONG. A frame must never be able to talk us out
//         of a real emergency.
//
// OWNED BY THE MEDICAL TEAM. Extend STRONG freely — recall is the bias. Never add a word
// to WEAK that describes a body in danger.

export interface CrisisHit { matched: true; category: string; phrase: string }
export interface NoCrisis { matched: false }
export type CrisisResult = CrisisHit | NoCrisis

/** iOS and smart keyboards emit curly apostrophes. Families type on phones. */
export function normaliseForCrisis(text: string): string {
  return text
    .toLowerCase()
    .replace(/[’‘‛`´ʼ]/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

// ── STRONG · unambiguous. Never vetoed. ────────────────────────────────────────
// Categories and patterns originate in Ask's redflags.ts (medical-team owned) and are
// preserved verbatim except where marked. Additions from Connect's 2026-07-17 hardening
// are marked `+connect`.
const STRONG: { category: string; patterns: RegExp[] }[] = [
  {
    category: 'cardiac',
    patterns: [
      /chest (pain|tight|tightness|pressure|heavy|heaviness|discomfort)/,
      /(tight|tightness|pressure|heaviness|pain) (in|on) (his|her|their|the) chest/,
      /chest\b.{0,25}\b(tight|pressure|heav|crush|squeez)/,
      /\b(tight|pressure|crush|squeez)\w*\b.{0,25}\bchest/,
      /(clutch\w*|holding|grabbing|gripping) (his|her|their|the) chest/,
      /pain (in|down) (his|her|their|the) (left )?arm/,
      /heart (attack|racing|pounding)/,
      // +lifesafety 2026-07-20 · cardiac arrest / absent pulse — the most time-critical emergency,
      // previously uncovered (only "heart attack" fired). "stopped racing/pounding" is excluded so
      // relief ("her heart finally stopped racing") never fires. For medical review.
      /\bcardiac arrest\b/,
      /heart (has |just |suddenly )?stopped( beating)?\b(?!\s+(racing|pounding|hurting|aching|working out))/,
      /\bno pulse\b|(has|have|there('| ?)s|got|found) no pulse/,
      /(can('| ?)t|cannot|couldn('| ?)t|unable to) (find|feel|get|detect) (a |his |her |their |the )?pulse/,
      /\bpulseless\b/,
    ],
  },
  {
    category: 'breathing',
    patterns: [
      /(can('| ?)t|cannot|trouble|difficulty|struggling to) breath/,
      // Absent / stopped breathing — the most textbook emergency phrasing, which
      // the patterns above (which require can't/trouble/etc.) did not catch.
      /(not|isn('| ?)t|aren('| ?)t|wasn('| ?)t|won('| ?)t|hasn('| ?)t|no longer|hardly|barely) breath/,
      /(stopped|stops|ceased|quit) breath/,
      /short(ness)? of breath/,
      /gasping|choking|suffocat/,
      /(lips|face|skin|fingers|nails|hands)\b.{0,15}\b(blue|grey|gray|purple)/,
      /\b(blue|grey|gray|purple)\b.{0,10}\b(lips|face|skin|fingers|nails)/,
      // +lifesafety 2026-07-20 · cyanosis without naming a body part. "turning/going blue" is a
      // colour change (an emergency); "feeling blue" (sadness) never matches — it isn't turning/going.
      /(turning|going|gone|went|turned) (blue|purple|grey|gray)\b/,
      /breathing (very |really )?(fast|rapid|heavy|hard)/,
      // +connect · the NOUN form. "breathing problem" carries no verb for the patterns
      // above to hook, and it is how a great many families say it.
      /breath(ing)? (problem|trouble|issue|difficulty|difficulties)/,
      /breathless/,
    ],
  },
  {
    category: 'stroke',
    patterns: [
      // CHANGED 2026-07-17 (was a bare /\bstroke\b/, recall-biased by the medical team).
      // Qualified so "a stroke of luck" is not a medical emergency — the ONLY exclusion,
      // and "stroke of" never denotes the condition. "he's having a stroke" is unchanged.
      // Flagged for medical review.
      /\bstroke\b(?!\s+of\b)/,
      /face (is |looks |looking )?(drooping|droopy|crooked|twisted)/,
      /slurred speech|can('| ?)t speak|words? (are )?jumbled|speech (is )?slurred/,
      // +lifesafety 2026-07-20 · the verb form families use for slurring.
      /slurr(ing|ed) (his|her|their|my|the|its)? ?(words|speech)/,
      /one side (of (his|her|the) )?(body|face) (is )?(weak|numb|paralys|drooping)/,
      /sudden(ly)? (numb|weak)(ness)? (on|in) one side/,
      /(arm|leg) (went |is )?numb (and|on) one side/,
    ],
  },
  {
    category: 'consciousness',
    patterns: [
      /(passed out|pass(ed|es)? out|black(ed)? out|faint(ed|ing)|unconscious|unresponsive|not responding|won('| ?)t wake|can('| ?)t wake|not waking|collaps(e|ed|es|ing))/,
      /(suddenly )?(very )?confused|doesn('| ?)t know (where|who)/,
      /seizure|convuls|fitting/,
      /(went|gone|is|completely|totally|has gone) (limp|floppy|lifeless)/,
      // +connect · "having a fit" / "having fits" — the everyday word for a seizure.
      /(having|has|had|is having) (a |an )?fits?\b/,
      // +connect · stillness and silence, which families report before they report a cause.
      /(not|isn('| ?)t|won('| ?)t|stopped) (moving|talking|speaking|responding)/,
      /can('| ?)t move|cannot move/,
      // +connect · cannot rise — standalone, not only after a reported fall.
      /(can('| ?)t|cannot|unable to) get up/,
      // +lifesafety 2026-07-20 · the NEGATED-CONTRACTION "waking" forms — "isn't/wasn't/hasn't
      // waking up" were missed though "not waking"/"won't wake" fired; it is exactly the phrase a
      // panicking family types. Plus other everyday unconsciousness wording.
      /(not|isn('| ?)t|wasn('| ?)t|aren('| ?)t|hasn('| ?)t|haven('| ?)t|won('| ?)t|can('| ?)t|cannot|couldn('| ?)t|wouldn('| ?)t|unable to)( been| being| able to| yet| get (him|her|them) to)? (wake|waking|woken)\b/,
      /\bout cold\b/,
      /keeled over/,
      /(not |un|non.?)responsive\b/,
      /foaming at (the )?(mouth|lips)/,
    ],
  },
  {
    category: 'fall_injury',
    patterns: [
      /(fell|fallen|had a fall).*(can('| ?)t get up|hurt|bleeding|head|hip|broke|broken|unconscious|not moving)/,
      /(can('| ?)t get up|unable to get up).*(fell|fall)/,
      /hit (his|her|their) head/,
      // Bare falls — a leading cause of elder emergencies. Qualified enough to avoid
      // "fell asleep" / "fell ill" / "fell in love" false positives.
      /(had|has|have|took|having) (a|an|another) (bad |hard |serious |big |nasty |sudden |terrible )?fall\b/,
      /(fell|slipped|tripped) (down|over|badly|hard|flat)\b/,
      /(fell|slipped) (in the|on the|from|off|out of) /,
    ],
  },
  {
    category: 'bleeding',
    patterns: [
      /(heavy|severe|won('| ?)t stop|(a )?lot of|lots of|uncontrolled|excessive|profuse|badly|heavily) bleed/,
      /bleed(ing)? (heavily|badly|a lot|lot|profusely|uncontrollably|everywhere|non ?stop)/,
      /(still|keeps|keep|not stopping|non ?stop|constant(ly)?|continuous(ly)?) bleed/,
      /bleeding (from|out of) (his|her|their|the)? ?(head|mouth|ear|eyes?|nose and|chest|stomach|gut|rectum|wound|badly)/,
      /(losing|lost) (a lot of |lots of )?blood/,
      /blood (everywhere|all over|gushing|pouring)/,
      /vomit(ing|ed)? blood|throwing up blood|coughing (up )?blood/,
      /blood in (his|her|the|its|it)\b/,
      // +connect · blood appearing at all, wherever it is coming from.
      /blood (is )?coming/,
      // +lifesafety 2026-07-20 · exsanguination phrasing.
      /bleeding out\b/,
    ],
  },
  {
    category: 'accident_trauma',
    patterns: [
      /(met with|had|in|been in|there('| ?)s been) (an |a )?accident/,
      /(road|car|bike|scooter|bus|train|traffic) accident/,
      /(badly|seriously|severely|critically) (hurt|injured|wounded)/,
      /(serious|severe|major|bad|deep) (injury|wound|cut|gash|head injury)/,
      /(hit|knocked|run) (by|over|down) (a |by a )?(car|bike|vehicle|bus|truck)/,
      /\baccident\b.{0,30}\b(bleed|blood|unconscious|hurt|injured|not moving|head|broke|broken)/,
    ],
  },
  { category: 'overdose', patterns: [
      /overdose/,
      /took too many (pill|tablet)/,
      /(whole|entire|full) (strip|sheet|packet|bottle|box) of (the )?(pill|tablet|medicine|sleeping|tabl)/,
    ] },
  { category: 'allergic', patterns: [
      /(throat|tongue|face|lips) (is |are )?swell/,
      /anaphyla|severe allergic|can('| ?)t swallow/,
    ] },
  { category: 'self_harm', patterns: [
      /(wants?|wanting|trying) to (die|kill (him|her|them)self|end (his|her|their) life)/,
      /suicid|self[- ]harm|hurt (him|her|them)self/,
      /doesn('| ?)t want to live/,
    ] },
  { category: 'severe_pain', patterns: [
      /(worst|unbearable|extreme|severe) (pain|headache)/,
      /sudden (severe|terrible) (pain|headache)/,
    ] },
  {
    // Poisoning / foreign body / ingestion — universal (a son or a father alike).
    category: 'poisoning',
    patterns: [
      /swallow(ed|ing|s)?\b.{0,25}(battery|button ?cell|magnet|coin|poison|chemical|bleach|detergent|acid|kerosene|petrol|pesticide|rat poison|phenyl|naphthalene|sanitizer)/,
      /(ate|eaten|drank|drunk|took).{0,20}(poison|chemical|bleach|detergent|acid|kerosene|pesticide|rat poison|cleaning (liquid|fluid|agent)|mothball)/,
      /swallowed (something|an object|a coin|a battery|a magnet|a sharp|a pointed|a nail|a pin|a bead|a marble)/,
      /(object|coin|battery|button|toy|bead|marble|nut|seed|bone|pin|needle)\b.{0,15}(stuck|lodged|caught) (in|up|down) (his|her|their|the)? ?(throat|nose|ear|windpipe|food ?pipe|gullet)/,
      /(stuck|lodged) in (his|her|their|the) (throat|windpipe|nose|ear|gullet)/,
      // +connect
      /snake bite|poison\w*/,
    ],
  },
  {
    category: 'burns',
    patterns: [
      /(large|big|serious|severe|major|deep|third.?degree|second.?degree|bad|whole) burn/,
      /(electric(al)?|chemical|acid|hot oil|boiling water) burn/,
      /burn(t|ed|s|ing)?\b.{0,20}(face|hand|hands|genital|eyes?|large|whole|badly|all over)/,
      /(scald|scalded|scalding)\b.{0,20}(badly|severe|large|face|whole|all over)/,
      /(caught|catch|on) fire\b/,
    ],
  },
  {
    category: 'drowning',
    patterns: [
      /drown(ing|ed)?|near[- ]?drowning/,
      /(pulled|taken|got|dragged|lifted) (him|her|them|it)? ?(out )?(of|from) the (water|pool|pond|bathtub|tub|lake|sea|river|bucket|well)/,
      /(fell|slipped|went) (in|into|under) the (water|pool|pond|tub|bucket|well|lake|river)/,
      /(unconscious|not breathing|not responding|limp) (after|from|when).{0,20}(water|pool|swim|bath)/,
    ],
  },
  {
    // Infant-specific critical signs — requires an infant marker, so an adult "fever"
    // never fires here.
    category: 'infant_critical',
    patterns: [
      /(newborn|new born|infant|\d+ ?(week|month)s? old|my baby|the baby|small baby|tiny baby).{0,40}(fever|temperature|high temp|burning up|very hot|running a temp)/,
      /(fever|temperature|running a temp|burning up).{0,40}(newborn|new born|infant|\d+ ?(week|month)s? old|(my|the) baby)/,
      /(bulging|sunken|soft) (spot|fontanelle)/,
      /fontanelle/,
      /(baby|infant|newborn)\b.{0,15}(floppy|limp|lifeless|not moving|won('| ?)t move)/,
      /(floppy|limp|lifeless)\b.{0,15}(baby|infant|newborn)/,
      /(weak|high.?pitched|constant|inconsolable) cry.{0,30}(not feed|won('| ?)t feed|refus\w+ (to )?feed|not eating|no wet)/,
    ],
  },
  {
    // Non-blanching rash — meningitis / sepsis signal, serious at any age.
    category: 'meningitis_rash',
    patterns: [
      /rash.{0,30}(doesn('| ?)t|does not|won('| ?)t|will not|not) (fade|go away|go|disappear|blanch|change|vanish)/,
      /(non.?blanching) rash|rash.{0,20}(glass|tumbler|press|pressing|pressed)/,
      /(purple|red|dark) (spots|rash|blotches|patches).{0,25}(spreading|all over|with (a )?fever|and (a )?fever|not fad)/,
    ],
  },

  // Multilingual (romanized Hindi / Hinglish + Telugu)
  { category: 'ml_consciousness', patterns: [/\bbehosh\b|\bbesudh\b/, /spruha thapp/, /gir ke behosh/] },
  { category: 'ml_breathing', patterns: [
      /saans (nahi|nai|band|ruk|tez|takleef)/,
      /saans lene me(i)?n? (takleef|dikkat|problem)/,
      /dam ghut/,
      /oopiri (andatledu|raavatledu|aadatledu|raatledu)/,
    ] },
  { category: 'ml_cardiac', patterns: [
      /(seene|seena|chhati|chhaati|chaati|chati) me(i)?n? .{0,12}dard/,
      /gunde no(p|op)pi/,
      /dil ka daura/,
      /heart .{0,6}daura/,
    ] },
  { category: 'ml_fall', patterns: [
      /gir ga(ya|yi|ye|e).{0,30}(uth nahi|utha nahi|uth nai|chot|sar|khoon|bleeding)/,
      /padipoy.{0,40}(lechi|lecha|nilab|leva|lekapo|noppi|levalek)/,
    ] },
  { category: 'ml_bleeding', patterns: [/khoon .{0,15}(beh|ruk nahi|ruk nai|zyada|bahut)/, /(bahut|zyada) khoon/] },
  {
    // Blood glucose crisis — qualitative and clinical terms only; no number regex.
    category: 'blood_glucose',
    patterns: [
      // Known false positive: "sugar intake dropped" — accepted per recall-bias policy.
      /(blood )?(sugar|glucose).{0,20}(dropped|crashed|very low|too low|dangerously low)/,
      /hypoglyc[ae]mi|hyperglyc[ae]mi/,
    ],
  },
  { category: 'ml_seizure', patterns: [/daura (pada|aaya|aa raha|padaa)/, /\bmirgi\b/, /fit aa ?(gayi|gaya|raha)/] },
  { category: 'ml_self_harm', patterns: [/(marna|mar jana) chahta/, /jeena nahi chahta|jeena nai chahta/] },

  // +connect · SERVICES ALREADY INVOLVED — somebody has already escalated. Ask had no
  // equivalent: "we called an ambulance" was invisible to it.
  { category: 'services_involved', patterns: [
      /ambulance|call(ed|ing)? 108|\b108\b|\b911\b|\b999\b/,
      /hospitali[sz]\w*|rushed (to|her|him|them)|taken to (the )?hospital|admitted to/,
    ] },
  // +connect · EXPLICIT DISTRESS — the family telling us plainly, without a symptom.
  { category: 'explicit_distress', patterns: [
      /something (is )?(very |terribly |badly )?wrong|very wrong|gone wrong/,
      /wrong with (her|him|them|my|amma|appa|mom|dad)/,
      /need help (immediately|urgently|right now)|help (immediately|urgently)/,
      // The slot knew "help ADVERB" but not "ADJECTIVE help", so "I need URGENT help" —
      // the exact words on our own red button — did not read as a crisis. Both word
      // orders now, because a family in trouble does not pick one for us.
      /\b(urgent|immediate|emergency)\s+help\b/,
      /come (quick\w*|fast|immediately|urgently)/,
      /very (sick|ill)\b(?! of\b)/,
      /badly hurt|seriously hurt|got hurt|\binjured\b/,
    ] },
]

// ── WEAK · crisis only in the right frame. Sense-qualified, and vetoable. ───────
const WEAK: { category: string; patterns: RegExp[] }[] = [
  { category: 'weak_dying', patterns: [/\bdying\b(?!\s+(to\b|for\b|(her|his|my|the) hair))/] },
  { category: 'weak_critical', patterns: [/\bcritical\w*\b(?!\s+(thinking|of\b|to\b|for\b|about))/] },
  { category: 'weak_serious', patterns: [/(very serious|serious condition)\b(?!\s+about)/] },
  { category: 'weak_emergency', patterns: [/\bemergency\b(?!\s+(contact|contacts|number|numbers|details|kit|fund|savings))/] },
  // The bare word. STRONG's accident_trauma requires a qualifier it does not always get —
  // "had a BAD accident" slips between "had a" and "accident", which the 12,000-interaction
  // gate caught when this line was briefly missing. Weak, so an insurance/paperwork frame
  // still vetoes it; unqualified, so a family's plain words still reach us.
  { category: 'weak_accident', patterns: [/\baccident\b/] },
  { category: 'weak_at_hospital', patterns: [/in (the )?hospital|into (the )?hospital|in teh hospital|\bicu\b|casualty|emergency (ward|room)/] },
]

// ── VETO · an occupational or administrative frame. WEAK cues only. ────────────
const VETO =
  /\b(is|was|are|were) (a|an) (nurse|doctor|surgeon|physician|staff|technician|receptionist|attendant|paramedic|ward ?boy|cleaner|volunteer)\b|\bworks? (at|in|for)\b|\bworking (at|in|for)\b|\bvolunteers? (at|in|for)\b|\bemployed\b|\bin the \w+ business\b|\bshift at\b|\binsurance\b|\bpolicy\b|\bpolicies\b|\bclaim\w*\b|\bpaperwork\b|\bpremium\b|\bcoverage\b/

// ── URGENCY · urgent ABOUT a medical place. Never urgency alone ("now" is common). ──
const URGENCY = /\b(right now|immediately|urgently|urgent|asap|at once|straight ?away|quickly|now|fast|quick)\b/
const NOT_URGENT = /\b(nothing|not|no|isn't) (urgent|serious|an emergency)\b|\bno (rush|hurry)\b|\bnot in a (rush|hurry)\b/
const MEDICAL_DEST = /\b(hospital|emergency|casualty|icu|ward|clinic|doctor)\b/

/**
 * The crisis floor. Returns the matched category and phrase, or { matched: false }.
 * Precedence: STRONG (never vetoed) → WEAK (unless vetoed) → urgency about a medical place.
 * Pure; no I/O; no state.
 */
export function detectCrisis(rawMessage: string): CrisisResult {
  const message = normaliseForCrisis(rawMessage)
  for (const flag of STRONG) {
    for (const pattern of flag.patterns) {
      const m = message.match(pattern)
      if (m) return { matched: true, category: flag.category, phrase: m[0] }
    }
  }
  if (!VETO.test(message)) {
    for (const flag of WEAK) {
      for (const pattern of flag.patterns) {
        const m = message.match(pattern)
        if (m) return { matched: true, category: flag.category, phrase: m[0] }
      }
    }
  }
  if (URGENCY.test(message) && MEDICAL_DEST.test(message) && !NOT_URGENT.test(message)) {
    return { matched: true, category: 'weak_urgent_medical', phrase: message.match(URGENCY)?.[0] ?? 'urgent' }
  }
  return { matched: false }
}

/**
 * Connect's view: is this a MEDICAL crisis?
 *
 * Deliberately excludes the self-harm categories. They are a real crisis, but they belong
 * in a helpline lane, not the 108 lane — and Connect has no helpline lane today, so
 * surfacing them here would route a person in mental-health crisis to an ambulance. Ask
 * routes them correctly via classifyCrisis(). Connect's missing helpline lane is a known
 * gap, raised separately; this function does not paper over it.
 */
export function isCrisis(rawMessage: string): boolean {
  const r = detectCrisis(rawMessage)
  return r.matched && r.category !== 'self_harm' && r.category !== 'ml_self_harm'
}
