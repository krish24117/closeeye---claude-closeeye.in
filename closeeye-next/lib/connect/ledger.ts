/**
 * Close Eye Connect — the Understanding Ledger.
 *
 * Turns what a visitor TYPED into an honest understanding. It answers, in order:
 *   1. Who is the person?               → relationship / name
 *   2. What is happening?               → the NEED (errand, medical, emergency,
 *                                          companionship, wellbeing question, …)
 *   3. What is the user's real concern? → a grounded reflection, never invented
 *   4. What is still missing?           → blanks RELEVANT to that need
 *   5. Can AI answer confidently?       → aiConfident (false for real-world tasks)
 *   6. If not, what human help fits?    → the answer routes to the right person
 *
 * It NEVER puts words in the user's mouth. A request for a pickup is not turned
 * into "you want to know she's okay." A relationship label is not treated as the
 * whole intent. Deterministic, on-device, framework-free — built on ./understand.
 */
import { classify, pronoun, type Gender } from './understand'
import { isCrisis } from './crisis'
import { SERVED_AREAS, presenceFor, type PresenceAvailability } from '@/lib/platform/service-region'

export type NeedType =
  | 'wellbeing' | 'errand' | 'medical' | 'emergency'
  | 'companionship' | 'documents' | 'memories' | 'history' | 'unclear'

/**
 * A line of understanding.
 *  - `quote`    — the visitor's own words, verbatim.
 *  - `inferred` — Connect's READING, not something it was told. It must never be labelled
 *                 "from your words", and must never be stored as a family fact.
 *  - neither    — a fact stated by the visitor and extracted from their text.
 */
export interface LedgerLine { label: string; body: string; quote?: boolean; inferred?: boolean }
export interface Blank { key: string; text: string }

export type SubjectKind = 'person' | 'family' | 'self'

export interface ReadLedger {
  subjectLabel: string             // display name — a real name, else "Your Sister"
  relationship: string | null      // canonical: 'sister'
  relationshipWord: string | null
  name: string | null
  gender: Gender | null
  forLoved: boolean                // is this about a specific person we identified?
  subjectKind: SubjectKind | null  // who this is for — a person, the family, or the visitor
  subjectKnown: boolean            // ANY valid subject understood (person | family | self)
  situation: string | null         // a life event in their words ("Moving to Hyderabad.")
  city: string | null
  livesAlone: boolean
  distant: boolean
  question: string                 // the visitor's own words, verbatim
  need: NeedType                   // what is happening
  concern: string | null           // a grounded reflection of the real concern
  aiConfident: boolean             // can Connect answer, or is a person needed?
  ledger: LedgerLine[]             // stated facts + concern, in order
  blanks: Blank[]                  // what we were NOT told, RELEVANT to the need
  rawText: string
}

const cap = (w: string) => (w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : w)
const titleWords = (s: string) => s.split(/\s+/).map(cap).join(' ')
// present-tense agreement: plural "they" AND unknown gender (rendered as "They")
// both take the bare verb — "they live", never "they lives".
const conj = (base: string, g: Gender | null) => (g === 'they' || !g ? base : `${base}s`)
const isPlural = (g: Gender | null) => g === 'they' || !g // "they"/unknown → are, live, need

/* ── city gazetteer (only stated locations become a line — never guessed) ── */
const CITIES = ['hyderabad','bangalore','bengaluru','mumbai','delhi','new delhi','chennai','kolkata','pune','ahmedabad','jaipur','lucknow','kochi','cochin','coimbatore','visakhapatnam','vizag','vijayawada','warangal','nagpur','indore','bhopal','patna','surat','kanpur','nashik','mysore','mysuru','madurai','trichy','guntur','tirupati','goa','chandigarh','gurgaon','gurugram','noida',
  'london','manchester','birmingham','new york','boston','chicago','san francisco','seattle','austin','dallas','houston','toronto','vancouver','sydney','melbourne','dubai','abu dhabi','singapore','doha','riyadh','muscat','kuwait','manila']
// Every place we SERVE must also be a place we can READ — otherwise "she's in Gachibowli"
// scans as no-location-given and we'd ask a family we cover where they are.
const GAZETTEER = [...new Set([...CITIES, ...SERVED_AREAS])]
function findCity(text: string): string | null {
  const q = ` ${text.toLowerCase()} `
  for (const c of [...GAZETTEER].sort((a, b) => b.length - a.length)) {
    if (new RegExp(`\\b${c.replace(/[- ]/g, '[-\\\\s]+')}\\b`).test(q)) return titleWords(c)
  }
  return null
}

