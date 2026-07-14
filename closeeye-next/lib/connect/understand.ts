/**
 * Close Eye Connect — the conversation-understanding engine.
 *
 * Deterministic, on-device, framework-free. It NEVER calls an LLM and NEVER
 * invents a fact about a family: it only reads the words a visitor typed,
 * classifies intent, extracts a person / relationship where present, and names
 * what it is still missing. When unsure, it asks — it does not guess.
 *
 * This is the pure brain behind the /connect "first conversation" surface. The
 * UI renders these outputs; all logic lives here so it can be regression-tested
 * against the 1,000-conversation corpus (see understand.test.ts).
 *
 * Constitution: Family → Retrieve → Reason → Answer. Understanding before answers.
 */

export type Intent =
  | 'wellbeing' | 'medicine' | 'documents' | 'photos' | 'memories'
  | 'visits' | 'history' | 'care' | 'emergency' | 'meta'

export type Gender = 'she' | 'he' | 'they'

export interface Understanding {
  meta: boolean            // a greeting / "who are you" / abuse — route to the calm meta lane
  intent: Intent
  name: string | null      // a person's given name, only when clearly present
  relToken: string | null  // the exact word matched ("amma", "dad", "nani")
  rel: string | null       // canonical relationship ("mother", "father", "grandmother")
  dispRel: string | null   // display relationship for the UI ("mother")
  gender: Gender | null
  multi: boolean           // more than one person mentioned ("Mom and Dad")
}

export type FollowupKind = 'name' | 'detail' | 'none'

const cap = (w: string): string => (w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : w)

/* ── relationship vocabulary (English + common transliterations) ── */
const REL: Record<string, Gender> = {
  mother:'she',mom:'she',mum:'she',mummy:'she',mommy:'she',ma:'she',amma:'she',mumma:'she',ammi:'she',
  father:'he',dad:'he',daddy:'he',papa:'he',pa:'he',appa:'he',baba:'he',abba:'he',bapu:'he',nanna:'he',
  grandmother:'she',grandma:'she',granny:'she',nani:'she',dadi:'she',ajji:'she',aaji:'she',
  grandfather:'he',grandpa:'he',grandad:'he',nana:'he',dada:'he',thatha:'he',tata:'he',ajoba:'he',
  daughter:'she',son:'he',wife:'she',husband:'he',
  sister:'she',behn:'she',didi:'she',akka:'she',brother:'he',bhai:'he',
  aunt:'she',chachi:'she',mausi:'she',pinni:'she',uncle:'he',chacha:'he',mamu:'he',
  grandparents:'they',parents:'they',
}
const DISPLAY: Record<string, string> = {
  amma:'mother',mumma:'mother',ammi:'mother',ma:'mother',mom:'mother',mum:'mother',mummy:'mother',mommy:'mother',
  appa:'father',papa:'father',pa:'father',daddy:'father',dad:'father',baba:'father',abba:'father',bapu:'father',nanna:'father',
  nani:'grandmother',dadi:'grandmother',ajji:'grandmother',aaji:'grandmother',granny:'grandmother',grandma:'grandmother',
  nana:'grandfather',dada:'grandfather',thatha:'grandfather',tata:'grandfather',ajoba:'grandfather',grandpa:'grandfather',grandad:'grandfather',
  behn:'sister',didi:'sister',akka:'sister',bhai:'brother',chachi:'aunt',mausi:'aunt',pinni:'aunt',chacha:'uncle',mamu:'uncle',
}
const CANON: Record<string, string> = {
  mother:'mother',father:'father',grandmother:'grandmother',grandfather:'grandfather',
  daughter:'daughter',son:'son',wife:'wife',husband:'husband',sister:'sister',brother:'brother',
  aunt:'aunt',uncle:'uncle',grandparents:'grandparents',parents:'parents',
}
const canonRel = (token: string | null): string | null => {
  if (!token) return null
  const disp = DISPLAY[token] ?? token
  return CANON[disp] ?? CANON[token] ?? disp
}

