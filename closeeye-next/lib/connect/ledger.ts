/**
 * Close Eye Connect — the Understanding Ledger.
 *
 * Turns what a visitor TYPED into an honest ledger of understanding. It writes a
 * line ONLY when the words support it — relationship, living situation, city, the
 * asker's own distance, and the real question. Everything it was NOT told (health,
 * age, who's nearby) becomes a dotted BLANK, never a claim. This is the product's
 * core promise: understanding, never invention.
 *
 * Deterministic, on-device, framework-free — built on the validated classifier in
 * ./understand. The UI is a presentation layer over this; the engine stands alone.
 */
import { classify, pronoun, type Gender } from './understand'

export type Provenance = 'connect_experience' | 'family_space' | 'guardian' | 'ai_engine'
export type LedgerEntryType =
  | 'family_fact' | 'guardian_observation' | 'ai_understanding'
  | 'visit_observation' | 'correction' | 'memory'

export interface LedgerLine {
  label: string
  body: string
  /** render as a quoted line (the visitor's real question) */
  quote?: boolean
}

export interface ReadLedger {
  /** Display name for the person — a real name, else the relationship ("Your Mother"). */
  subjectLabel: string
  relationship: string | null      // canonical: 'mother'
  relationshipWord: string | null  // display: 'mother'
  name: string | null
  gender: Gender | null
  city: string | null
  livesAlone: boolean
  distant: boolean
  question: string
  /** stated facts only, in the design's order */
  ledger: LedgerLine[]
  /** fixed open prompts — what we were NOT told (gendered) */
  blanks: string[]
  rawText: string
}

const cap = (w: string) => (w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : w)
const titleWords = (s: string) => s.split(/\s+/).map(cap).join(' ')
/** conjugate a base verb for the subject ("live" → she "lives" / they "live"). */
const conj = (base: string, g: Gender | null) => (g === 'they' ? base : `${base}s`)

// A conservative city gazetteer — only names actually present in the text become a
// location line. Anything unknown stays unstated (never guessed).
const CITIES = ['hyderabad','bangalore','bengaluru','mumbai','delhi','new delhi','chennai','kolkata','pune','ahmedabad','jaipur','lucknow','kochi','cochin','coimbatore','visakhapatnam','vizag','vijayawada','warangal','nagpur','indore','bhopal','patna','surat','kanpur','nashik','mysore','mysuru','madurai','trichy','guntur','tirupati','goa','chandigarh','gurgaon','gurugram','noida',
  'london','manchester','birmingham','new york','boston','chicago','san francisco','seattle','austin','dallas','houston','toronto','vancouver','sydney','melbourne','dubai','abu dhabi','singapore','doha','riyadh','muscat','kuwait','manila']

function findCity(text: string): string | null {
  const q = ` ${text.toLowerCase()} `
  // longest match first so "new delhi" beats "delhi"
  for (const c of [...CITIES].sort((a, b) => b.length - a.length)) {
    if (new RegExp(`\\b${c.replace(/ /g, '\\s+')}\\b`).test(q)) return titleWords(c)
  }
  return null
}

