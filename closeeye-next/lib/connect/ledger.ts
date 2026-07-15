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

export type NeedType =
  | 'wellbeing' | 'errand' | 'medical' | 'emergency'
  | 'companionship' | 'documents' | 'memories' | 'history' | 'unclear'

export interface LedgerLine { label: string; body: string; quote?: boolean }
export interface Blank { key: string; text: string }

export interface ReadLedger {
  subjectLabel: string             // display name — a real name, else "Your Sister"
  relationship: string | null      // canonical: 'sister'
  relationshipWord: string | null
  name: string | null
  gender: Gender | null
  forLoved: boolean                // is this about a specific person we identified?
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
const conj = (base: string, g: Gender | null) => (g === 'they' ? base : `${base}s`)

/* ── city gazetteer (only stated locations become a line — never guessed) ── */
const CITIES = ['hyderabad','bangalore','bengaluru','mumbai','delhi','new delhi','chennai','kolkata','pune','ahmedabad','jaipur','lucknow','kochi','cochin','coimbatore','visakhapatnam','vizag','vijayawada','warangal','nagpur','indore','bhopal','patna','surat','kanpur','nashik','mysore','mysuru','madurai','trichy','guntur','tirupati','goa','chandigarh','gurgaon','gurugram','noida',
  'london','manchester','birmingham','new york','boston','chicago','san francisco','seattle','austin','dallas','houston','toronto','vancouver','sydney','melbourne','dubai','abu dhabi','singapore','doha','riyadh','muscat','kuwait','manila']
function findCity(text: string): string | null {
  const q = ` ${text.toLowerCase()} `
  for (const c of [...CITIES].sort((a, b) => b.length - a.length)) {
    if (new RegExp(`\\b${c.replace(/ /g, '\\s+')}\\b`).test(q)) return titleWords(c)
  }
  return null
}

const ALONE = /\b(lives?\s+alone|living\s+alone|(by|on)\s+(her|his|their)\s+own|all\s+alone|stays?\s+alone)\b/i
const DISTANT = /\b(far\s+away|far\s+from|miles\s+away|another\s+(city|country|state)|different\s+(city|country|state)|abroad|overseas|can'?t\s+be\s+there|cannot\s+be\s+there|living\s+abroad|so\s+far)\b/i

/* ── need detection (order = priority; specific needs win over generic help) ── */
const NEED_PATTERNS: [NeedType, RegExp][] = [
  ['emergency', /\b(fell(\s+down)?|fallen|not\s+breathing|can'?t\s+breathe|cannot\s+breathe|stopped\s+breathing|difficulty\s+breathing|trouble\s+breathing|breathless|gasping|choking|choke|chest\s+pain|heart\s+attack|cardiac|stroke|seizure|convuls\w*|unconscious|unresponsive|not\s+responding|won'?t\s+wake|can'?t\s+wake|passed\s+out|faint\w*|collaps\w*|bleeding|blood\s+everywhere|accident|hospitali[sz]\w*|in\s+(the\s+)?hospital|into\s+(the\s+)?hospital|to\s+(the\s+)?hospital|taken\s+to\s+hospital|rushed\s+(to|her|him|them)|admitted\s+to\s+(the\s+)?(hospital|icu|ward)|\bicu\b|casualty|emergency\s+ward|emergency\s+room|ambulance|call\s+108|\b108\b|\b911\b|\b999\b|very\s+serious|serious\s+condition|critical\w*|\bdying\b|overdose|poison\w*|snake\s+bite|drown\w*|come\s+(quick\w*|fast|immediately|urgently)|need\s+help\s+immediately|help\s+(immediately|urgently)|emergency|something\s+(is\s+)?(very\s+|terribly\s+|badly\s+)?wrong|very\s+wrong|gone\s+wrong|wrong\s+with\s+(her|him|them|my|amma|appa|mom|dad)|very\s+(sick|ill)|badly\s+hurt|got\s+hurt|seriously\s+hurt|injured|not\s+moving|can'?t\s+move|can'?t\s+get\s+up|won'?t\s+respond|in\s+teh\s+hospital|to\s+teh\s+hospital)\b/i],
  ['medical', /\b(fever|temperature|10[34]\b|medicine|medicin\w*|medcine|medication|meds|tablet|pill|dose|insulin|\bbp\b|blood\s+pressure|sugar\s+(level|is|has|high|low)|blood\s+sugar|(her|his|their)\s+sugar|diabet\w*|doctor|unwell|not\s+(keeping\s+)?well|not\s+feeling\s+well|sick|\bill\b|not\s+eaten|not\s+eating|hasn'?t\s+eaten|won'?t\s+eat|refusing\s+to\s+eat|weak|weakness|dizzy|giddy|giddiness|infection|wound|cough\w*|vomit\w*|loose\s+motion|diarr\w*|headache|body\s+pain|joint\s+pain|checkup|check-?up|blood\s+test|\bscan\b|nausea|swelling|\brash\b)\b/i],
  ['companionship', /\b(lonely|alone\s+all|feels?\s+alone|sad|bored|miss(es|ing)?\s+(us|me|company)|no\s+one|isolated|company|someone\s+to\s+talk|depress\w*|seems?\s+low|sits?\s+quietly)\b/i],
  ['documents', /\b(keep|store|save|safe|upload)\b.*\b(report\w*|document\w*|prescription\w*|paper\w*|record\w*|policy|policies|aadhaar|certificate\w*)\b|\b(report\w*|prescription\w*|record\w*)\b.*\b(safe|keep|store)\b/i],
  ['memories', /\b(photo\w*|picture\w*|album\w*|memories|remember|stories|keepsake)\b/i],
  ['history', /\b(family\s+history|ancestry|our\s+roots|heritage|family\s+come\w*\s+from|where\s+(we|our\s+family)\s+(are\s+)?from|family\s+tree|our\s+family\s+story)\b/i],
  // physical errands + any request for a real person to help with a task
  ['errand', /\b(pick\s*up|pickup|picked\s+up|drop\s*off|dropoff|drop\s+(her|him|them)|collect|bring\s+(her|him|them)|take\s+(her|him|them)\s+to|groceries|grocery|buy|purchase|deliver|delivery|ration|airport|railway|station|errand|shopping|gas\s+cylinder|pay\s+(the|her|his|a)\s+bill|help\s+me|needs?\s+help|someone\s+to\s+help|can\s+(someone|you)\s+help|needs?\s+someone|needs?\s+a\s+hand|help\s+(me\s+)?with|help\s+paying|paying\s+\w*\s*bill|want\s+help|file\s+(a|my|the|tax)|taxes?|paperwork|legal|insurance|pension|passport|visa|\bform\b|apply\s+for|sort\w*\s+out|arrange|bank\s+(work|issue|account)|\bfix\b|repair|book\s+a\s+(cab|taxi|ticket|appointment))\b/i],
  ['wellbeing', /\b(how\s+is|how'?s|how\s+are|is\s+(she|he|they)\s+(okay|ok|alright|fine)|okay|alright|doing\s+(well|okay|ok)?|worried|check\s+on|know\s+(she|he|they)'?s|every\s+day|sleeping|eating\s+(well|properly))\b/i],
]
function detectNeed(text: string): NeedType {
  for (const [need, re] of NEED_PATTERNS) if (re.test(text)) return need
  return 'unclear'
}

/** The real question / statement — verbatim, so we never reword the visitor. */
function realQuestion(text: string): string {
  const t = text.trim()
  const qs = t.match(/[^.?!]*\?/g)
  if (qs && qs.length) return qs[qs.length - 1]!.trim()
  return t.replace(/\s+/g, ' ')
}

/* ── per-need understanding: concern · confidence · blanks · answer ── */
const AI_CONFIDENT: Record<NeedType, boolean> = {
  wellbeing: true, documents: true, memories: true, history: true,
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

function concernFor(need: NeedType, name: string, forLoved: boolean): string | null {
  switch (need) {
    case 'wellbeing': return `You want to know ${name} is okay — day to day, not only when you speak.`
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
  const relationship = u.rel, relationshipWord = u.dispRel, name = u.name, gender: Gender | null = u.gender
  const city = findCity(text)
  const livesAlone = ALONE.test(text)
  const distant = DISTANT.test(text)
  const question = realQuestion(text)
  const forLoved = !!(name || relationshipWord)
  let need = detectNeed(text)
  // a person named with no explicit need ("Mom?", "uncle?") = "how are they" — default
  // to wellbeing rather than leaving it unclear.
  if (need === 'unclear' && forLoved) need = 'wellbeing'

  const subjectLabel = name ? name : relationshipWord ? `Your ${cap(relationshipWord)}` : 'Someone you love'
  const who = name || (relationshipWord ? `your ${relationshipWord}` : 'them')
  const they = pronoun.subject(gender)
  const poss = cap(pronoun.possessive(gender))
  let concern = concernFor(need, who, forLoved)
  // a money/law/admin errand isn't "someone to do it" — it's a steady hand to help organize
  if (need === 'errand' && PROFESSIONAL.test(text)) {
    concern = forLoved
      ? `You want ${who} to have a steady hand with this — someone to help get it organized, not carry it alone.`
      : `You want a steady hand with this — someone to help you get it organized, not carry it alone.`
  }

  const ledger: LedgerLine[] = []
  if (name || relationshipWord) ledger.push({ label: 'Someone you love', body: name ? `${name}.` : `Your ${relationshipWord}.` })
  // the stated matter, when there is one (money/law/admin) — from their words only
  if (need === 'errand' && PROFESSIONAL.test(text)) {
    const matter = matterLine(text, gender)
    if (matter) ledger.push({ label: 'The matter', body: matter })
  }
  if (livesAlone || city) {
    const body = livesAlone && city ? `${cap(they)} ${conj('live', gender)} alone, in ${city}.`
      : livesAlone ? `${cap(they)} ${conj('live', gender)} alone.` : `${cap(they)} ${conj('live', gender)} in ${city}.`
    ledger.push({ label: `${poss} days`, body })
  }
  if (distant) ledger.push({ label: 'You', body: 'You are far away.' })
  if (concern) ledger.push({ label: 'What you need', body: concern })
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

  return {
    subjectLabel, relationship, relationshipWord, name, gender, forLoved, city, livesAlone, distant,
    question, need, concern, aiConfident: AI_CONFIDENT[need],
    ledger, blanks, rawText: text,
  }
}

/**
 * The answer — written strictly from what was understood, honest about whether
 * Connect can help directly or whether a real person is the right answer. It
 * NEVER restates the concern as something the visitor didn't say.
 */
export function counsel(rl: ReadLedger): { paragraphs: string[]; signature: string } {
  const g = rl.gender
  const they = pronoun.subject(g), them = pronoun.object(g)
  const name = rl.name || (rl.relationshipWord ? `your ${rl.relationshipWord}` : 'the one you love')
  const P: string[] = []
  const professional = PROFESSIONAL.test(rl.rawText)

  switch (rl.need) {
    case 'wellbeing':
      P.push(rl.livesAlone
        ? `Because ${they} ${conj('live', g)} alone, the first thing I'd put in place is a gentle rhythm — a Guardian who visits, notices what a phone call can't, and writes it down for you the same day.`
        : `The first thing I'd put in place is a gentle rhythm — a Guardian who visits, notices what a phone call can't, and writes it down for you the same day.`)
      P.push(rl.distant
        ? `Because you are far away, every visit becomes a page you can hold: how ${they} seemed, what ${they} ate, what ${they} laughed about. Proof, not reassurance.`
        : `Every visit becomes a page you can hold: how ${they} seemed, what ${they} ate, what ${they} laughed about. Proof, not reassurance.`)
      break
    case 'errand':
      if (professional) {
        // money / law / admin: Connect arranges a trusted person to help ORGANIZE and
        // says a professional is needed — it never gives the advice itself. If the
        // visitor said how often, we echo it once.
        const freq = frequencyPhrase(rl.rawText)
        const echo = freq ? `${cap(freq)}, this doesn't have to land on ${rl.forLoved ? them : 'you'} alone. ` : ''
        const tail = freq ? '' : rl.forLoved ? `, so it isn't a weight ${g === 'they' ? 'they carry' : `${they} carries`} alone` : `, so it isn't a weight you carry alone`
        P.push(rl.forLoved
          ? `${echo}I won't give tax or money advice — that isn't my place. What Close Eye can do today is send a trusted person to sit with ${name}, help gather the papers, and get everything organized${tail}.`
          : `${echo}I won't give tax or money advice — that isn't my place. What Close Eye can do today is send a trusted person to sit with you, help gather the papers, and get everything organized${tail}.`)
        P.push(`Close Eye knows when a professional is needed — and brings the right, trusted hands in. Your Presence Manager confirms the details with you first.`)
      } else if (rl.forLoved) {
        P.push(`This is a real-world thing — it needs a person, not an app. Close Eye can put a trusted human on it for ${name}, and tell you the moment it's done.`)
        P.push(`You don't chase anyone or arrange a stranger. Your Presence Manager confirms the details with you first.`)
      } else {
        P.push(`I understand — you need a real person to help with this, not an answer from an app.`)
        P.push(`That's exactly what Close Eye is for: real people, when they're needed. Tell us what you need and a trusted person will help — or reach one on WhatsApp right now.`)
      }
      break
    case 'medical':
      P.push(`I won't guess about health — ever. What ${name} needs is a real look: a verified Guardian who visits in person, notices what a call can't, and writes it down for you the same day.`)
      P.push(`If anything is urgent, Close Eye reaches real help fast. Tell me what you're seeing, and I'll arrange the right visit.`)
      break
    case 'emergency':
      P.push(`If ${name} is in danger, please call your local emergency number now — that comes first, always.`)
      P.push(`The moment ${name} is in your family space, Close Eye watches for exactly these moments and reaches a verified person fast, so ${they} is never facing it alone.`)
      break
    case 'companionship':
      P.push(`Sometimes the truest answer is simply presence. Close Eye can send someone to sit with ${name} — share tea, listen, and tell you how it went.`)
      P.push(`Not a stranger each time — a familiar face who comes to know ${them}.`)
      break
    case 'documents':
      P.push(`Close Eye keeps ${name}'s important papers in one private place — easy to find the day you need them, shared with no one without your say.`)
      break
    case 'memories':
      P.push(`Close Eye holds the photos and stories that matter — the moments your family doesn't want to lose, kept privately for you.`)
      break
    case 'history':
      P.push(`Close Eye keeps your family's story — the people, places and roots that made you — safe for the generations after.`)
      break
    default:
      P.push(`I want to be honest — I'm not yet sure what you need, and I'd rather understand than guess.`)
      P.push(`Tell me a little more — who this is for, and what would help — or reach a real person on WhatsApp, and we'll help you either way.`)
  }
  return { paragraphs: P, signature: rl.forLoved ? `— for ${name}, from what you told me` : `— from what you told me` }
}

/** The ledger lines to persist on space creation, with provenance (append-only). */
export function ledgerEntriesForStorage(rl: ReadLedger): { entry_type: 'family_fact'; label: string; body: string; source: 'connect_experience' }[] {
  return rl.ledger.map((l) => ({
    entry_type: 'family_fact' as const,
    label: l.quote ? 'In your words' : l.label,
    body: l.body,
    source: 'connect_experience' as const,
  }))
}