/* ── stop-words: never a person's name ── */
const STOP = new Set<string>(
  ('how is are am was were did do does can could would will shall has have had the a an and or but ' +
   'my your our their his her its me i im we you he she it they them on in at to for of about with without ' +
   'please hey hi hello ok okay fine good been being today now just still not na ah doing feel feeling keep ' +
   'safe store save send look after someone remember studying elderly autistic lonely properly worried far ' +
   'away us cannot thinking real person this that what who where when why help stupid alright ' +
   // common vernacular fillers that are not names
   'theek thik hai hain kaise kaisi kais ela unnaru unnara teesukunnara dawai li kya acha accha sab down').split(/\s+/)
    .filter(Boolean),
)
/* ── places: after a preposition these read as locations, not people ── */
const PLACE = new Set<string>('india london america canada dubai australia singapore england britain usa uk delhi mumbai hyderabad bangalore chennai kolkata pune goa kerala'.split(' '))

/* ── intent keywords (first match wins; order = priority) ── */
const INTENTS: [Intent, string[]][] = [
  ['emergency',['emergency','fell','fall','fallen','hospital','not breathing','can’t breathe','cant breathe','chest pain','unconscious','bleeding','ambulance','collapsed','stroke','urgent','danger','faint','fainted','seizure']],
  ['medicine',['medicine','medicin','medcine','medication','meds','pill','tablet','tablets','dose','insulin','bp','blood pressure','sugar','diabetes','diabet','missed','forgot','teesukunnara','dawai','goli']],
  ['documents',['report','document','prescription','blood test','scan','x-ray','xray','lab','result','records','file']],
  ['photos',['photo','photos','picture','pictures','album','image','pics']],
  ['memories',['memory','memories','remember','story','stories','moments','recall']],
  ['visits',['visit','see them','see her','see him','drop by','in person','someone to','company','lonely','alone']],
  ['history',['family history','ancestry','roots','heritage','where we came','family tree']],
  ['care',['guardian','nurse','caregiver','look after','take care','care for','caring']],
  ['wellbeing',['how is','how are','how has','hows','how’s','doing','doin','sleep','slept','sleeping','eat','eating','mood','happy','feeling','health','healthy','well','okay','ok','safe','alright','fine']],
]
const isIntentWord = (w: string): boolean => INTENTS.some(([, kw]) => kw.includes(w))

/* ── what Close Eye will come to hold (shown, never claimed as known) ── */
const ABOUT: Record<Intent, string> = {
  wellbeing:'Wellbeing',medicine:'Medicines',documents:'Records',photos:'Family photos',
  memories:'Family memories',visits:'Time together',history:'Family history',care:'Care',emergency:'Safety',meta:'Family',
}
const DOMAINS: Record<Intent, string[]> = {
  wellbeing:['health','routines','the people who matter'],medicine:['medicines','timing','health'],
  documents:['reports','prescriptions','history'],photos:['photos','faces','moments'],
  memories:['stories','moments','people'],visits:['routines','company','people nearby'],
  history:['people','places','roots'],care:['health','routines','people who matter'],
  emergency:['health','warning signs','who to call'],meta:['health','routines','the people who matter'],
}

const META = [
  /^\s*(hi|hello|hey|hii+)\s*$/i, /who\s+are\s+you/i,
  /is\s+this\s+(a\s+)?(real|bot|human|person|ai)/i, /what\s+is\s+this/i,
  /how\s+does\s+this\s+work/i, /\b(stupid|useless|scam|fake|nonsense|rubbish)\b/i,
]

/* ── relationships, in the order they appear (earliest wins; longer key breaks ties) ── */
function relationships(q: string): string[] {
  const hits: [number, string][] = []
  for (const k of Object.keys(REL)) {
    const m = q.match(new RegExp('\\b' + k + '\\b', 'i'))
    if (m && m.index != null) hits.push([m.index, k])
  }
  hits.sort((a, b) => a[0] - b[0] || b[1].length - a[1].length)
  return hits.map((h) => h[1])
}