const ALONE = /\b(lives?\s+alone|living\s+alone|(by|on)\s+(her|his|their)\s+own|all\s+alone|(her|him|them)self\s+alone|stays?\s+alone)\b/i
const DISTANT = /\b(far\s+away|far\s+from|miles\s+away|another\s+(city|country|state)|different\s+(city|country|state)|abroad|overseas|can'?t\s+be\s+there|cannot\s+be\s+there|live\s+abroad|living\s+abroad|so\s+far)\b/i

export interface Blank { key: 'health' | 'mornings' | 'nearby'; text: string }

/** The three things Close Eye never guesses — gendered, keyed so the Space can mark
 *  each one filled once the family tells us. */
export function blanksFor(gender: Gender | null): Blank[] {
  const they = pronoun.subject(gender)
  const them = pronoun.object(gender)
  const poss = cap(pronoun.possessive(gender))
  const manage = conj('manage', gender)
  return [
    { key: 'health', text: `${poss} health, and what ${they} ${manage} day to day` },
    { key: 'mornings', text: `${poss} age, and the shape of ${pronoun.possessive(gender)} mornings` },
    { key: 'nearby', text: `Who can reach ${them} in twenty minutes, if ever needed` },
  ]
}

/** The real question — the last question-sentence, else the whole trimmed message. */
function realQuestion(text: string): string {
  const t = text.trim()
  const qs = t.match(/[^.?!]*\?/g)
  if (qs && qs.length) return qs[qs.length - 1]!.trim()
  return t.replace(/\s+/g, ' ')
}

/** Read what was typed into an honest ledger. Never infers a fact that wasn't stated. */
export function readLedger(rawText: string): ReadLedger {
  const text = (rawText || '').trim()
  const u = classify(text)
  const relationship = u.rel
  const relationshipWord = u.dispRel
  const name = u.name
  const gender: Gender | null = u.gender
  const city = findCity(text)
  const livesAlone = ALONE.test(text)
  const distant = DISTANT.test(text)
  const question = realQuestion(text)

  const subjectLabel = name ? name : relationshipWord ? `Your ${cap(relationshipWord)}` : 'Someone you love'
  const they = pronoun.subject(gender)   // she / he / they
  const poss = cap(pronoun.possessive(gender)) // Her / His / Their

  const ledger: LedgerLine[] = []

  // 1 · who
  if (name || relationshipWord) {
    ledger.push({ label: 'Someone you love', body: name ? `${name}.` : `Your ${relationshipWord}.` })
  }

  // 2 · their days — only what was stated
  if (livesAlone || city) {
    let body: string
    if (livesAlone && city) body = `${cap(they)} ${conj('live', gender)} alone, in ${city}.`
    else if (livesAlone) body = `${cap(they)} ${conj('live', gender)} alone.`
    else body = `${cap(they)} ${conj('live', gender)} in ${city}.`
    ledger.push({ label: `${poss} days`, body })
  }

  // 3 · you — only if the visitor said they are far
  if (distant) {
    ledger.push({ label: 'You', body: 'You are far away.' })
  }

  // 4 · the real question, quoted
  if (question) {
    ledger.push({ label: 'Your real question', body: question, quote: true })
  }

  // blanks — what we were NOT told (fixed, gendered), never claimed
  const blanks = blanksFor(gender).map((b) => b.text)

  return { subjectLabel, relationship, relationshipWord, name, gender, city, livesAlone, distant, question, ledger, blanks, rawText: text }
}

/**
 * The answer — counsel written strictly from what was understood. It reasons from
 * stated facts (lives alone → a rhythm; far away → written proof; the recurring
 * worry → ongoing presence) and NEVER asserts health, age, or any fact not given.
 */
export function counsel(rl: ReadLedger): { paragraphs: string[]; signature: string } {
  const g = rl.gender
  const they = pronoun.subject(g)
  const them = pronoun.object(g)
  const paragraphs: string[] = []

  paragraphs.push(
    rl.livesAlone
      ? `Because ${they} ${conj('live', g)} alone, the first thing I’d put in place is a gentle rhythm — a Guardian who visits, notices what a phone call can’t, and writes it down for you the same day.`
      : `The first thing I’d put in place is a gentle rhythm — a Guardian who visits, notices what a phone call can’t, and writes it down for you the same day.`,
  )
  paragraphs.push(
    rl.distant
      ? `Because you are far away, every visit becomes a page you can hold: how ${they} seemed, what ${they} ate, what ${they} laughed about. Proof, not reassurance.`
      : `Every visit becomes a page you can hold: how ${they} seemed, what ${they} ate, what ${they} laughed about. Proof, not reassurance.`,
  )
  paragraphs.push(
    `And because what you’re really asking is whether ${they}’s okay — not just when you speak — the answer isn’t one visit. It’s someone nearby who already knows ${them}, before anything is ever urgent.`,
  )

  const who = rl.name ? rl.name : rl.relationshipWord ? `your ${rl.relationshipWord}` : 'the one you love'
  return { paragraphs, signature: `— written for ${who}, from what you told me` }
}

/** The ledger lines to persist on space creation, with provenance (append-only). */
export function ledgerEntriesForStorage(rl: ReadLedger): { entry_type: LedgerEntryType; label: string; body: string; source: Provenance }[] {
  return rl.ledger.map((l) => ({
    entry_type: 'family_fact' as const,
    label: l.quote ? 'Your real question' : l.label,
    body: l.body,
    source: 'connect_experience' as const,
  }))
}