const ALONE = /\b(lives?\s+alone|living\s+alone|(by|on)\s+(her|his|their)\s+own|all\s+alone|stays?\s+alone)\b/i
const DISTANT = /\b(far\s+away|far\s+from|miles\s+away|another\s+(city|country|state)|different\s+(city|country|state)|abroad|overseas|can'?t\s+be\s+there|cannot\s+be\s+there|living\s+abroad|so\s+far)\b/i

/* ── broader subjects: a collective (family) or the visitor themselves (self) are
   valid subjects too — not only a single identified person. ── */
const FAMILY_SUBJ = /\b(?:my|our|the|whole)\s+famil(?:y|ies)\b|\bfor\s+(?:my|our)\s+family\b|\bmy\s+folks\b|\bwe\s+(?:need|want|are|have|just)\b|\bwe'?re\b/i
const SELF_SUBJ = /\bfor\s+me\b|\bhelp\s+me\b|\bi\s+need\b|\bi\s+want\b|\bi'?m\b|\bi\s+am\b|\bmyself\b|\bmy\s+own\b|\bfor\s+myself\b/i
/* Someone we have not been told about yet. "I want someone to take HER to the hospital"
   is not a sentence about the visitor — it was being labelled "You" because it says "I
   want". A singular third person means the subject is a person we cannot name, so we ask
   who rather than answer about the wrong one. Deliberately NOT they/them: a family
   sentence uses those of itself ("my family, they live far"). */
const OTHER_PERSON = /\b(?:she|he|her|him|his|hers)\b/i
/* ── a life SITUATION (a move / settling in), and a request to get set up ── */
const RELOCATION = /\b(?:shift(?:ing|ed)?|relocat\w*|mov(?:e|es|ing|ed)|settl(?:e|es|ing|ed)|new\s+(?:city|place|home|country|town)|just\s+moved)\b/i
const SETUP = /\b(?:local\s+support|set(?:ting)?\s*up|\bsetup\b|settle\b|settling\b|get\s+set|sort\s+(?:out|things)|help\s+(?:us|me)\s+(?:set|settle|with)|support\s+to)\b/i

/* ── need detection (order = priority; specific needs win over generic help) ── */
/* NB: 'emergency' is deliberately NOT in this table. It is the one need that must read
   identically everywhere, so it lives in crisis.ts and is asked first, below — see
   detectNeed. Adding an emergency row here would recreate the exact drift the audit of
   2026-07-17 found. */
const NEED_PATTERNS: [NeedType, RegExp][] = [
  ['medical', /\b(fever|temperature|10[34]\b|medicine|medicin\w*|medcine|medication|meds|tablet|pill|dose|insulin|\bbp\b|blood\s+pressure|sugar\s+(level|is|has|high|low)|blood\s+sugar|(her|his|their)\s+sugar|diabet\w*|doctor|unwell|not\s+(keeping\s+)?well|not\s+feeling\s+well|sick|\bill\b|not\s+eaten|not\s+eating|hasn'?t\s+eaten|won'?t\s+eat|refusing\s+to\s+eat|weak|weakness|dizzy|giddy|giddiness|infection|wound|cough\w*|vomit\w*|loose\s+motion|diarr\w*|headache|body\s+pain|joint\s+pain|checkup|check-?up|blood\s+test|\bscan\b|nausea|swelling|\brash\b)\b/i],
  ['companionship', /\b(lonely|alone\s+all|feels?\s+alone|sad|bored|miss(es|ing)?\s+(us|me|company)|no\s+one|isolated|company|someone\s+to\s+talk|depress\w*|seems?\s+low|sits?\s+quietly)\b/i],
  ['documents', /\b(keep|store|save|safe|upload)\b.*\b(report\w*|document\w*|prescription\w*|paper\w*|record\w*|policy|policies|aadhaar|certificate\w*)\b|\b(report\w*|prescription\w*|record\w*)\b.*\b(safe|keep|store)\b/i],
  ['memories', /\b(photo\w*|picture\w*|album\w*|memories|remember|stories|keepsake)\b/i],
  ['history', /\b(family\s+history|ancestry|our\s+roots|heritage|family\s+come\w*\s+from|where\s+(we|our\s+family)\s+(are\s+)?from|family\s+tree|our\s+family\s+story)\b/i],
  // physical errands + any request for a real person to help with a task
  ['errand', /\b(pick\s*up|pickup|picked\s+up|drop\s*off|dropoff|drop\s+(her|him|them)|collect|bring\s+(her|him|them)|take\s+(her|him|them)\s+to|groceries|grocery|buy|purchase|deliver|delivery|ration|airport|railway|station|errand|shopping|gas\s+cylinder|pay\s+(the|her|his|a)\s+bill|help\s+me|needs?\s+help|someone\s+to\s+help|can\s+(someone|you)\s+help|needs?\s+someone|needs?\s+a\s+hand|help\s+(me\s+)?with|help\s+paying|paying\s+\w*\s*bill|want\s+help|file\s+(a|my|the|tax)|taxes?|paperwork|legal|insurance|pension|passport|visa|\bform\b|apply\s+for|sort\w*\s+out|arrange|bank\s+(work|issue|account)|\bfix\b|repair|book\s+a\s+(cab|taxi|ticket|appointment)|hospital\s+compan\w*|\bcompanion\b|\baccompany\b|\bescort\b)\b/i],
  ['wellbeing', /\b(how\s+is|how'?s|how\s+are|is\s+(she|he|they)\s+(okay|ok|alright|fine)|okay|alright|doing\s+(well|okay|ok)?|worried|check\s+on|know\s+(she|he|they)'?s|every\s+day|sleeping|eating\s+(well|properly))\b/i],
]
function detectNeed(text: string): NeedType {
  if (isCrisis(text)) return 'emergency'   // the shared vocabulary, asked before any topic
  for (const [need, re] of NEED_PATTERNS) if (re.test(text)) return need
  return 'unclear'
}

/* ── the escort ask: "send a real person to take someone somewhere" ──
   The errand slot only knew pronoun objects — take (her|him|them) to — so "take MY FATHER
   to the hospital" matched nothing and fell through to a topic. The object is generalized
   here over every way a person can be named: a pronoun, a possessive kinship phrase, a
   bare kinship word ("take Amma to the clinic"), or the given name the engine already
   extracted. The destination is deliberately NOT required — "take my father hospital" is
   the same ask with a preposition missing, and half our families type that way.
   The object must be a PERSON, which is why it is built from the relationship vocabulary
   rather than a wildcard: "take my medicine" is not an errand, and must not become one. */
const ACCOMPANY = 'take|takes|taking|took|bring|brings|bringing|drop|drops|dropping|carry|carries|' +
  'escort|escorts|accompany|accompanies|go\\s+with|goes\\s+with|come\\s+with|comes\\s+with|walk\\s+with'
const reEscape = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

function isEscortAsk(text: string, relToken: string | null, name: string | null): boolean {
  const obj = ['her', 'him', 'them']
  if (relToken) obj.push(reEscape(relToken))
  if (name) obj.push(reEscape(name.toLowerCase()))
  const re = new RegExp(
    `\\b(?:${ACCOMPANY})\\b\\s+(?:(?:my|our|his|her|their|the)\\s+)?(?:${obj.join('|')})\\b`, 'i')
  return re.test(text)
}

/** The real question / statement — verbatim, so we never reword the visitor. */
function realQuestion(text: string): string {
  const t = text.trim()
  const qs = t.match(/[^.?!]*\?/g)
  if (qs && qs.length) return qs[qs.length - 1]!.trim()
  return t.replace(/\s+/g, ' ')
}

/* ── per-need understanding: concern · confidence · blanks · answer ── */
/**
 * Can Connect answer this on its own, or is a person the honest answer?
 *
 * documents / memories / history were `true` — Connect answered confidently and stopped,
 * with no way through to a human. But Close Eye cannot actually hold a document, a photo,
 * or a family archive today, so confidence was the wrong posture: it ended the
 * conversation exactly where a person was needed. They are now `false` — "humans when
 * understanding isn't enough" (D2).
 */
const AI_CONFIDENT: Record<NeedType, boolean> = {
  wellbeing: true,
  documents: false, memories: false, history: false,
  errand: false, medical: false, emergency: false, companionship: false, unclear: false,
}

/** Errands that touch money, law or admin — Connect helps ORGANIZE with a trusted
    person and says a professional is needed; it never gives the advice itself. */
const PROFESSIONAL = /\b(tax(es)?|itr|gst|financ\w*|legal|lawyer|insurance|pension|passport|visa|bank\w*|audit|accountant|paperwork|filing|compliance)\b/i

/** The visitor's own words for how often — echoed once, never invented. */
const FREQ = /\b(every\s+year|each\s+year|yearly|annually|every\s+month|each\s+month|monthly|every\s+week|each\s+week|weekly)\b/i
function frequencyPhrase(text: string): string | null {
  const m = text.match(FREQ)
  return m ? m[0].replace(/\s+/g, ' ').toLowerCase() : null
}

/** The stated matter (tax filing, pension paperwork, …) as a short possessive
    line — from the visitor's words only, with their frequency if they gave one. */
const MATTER = /\b(tax\s+(?:filings?|returns?)|taxes?|pension\s+paperwork|pension|insurance\s+claim\w*|insurance|passport\s+renewal|passport|visa\s+\w+|visa|gst\s+\w+|gst|bank\s+(?:work|issue|account\w*)|legal\s+\w+|paperwork|filing)\b/i
function matterLine(text: string, gender: Gender | null): string | null {
  const m = text.match(MATTER)
  if (!m) return null
  const matter = m[0].replace(/\s+/g, ' ').toLowerCase()
  const freqAdj = /\b(every\s+year|each\s+year|yearly|annual)/i.test(text) ? 'yearly '
    : /\b(every\s+month|each\s+month|monthly)/i.test(text) ? 'monthly '
    : /\b(every\s+week|each\s+week|weekly)/i.test(text) ? 'weekly ' : ''
  return `${cap(pronoun.possessive(gender))} ${freqAdj}${matter}.`
}

function concernFor(need: NeedType, name: string, forLoved: boolean, gender: Gender | null): string | null {
  const are = isPlural(gender) ? 'are' : 'is'
  switch (need) {
    case 'wellbeing': return `You want to know ${name} ${are} okay — day to day, not only when you speak.`
    case 'errand': return forLoved
      ? `You need a real-world hand for ${name} — someone to actually do it, not an answer.`
      : `You need a real person to help with something real — and that's exactly when Close Eye steps in.`
    case 'medical': return `Something about ${name}'s health needs a real look — and you don't want a guess.`
    case 'emergency': return `This sounds urgent — ${name} may need help right now.`
    case 'companionship': return `${cap(name)} could use company — a familiar face, not just a phone call.`
    case 'documents': return `You want ${name}'s important papers kept safe and easy to find.`
    case 'memories': return `You want to hold on to the photos and stories that matter.`
    case 'history': return `You want your family's story kept for good.`
    default: return null
  }
}

/** Gendered, need-relevant blanks — what Connect still needs, never generic filler. */
export function blanksFor(gender: Gender | null): Blank[] {
  // the general set used by the Family Space's ongoing learning
  const they = pronoun.subject(gender), them = pronoun.object(gender), poss = cap(pronoun.possessive(gender))
  return [
    { key: 'health', text: `${poss} health, and what ${they} ${conj('manage', gender)} day to day` },
    { key: 'mornings', text: `${poss} age, and the shape of ${pronoun.possessive(gender)} mornings` },
    { key: 'nearby', text: `Who can reach ${them} in twenty minutes, if ever needed` },
  ]
}
/** Short, warm display labels for the "still learning" blank keys. Used in the
 *  Connect ribbon/ledger AND by the Family Space to dedup a blank against a fact the
 *  family already gave. The general-blank labels (health/mornings/nearby) are unique
 *  and never collide with a base ledger-line label — so we never re-ask what's known. */
export const KEY_LABEL: Record<string, string> = {
  city: 'City',
  health: 'Health', mornings: 'Age & mornings', nearby: 'Nearby help', when_where: 'When & where',
  reach: 'How to reach', details: 'What’s needed', seeing: 'What you see', meds: 'Medicines',
  doctor: 'Doctor', where: 'Where', with: 'Who’s there', days: 'Her days', loves: 'What she loves',
  often: 'How often', which: 'Papers', whose: 'Photos', from: 'Roots',
  due: 'By when', papers: 'Papers', helps: 'Who helps',
}

function blanksForNeed(need: NeedType, name: string, gender: Gender | null, forLoved: boolean): Blank[] {
  const they = pronoun.subject(gender), them = pronoun.object(gender), poss = pronoun.possessive(gender)
  switch (need) {
    case 'errand': return forLoved ? [
      { key: 'when_where', text: `When and where it needs to happen` },
      { key: 'reach', text: `How to reach ${name} on the day` },
      { key: 'details', text: `Anything ${they}'ll need — bags, papers, a wheelchair` },
    ] : [] // a general help request → a real person gathers the details, no form to fill
    case 'medical': return [
      { key: 'seeing', text: `What you're noticing about ${them}` },
      { key: 'meds', text: `${cap(poss)} medicines, and what ${they} ${conj('take', gender)} each day` },
      { key: 'doctor', text: `${cap(poss)} doctor, if there is one` },
    ]
    case 'emergency': return [
      { key: 'where', text: `Where ${name} is right now` },
      { key: 'with', text: `Who is with ${them}` },
    ]
    case 'companionship': return [
      { key: 'days', text: `The shape of ${poss} days` },
      { key: 'loves', text: `What ${they} loves to talk about` },
      { key: 'often', text: `How often ${they}'d welcome a visit` },
    ]
    case 'documents': return [
      { key: 'which', text: `Which papers matter most` },
      { key: 'where', text: `Where they are kept now` },
    ]
    case 'memories': return [{ key: 'whose', text: `Whose photos and stories to keep first` }]
    case 'history': return [{ key: 'from', text: `Where your family comes from` }]
    case 'unclear': return []
    default: return blanksFor(gender) // wellbeing → the general three
  }
}

/** Read what was typed into an honest understanding. Never infers an unstated fact. */
export function readLedger(rawText: string): ReadLedger {
  const text = (rawText || '').trim()
  const u = classify(text)
  const relationship = u.rel, relationshipWord = u.dispRel, name = u.name
  const gender: Gender | null = u.gender
  const city = findCity(text)
  const livesAlone = ALONE.test(text)
  const distant = DISTANT.test(text)
  const question = realQuestion(text)

  const forLoved = !!(name || relationshipWord)
  // Broader subjects: a specific person, else the whole family, else the visitor —
  // any of these is a real subject, not an "I don't know who".
  const aboutSomeoneElse = !forLoved && OTHER_PERSON.test(text)
  const isFamily = !forLoved && !aboutSomeoneElse && FAMILY_SUBJ.test(text)
  const isSelf = !forLoved && !aboutSomeoneElse && !isFamily && SELF_SUBJ.test(text)
  const subjectKind: SubjectKind | null = forLoved ? 'person' : isFamily ? 'family' : isSelf ? 'self' : null
  const subjectKnown = subjectKind !== null
  // NB: we never assign a gender we weren't given — plural agreement for a family
  // falls out of isPlural(null) → "are"/"live", and family lines avoid pronoun verbs.

  // A life SITUATION — a move / settling in — read as a gerund so there is no verb to disagree.
  const relocating = RELOCATION.test(text)
  const situation = relocating && city ? `Moving to ${city}.`
    : relocating ? 'Settling into a new place.' : null

  let need = detectNeed(text)
  // Asking for a person to take someone somewhere is an ERRAND — a real-world hand. The
  // ASK is more specific than the TOPIC it happens to touch, so it outranks "medical"
  // ("take him to the hospital for a checkup" is an errand, not a health question) but
  // never outranks an emergency: if someone collapsed, that is what matters, not the lift.
  if (need !== 'emergency' && isEscortAsk(text, u.relToken, name)) need = 'errand'
  if (need === 'unclear' && forLoved) need = 'wellbeing'
  // A known subject with a move / setup ask needs a real-world hand — an errand routed
  // to a human, never a dead "unclear".
  if (need === 'unclear' && subjectKnown && (relocating || SETUP.test(text))) need = 'errand'

  // A visitor asking for THEMSELVES is not "your family" — that mislabels the one person
  // we're certain about. The space they create is their own; at provisioning we know who
  // they are and use their real name (see doProvision).
  const subjectLabel = name ? name : relationshipWord ? `Your ${cap(relationshipWord)}`
    : isFamily ? 'Your family' : isSelf ? 'You' : 'Someone you love'
  const who = name ? name : relationshipWord ? `your ${relationshipWord}`
    : isFamily ? 'your family' : isSelf ? 'you' : 'them'
  const they = pronoun.subject(gender)
  const poss = cap(pronoun.possessive(gender))

  let concern = concernFor(need, who, forLoved, gender)
  if (need === 'errand' && PROFESSIONAL.test(text)) {
    // money/law/admin errand — a steady hand to help organize, never advice
    concern = forLoved
      ? `You want ${who} to have a steady hand with this — someone to help get it organized, not carry it alone.`
      : `You want a steady hand with this — someone to help you get it organized, not carry it alone.`
  } else if (need === 'errand' && !forLoved && (relocating || SETUP.test(text))) {
    // family / self settling in — honest, grounded, from their words
    concern = `A trusted person on the ground to help ${isSelf ? 'you' : 'your family'} settle in and get set up.`
  }
  // We were told about someone, but not WHO. Every line above reads "them" into the
  // sentence — "them may need help right now" — which is both ungrammatical and an
  // assumption. We ask instead. Safety is the single exception: an emergency is stated
  // without a name rather than withheld until we know one.
  if (!subjectKnown) {
    concern = need === 'emergency' ? 'This sounds urgent — someone may need help right now.' : null
  }

  const ledger: LedgerLine[] = []
  // WHO — a person, the family, or the visitor
  if (forLoved) ledger.push({ label: 'Someone you love', body: name ? `${name}.` : `Your ${relationshipWord}.` })
  else if (isFamily) ledger.push({ label: 'Who', body: 'Your family.' })
  else if (isSelf) ledger.push({ label: 'Who', body: 'You.' })
  // THE MATTER (money/law/admin) — from their words only
  if (need === 'errand' && PROFESSIONAL.test(text)) {
    const matter = matterLine(text, gender)
    if (matter) ledger.push({ label: 'The matter', body: matter })
  }
  // WHAT'S HAPPENING (a life situation) — else a person's living pattern — else a bare place
  if (situation) {
    ledger.push({ label: 'What’s happening', body: situation })
  } else if (forLoved && (livesAlone || city)) {
    const body = livesAlone && city ? `${cap(they)} ${conj('live', gender)} alone, in ${city}.`
      : livesAlone ? `${cap(they)} ${conj('live', gender)} alone.` : `${cap(they)} ${conj('live', gender)} in ${city}.`
    ledger.push({ label: `${poss} days`, body })
  } else if (city) {
    ledger.push({ label: 'Where', body: `In ${city}.` })
  }
  if (distant) ledger.push({ label: 'You', body: 'You are far away.' })
  // The concern is Connect's READING of what they want — written by concernFor() from the
  // detected need, not stated by the visitor. Labelled as a reading, and marked `inferred`
  // so it is never chipped "from your words" and never stored as a family fact.
  if (concern) ledger.push({ label: 'What I think you need', body: concern, inferred: true })
  if (question) ledger.push({ label: 'In your words', body: question, quote: true })

  let blanks = blanksForNeed(need, who, gender, forLoved)
  // a money/law/admin errand needs organising questions, not "bags, a wheelchair"
  if (need === 'errand' && forLoved && PROFESSIONAL.test(text)) {
    blanks = [
      { key: 'due', text: `When it needs to be done by` },
      { key: 'papers', text: `Where ${who}'s papers are kept` },
      { key: 'helps', text: `Who usually helps ${who} with it` },
    ]
  }
  // Where they are decides whether Close Eye can offer presence at all — so when the need
  // wants presence and no location was given, this is the one blank worth opening. It is
  // asked for that reason only; we never collect a location we have no use for.
  // (Applied LAST: the professional branch above replaces the list wholesale.)
  if (PRESENCE_NEEDS.has(need) && !city) {
    blanks = [{ key: 'city', text: `Which city ${forLoved ? who : 'your family'} is in` }, ...blanks]
  }

  return {
    subjectLabel, relationship, relationshipWord, name, gender, forLoved,
    subjectKind, subjectKnown, situation,
    city, livesAlone, distant,
    question, need, concern, aiConfident: AI_CONFIDENT[need],
    ledger, blanks, rawText: text,
  }
}

/** Needs whose honest answer depends on whether a real person can actually be there. */
const PRESENCE_NEEDS = new Set<NeedType>(['wellbeing', 'errand', 'medical', 'companionship'])

/** The gentle, single clarification — asked only when location changes the answer. */
export const WHERE_QUESTION = 'If you ever need someone to be there in person, which city is your family in?'

export interface CounselContext {
  /** A location the family told us after the first message (e.g. answering WHERE_QUESTION). */
  location?: string | null
}

/**
 * The answer — written strictly from what was understood, honest about whether
 * Connect can help directly or whether a real person is the right answer. It
 * NEVER restates the concern as something the visitor didn't say.
 *
 * Presence is gated by SERVICE REGION: Close Eye only promises someone can be there where
 * that is genuinely true today. Where it isn't — or where we haven't been told — it says
 * what it can actually do (understand, and hand that understanding to a real person) and
 * asks, once, for the one fact that would change the answer.
 */
export function counsel(rl: ReadLedger, ctx?: CounselContext): { paragraphs: string[]; signature: string; needsHuman: boolean } {
  const g = rl.gender
  const they = pronoun.subject(g), them = pronoun.object(g)
  const name = rl.name || (rl.relationshipWord ? `your ${rl.relationshipWord}` : 'the one you love')
  const P: string[] = []
  const professional = PROFESSIONAL.test(rl.rawText)

  // Presence policy. `ctx.location` is a location the family gave us LATER (answering the
  // "which city" line); it is merged here rather than mutating the ledger, so answering a
  // question never reshuffles the understanding they're looking at.
  const presence = presenceFor(ctx?.location ?? rl.city)
  const canBeThere = presence === 'available'
  const dependsOnPresence = PRESENCE_NEEDS.has(rl.need)
  // "If you ever need someone to be there in person, which city is your family in?" —
  // asked ONLY when the answer would genuinely change what Close Eye can offer.
  const askWhere = dependsOnPresence && presence === 'unknown'

  switch (rl.need) {
    case 'wellbeing':
      if (canBeThere) {
        P.push(rl.livesAlone
          ? `Because ${they} ${conj('live', g)} alone, what I'd put in place is a gentle rhythm — a trusted person who can be there in a way a phone call can't, and tell you honestly how ${they} ${conj('seem', g)}.`
          : `What I'd put in place is a gentle rhythm — a trusted person who can be there in a way a phone call can't, and tell you honestly how ${they} ${conj('seem', g)}.`)
        P.push(rl.distant
          ? `Because you are far away, what comes back to you is real — how ${they} ${conj('seem', g)}, how the days are going — not reassurance you just have to trust.`
          : `What comes back to you is real — how ${they} ${conj('seem', g)}, how the days are going — steady, honest, yours.`)
      } else {
        P.push(rl.distant
          ? `Because you are far away, the hardest part is not knowing — and I won't hand you reassurance I can't stand behind.`
          : `The hardest part is not knowing — and I won't hand you reassurance I can't stand behind.`)
        P.push(`What I can do is understand ${name} properly, keep what you tell me, and put it in front of a real person at Close Eye — you won't have to explain it twice.`)
      }
      break
    case 'errand':
      if (professional) {
        // money / law / admin: Connect arranges a trusted person to help ORGANIZE and
        // says a professional is needed — it never gives the advice itself. If the
        // visitor said how often, we echo it once.
        const freq = frequencyPhrase(rl.rawText)
        const echo = freq ? `${cap(freq)}, this doesn't have to land on ${rl.forLoved ? them : 'you'} alone. ` : ''
        const tail = freq ? '' : rl.forLoved ? `, so it isn't a weight ${g === 'they' ? 'they carry' : `${they} carries`} alone` : `, so it isn't a weight you carry alone`
        const who = rl.forLoved ? name : 'you'
        if (canBeThere) {
          P.push(`${echo}I won't give tax or money advice — that isn't my place. What Close Eye can do today is send a trusted person to sit with ${who}, help gather the papers, and get everything organized${tail}.`)
          // "A real person", never "YOUR Presence Manager" — a visitor here has no
          // membership and no one assigned. Naming a relationship they don't have is a
          // small lie that the rest of the page then has to carry.
          P.push(`Close Eye knows when a professional is needed — and brings the right, trusted hands in. A real person confirms every detail with you first.`)
        } else {
          P.push(`${echo}I won't give tax or money advice — that isn't my place.`)
          P.push(`What I can do is make sure a real person at Close Eye knows exactly what's needed — I'll pass on what you've told me, so you won't have to explain it twice${tail}.`)
        }
      } else if (canBeThere) {
        P.push(rl.forLoved
          ? `This is a real-world thing — it needs a person, not an app. Close Eye can put a trusted human on it for ${name}, and tell you the moment it's done.`
          : `This is a real-world thing — it needs a person, not an app. Close Eye can put a trusted human on it, and tell you the moment it's done.`)
        P.push(`You don't chase anyone or arrange a stranger. A real person confirms every detail with you first.`)
      } else {
        P.push(`I understand — this needs a real person, not an answer from an app.`)
        P.push(`A real person at Close Eye is one message away, and I'll pass on what you've told me${rl.forLoved ? ` about ${name}` : ''} — so you won't have to say it twice.`)
      }
      break
    case 'medical':
      P.push(`I won't guess about health — ever. What ${name} needs is a real look in person — someone who can be there, notice what a call can't, and tell you plainly what they see.`)
      P.push(canBeThere
        ? `Tell me what you're seeing, and Close Eye brings the right person to ${name}.`
        : `Tell me what you're seeing, and I'll put it in front of a real person at Close Eye — you won't have to explain it twice.`)
      break
    case 'emergency':
      // Only what is true TODAY: emergency services first, then a real person who is
      // actually reachable this minute. Close Eye does not monitor anyone and cannot
      // promise presence it hasn't arranged — in the one moment a family is most likely
      // to believe us, we say only what we can stand behind.
      P.push(`If ${name} is in danger, please call your local emergency number now — that comes first, always.`)
      P.push(`You don't have to work out the next step alone. A real person at Close Eye is one message away, right now.`)
      break
    case 'companionship':
      if (canBeThere) {
        P.push(`Sometimes the truest answer is simply presence. Close Eye can send someone to sit with ${name} — share tea, listen, and tell you how it went.`)
        P.push(`Not a stranger each time — a familiar face who comes to know ${them}.`)
      } else {
        P.push(`Sometimes the truest answer is simply presence — and that isn't something an app can hand you.`)
        P.push(`What I can do is understand what ${name} would welcome, and put it in front of a real person at Close Eye — you won't have to explain it twice.`)
      }
      break
    // documents / memories / history — Close Eye does not hold files, photos or a family
    // archive. What it genuinely keeps is what you TELL it: facts, in your Family Space.
    // So these answers describe exactly that, and route to a person for the rest (D2) —
    // rather than describing a vault that doesn't exist.
    case 'documents':
      P.push(`What Close Eye keeps is what you tell me — which of ${name}'s papers matter, and where they're kept. That lives in your Family Space, for you.`)
      P.push(`If you'd like a hand getting them in order, a real person at Close Eye is one message away.`)
      break
    case 'memories':
      P.push(`What Close Eye keeps is what you tell me — the people, the moments, the stories worth holding on to. They live in your Family Space, for you.`)
      P.push(`If there's more you'd like kept for your family, a real person at Close Eye is one message away.`)
      break
    case 'history':
      P.push(`What Close Eye keeps is what you tell me — where your family comes from, the names and places that made you. That lives in your Family Space, for you.`)
      P.push(`If you'd like help gathering the rest, a real person at Close Eye is one message away.`)
      break
    default:
      P.push(`I want to be honest — I'm not yet sure what you need, and I'd rather understand than guess.`)
      P.push(`Tell me a little more — who this is for, and what would help — or reach a real person on WhatsApp, and we'll help you either way.`)
  }
  // One gentle question, and only when the answer would genuinely change what Close Eye
  // can offer. We never collect a location we have no use for.
  if (askWhere) P.push(WHERE_QUESTION)

  return {
    paragraphs: P,
    signature: rl.forLoved ? `— for ${name}, from what you told me` : `— from what you told me`,
    // A person is the honest answer when the engine can't answer alone, OR when the need
    // wants presence we can't promise here. Without the second clause, `wellbeing`
    // outside a served region would end confidently with no way through to a human.
    needsHuman: !rl.aiConfident || (dependsOnPresence && !canBeThere),
  }
}

/** A short, human summary of what Connect understood — for the WhatsApp handoff, so
 *  the visitor never has to repeat themselves. Built from the ledger lines (their
 *  words), excluding the verbatim quote (which we pass separately). */
export function understandingSummary(rl: ReadLedger): string {
  const lines = rl.ledger.filter((l) => !l.quote).map((l) => `• ${l.label}: ${l.body.replace(/\.$/, '')}`)
  return lines.length ? lines.join('\n') : '• (not yet clear)'
}

/**
 * The ledger lines to persist on space creation, with provenance (append-only).
 *
 * An inferred line is stored as `ai_understanding`, NEVER `family_fact`. The distinction is
 * the whole point: a family fact is something the family told us and we may repeat back as
 * true; an ai_understanding is our reading, which we may not. Storing a reading as a fact
 * would quietly promote a guess into the family's permanent memory — and /space renders
 * family_fact rows as "what Connect knows".
 */
export function ledgerEntriesForStorage(rl: ReadLedger): { entry_type: 'family_fact' | 'ai_understanding'; label: string; body: string; source: 'connect_experience' }[] {
  return rl.ledger.map((l) => ({
    entry_type: l.inferred ? ('ai_understanding' as const) : ('family_fact' as const),
    label: l.quote ? 'In your words' : l.label,
    body: l.body,
    source: 'connect_experience' as const,
  }))
}