/* ── a person's given name — conservative, never a place or filler ── */
function findName(raw: string, relToken: string | null): string | null {
  // 1) a proper noun (capitalised, mid-sentence), not a stop-word / relationship / intent / place
  for (const mt of raw.matchAll(/\b[A-Z][a-z]{1,}\b/g)) {
    const t = mt[0], l = t.toLowerCase()
    if (STOP.has(l) || l in REL || isIntentWord(l) || PLACE.has(l)) continue
    const before = (raw.slice(0, mt.index ?? 0).trim().split(/\s+/).pop() || '')
    if (/^(in|at|from|near|to|around|back|over)$/i.test(before)) continue // a location, not a person
    return t
  }
  // 2) a lowercase name only in the strongest position: right after the relationship word, at the end
  if (relToken) {
    const m = raw.toLowerCase().match(new RegExp('\\b' + relToken + '\\b\\s+([a-z]{2,})\\s*[?.!]?\\s*$'))
    const c = m?.[1]
    if (c && !STOP.has(c) && !(c in REL) && !isIntentWord(c) && !PLACE.has(c)) return cap(c)
  }
  return null
}

function detectIntent(q: string): Intent {
  for (const [k, kw] of INTENTS) if (kw.some((w) => q.includes(w))) return k
  return 'wellbeing'
}

/** Classify a single visitor message into structured understanding. Pure; no I/O. */
export function classify(raw: string): Understanding {
  const text = raw ?? ''
  if (META.some((re) => re.test(text.trim()))) {
    return { meta: true, intent: 'meta', name: null, relToken: null, rel: null, dispRel: null, gender: null, multi: false }
  }
  const q = text.toLowerCase()
  const rels = relationships(q)
  const relToken = rels[0] ?? null
  const name = findName(text, relToken)
  const nameCount = [...text.matchAll(/\b[A-Z][a-z]{1,}\b/g)]
    .filter((m) => { const l = m[0].toLowerCase(); return !STOP.has(l) && !(l in REL) && !isIntentWord(l) && !PLACE.has(l) }).length
  const multi = rels.length > 1 || (/\band\b/i.test(text) && nameCount > 1)
  let gender: Gender | null = relToken ? (REL[relToken] ?? null) : null
  if (!gender) {
    if (/\b(she|her)\b/i.test(q)) gender = 'she'
    else if (/\b(he|him|his)\b/i.test(q)) gender = 'he'
    else if (/\b(they|them)\b/i.test(q)) gender = 'they'
  }
  return {
    meta: false, intent: detectIntent(q), name, relToken,
    rel: canonRel(relToken), dispRel: relToken ? (DISPLAY[relToken] ?? relToken) : null, gender, multi,
  }
}

/** The single, meaningful thing Close Eye still needs — or nothing, in an emergency it already scoped. */
export function followup(u: Understanding): FollowupKind {
  if (u.intent === 'emergency' && u.name) return 'none' // never quiz once we know who is in danger
  if (u.name) return 'detail'
  return 'name' // no name (including emergencies) → we must learn who
}

export const aboutLabel = (u: Understanding): string => ABOUT[u.intent] ?? ABOUT.wellbeing
export const domainsFor = (u: Understanding): string[] => DOMAINS[u.intent] ?? DOMAINS.wellbeing
export const ctaText = (name: string): string => `Create ${name}’s family space`

/** Pull a clean given name out of a short free-text answer ("she's Ramesh" → "Ramesh"). */
export function nameFromAnswer(raw: string): string | null {
  const t = (raw ?? '').trim().replace(/^(she|he|it|her name|his name|name|that)('s| is|s)?\s*/i, '').replace(/[.!,]/g, '')
  const m = t.match(/[A-Za-z]{2,}/)
  return m ? cap(m[0]) : null
}

export const pronoun = {
  subject: (g: Gender | null): string => (g === 'she' ? 'she' : g === 'he' ? 'he' : 'they'),
  object: (g: Gender | null): string => (g === 'she' ? 'her' : g === 'he' ? 'him' : 'them'),
  possessive: (g: Gender | null): string => (g === 'she' ? 'her' : g === 'he' ? 'his' : 'their'),
}
