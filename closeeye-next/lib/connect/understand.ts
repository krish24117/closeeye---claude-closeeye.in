/**
 * Close Eye Connect — the conversation-understanding engine.
 *
 * Deterministic, on-device, framework-free. It NEVER calls an LLM and NEVER
 * invents anything about a family: not a person, not a relationship, not health,
 * not an emergency, not context. It reads the words a visitor typed, classifies
 * intent, extracts a person / relationship ONLY when the text clearly supports it,
 * and names what it is still missing. When uncertain, it asks — it never assumes.
 *
 * Robust to global input: Indian / American / British / Australian English, ESL
 * and broken English, voice-to-text, typos, emoji, mixed-language, and names from
 * every major region. Ambiguous kinship words that are also given names
 * ("Lola", "Tia", "Nana") are treated as a relationship ONLY when possessive-
 * qualified ("my nana"); otherwise they are a person's name — never invented.
 *
 * Constitution: Family → Retrieve → Reason → Answer. Understanding before answers.
 *
 * Emergencies are NOT decided here. They are decided by the one shared vocabulary in
 * crisis.ts, which ledger.ts asks too — this module used to keep a careful list of its
 * own while the shipped path kept a careless one, and they drifted (audit 2026-07-17).
 */
import { isCrisis } from '@shared/crisis'   // THE canonical floor — shared with Ask Close Eye
import { isNotPersonWord } from './lexicon'

export type Intent =
  | 'wellbeing' | 'medicine' | 'documents' | 'photos' | 'memories'
  | 'visits' | 'history' | 'care' | 'emergency' | 'meta'

export type Gender = 'she' | 'he' | 'they'

export interface Understanding {
  meta: boolean            // greeting / "who are you" / abuse / emoji-only → calm meta lane
  intent: Intent
  name: string | null      // a person's given name, only when clearly present
  relToken: string | null  // the exact word matched ("amma", "dad", "nana")
  rel: string | null       // canonical relationship ("mother", "grandfather")
  dispRel: string | null   // display relationship for the UI
  gender: Gender | null
  multi: boolean           // more than one person mentioned ("Mom and Dad")
}

export type FollowupKind = 'name' | 'detail' | 'none'

const cap = (w: string): string => (w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : w)

/* ── relationship vocabulary, grouped ──
   safe  = unambiguous kinship words (matched anywhere)
   ambig = words that are ALSO common given names (only a relationship when
           possessive-qualified: "my nana"; otherwise a person's name) */
interface RelGroup { canon: string; gender: Gender; safe: string[]; ambig: string[] }
const GROUPS: RelGroup[] = [
  { canon:'mother', gender:'she', safe:['mother','mum','mummy','mommy','ma','amma','ammi','mumma','madre','nanay'], ambig:['mama'] },
  { canon:'father', gender:'he', safe:['father','dad','daddy','pa','appa','abba','bapu','nanna','padre','tatay'], ambig:['papa','baba','abu'] },
  { canon:'grandmother', gender:'she', safe:['grandmother','grandma','granny','nani','dadi','ajji','aaji','nonna'], ambig:['lola','oma','mimi','gigi','teta'] },
  { canon:'grandfather', gender:'he', safe:['grandfather','grandpa','grandad','thatha','ajoba','nonno'], ambig:['nana','dada','opa'] },
  { canon:'daughter', gender:'she', safe:['daughter'], ambig:[] },
  { canon:'son', gender:'he', safe:['son'], ambig:[] },
  { canon:'wife', gender:'she', safe:['wife'], ambig:[] },
  { canon:'husband', gender:'he', safe:['husband'], ambig:[] },
  { canon:'sister', gender:'she', safe:['sister','didi','behn','akka','hermana'], ambig:[] },
  { canon:'brother', gender:'he', safe:['brother','bhai','hermano'], ambig:['anna'] },
  { canon:'aunt', gender:'she', safe:['aunt','auntie','chachi','mausi','pinni'], ambig:['tia','khala'] },
  { canon:'uncle', gender:'he', safe:['uncle','chacha','mamu'], ambig:['tio'] },
  { canon:'grandparents', gender:'they', safe:['grandparents'], ambig:[] },
  { canon:'parents', gender:'they', safe:['parents'], ambig:[] },
]
const SAFE = new Map<string, RelGroup>()
const AMBIG = new Map<string, RelGroup>()
for (const g of GROUPS) { for (const t of g.safe) SAFE.set(t, g); for (const t of g.ambig) AMBIG.set(t, g) }
const POSS = new Set(['my','your','our','his','her','their','the'])

/* ── never a person's name ── */
const STOP = new Set<string>(
  ('how is are am was were did do does can could would will shall has have had the a an and or but ' +
   'my your our their his her its me i im we you he she it they them on in at to for of about with without ' +
   'please hey hi hello ok okay fine good great been being today now just still not na ah lah yaar bhai ' +
   'safe store save send look after someone remember studying elderly autistic lonely properly worried far ' +
   'away us cannot thinking real person this that these those what who where when why which help stupid alright ' +
   'know knows tell told me more so very really much many any some there here ' +
   'only too also kindly again soon back around over well okay fine ' +
   // common sentence-initial verbs / greetings / honorifics — never a person
   'keep hope want wants need needs get got let make made take took give find found welcome dear thanks thank ' +
   'sorry yes maybe hi hiya yo namaste salaam salam salamat kamusta inshallah mashallah hola po ji sir madam doctor ' +
   // common ESL / vernacular fillers and greetings (also seen capitalised)
   'theek thik hai hain kaise kaisi kais ela unnaru unnara teesukunnara dawai li kya acha accha sab down ' +
   'kem cho su che kemon achis bhalo tumi tum aap bien muy mucho ho kamon ' +
   // frequent typo forms of function words
   'hw iz ur pls doin takin medcine mther hws hpe wel').split(/\s+/).filter(Boolean),
)
/* ── places: after a preposition these read as locations, not people ── */
const PLACE = new Set<string>('india london america canada dubai australia singapore england britain usa uk delhi mumbai hyderabad bangalore chennai kolkata pune goa kerala manila lagos nairobi cairo madrid sydney toronto boston chicago texas california ohio york jersey scotland ireland wales'.split(' '))
/* ── destinations: a place you TAKE someone to is never the someone. "Take my father
      hospital" must not read as a person called Hospital — the slot is a class, not a
      word, so clinic / temple / station fail for the same reason and not by luck. ── */
const FACILITY = new Set<string>(('hospital hospitals clinic clinics dispensary pharmacy chemist ward icu casualty hospice nursinghome ' +
  'temple church mosque gurudwara dargah shrine market bazaar shop store mall supermarket ' +
  'station airport railway bus terminal stop depot school college university office bank atm ' +
  'park playground gym salon court lab labs laboratory home house apartment flat society clinic centre center').split(' '))
/* ── calendar words: WHEN something happens, never WHO. "Next week", "on Tuesday" and
      "in June" were all being read as a person's given name. ── */
const CALENDAR = new Set<string>(('today tomorrow yesterday tonight morning afternoon evening night noon midnight ' +
  'monday tuesday wednesday thursday friday saturday sunday ' +
  'january february march april may june july august september october november december ' +
  'jan feb mar apr jun jul aug sep sept oct nov dec ' +
  'next last week weekend month year day days weeks months years date time hour hours minute minutes tmrw tmw').split(' '))
/* A person's name is what is left once every class we can recognise is ruled out. When a
   token belongs to one of those classes we ask who, rather than assume it is a person —
   the engine never invents a family member. */
const notAName = (l: string): boolean =>
  STOP.has(l) || SAFE.has(l) || isIntentWord(l) || PLACE.has(l) || FACILITY.has(l) || CALENDAR.has(l) ||
  isNotPersonWord(l)   // a health term or a document — the vocabulary the engine already has

/* ── intent keywords (first match wins). Emergency cues are deliberately strong,
   so "fell in love" / "missed you" never fabricate a crisis. ── */
const INTENTS: [Intent, string[]][] = [
  ['emergency',['emergency','fell down','fell and','has fallen','had a fall','collapsed','not breathing','can’t breathe','cant breathe','stopped breathing','chest pain','unconscious','unresponsive','heavy bleeding','ambulance','rushed to','admitted to hospital','in the hospital','in hospital','had a stroke','having a stroke','seizure','heart attack','108','emergency ward']],
  ['medicine',['medicine','medicin','medcine','medication','meds','tablet','tablets','pills','insulin','blood pressure','bp tablet','sugar level','diabetes','dose','doses','teesukunnara','dawai','goli','injection','prescription refill']],
  ['documents',['report','reports','document','documents','prescription','blood test','scan','x-ray','xray','lab result','lab results','records','medical file','discharge summary']],
  ['photos',['photo','photos','picture','pictures','album','albums','pics','selfie']],
  ['memories',['memory','memories','remember','story','stories','moments','the old days']],
  ['visits',['visit','visits','see them','see her','see him','drop by','in person','someone to sit','company','feels lonely','is lonely','all alone']],
  ['history',['family history','ancestry','our roots','heritage','where we came from','family tree']],
  ['care',['guardian','nurse','caregiver','look after','take care','care for','caring for','day care','home care']],
  ['wellbeing',['how is','how are','how has','hows','how’s','how’re','doing','doin','sleep','slept','sleeping','eat','eaten','eating','mood','happy','feeling','health','healthy','well','okay','ok','safe','alright','fine','coping','holding up']],
]
const isIntentWord = (w: string): boolean => INTENTS.some(([, kw]) => kw.includes(w))

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
  /^\s*(hi+|hello+|hey+|yo|hiya|namaste|salaam|hola)\b/i, /who\s+are\s+you/i,
  /is\s+this\s+(a\s+)?(real|bot|human|person|ai|robot)/i, /what\s+(is|are)\s+(this|you)/i,
  /how\s+does\s+this\s+work/i, /\b(stupid|useless|scam|fake|nonsense|rubbish|waste)\b/i,
]

const wordBefore = (raw: string, index: number): string =>
  (raw.slice(0, index).trim().split(/\s+/).pop() || '').toLowerCase()

/* ── relationships in order of appearance (earliest wins) ── */
function relationships(text: string): { token: string; group: RelGroup }[] {
  const q = text.toLowerCase()
  const hits: { i: number; token: string; group: RelGroup }[] = []
  for (const [token, group] of SAFE) {
    const m = q.match(new RegExp('\\b' + token + '\\b'))
    if (m && m.index != null) hits.push({ i: m.index, token, group })
  }
  for (const [token, group] of AMBIG) {
    const re = new RegExp('\\b' + token + '\\b', 'g'); let m: RegExpExecArray | null
    while ((m = re.exec(q))) { if (POSS.has(wordBefore(text, m.index))) { hits.push({ i: m.index, token, group }); break } }
  }
  hits.sort((a, b) => a.i - b.i || b.token.length - a.token.length)
  return hits.map((h) => ({ token: h.token, group: h.group }))
}

/* ── a person's given name — conservative; never a place, filler, or a possessive-qualified kinship word ── */
function findName(raw: string, relToken: string | null): string | null {
  for (const mt of raw.matchAll(/\b[A-Z][a-z]{1,}\b/g)) {
    const t = mt[0], l = t.toLowerCase()
    if (notAName(l)) continue
    const before = wordBefore(raw, mt.index ?? 0)
    if (/^(in|at|from|near|to|around|back|over)$/.test(before)) continue   // a location, not a person
    if (AMBIG.has(l) && POSS.has(before)) continue                          // used as a relationship
    return t
  }
  // a lowercase name only in the strongest position: right after the relationship word, at the end
  if (relToken) {
    const m = raw.toLowerCase().match(new RegExp('\\b' + relToken + '\\b\\s+([a-z]{2,})\\s*[?.!]?\\s*$'))
    const c = m?.[1]
    if (c && !notAName(c) && !AMBIG.has(c)) return cap(c)
  }
  return null
}

function detectIntent(q: string): Intent {
  // The crisis question is asked once, from the shared vocabulary, before any topic — so
  // this module and ledger.ts can never again disagree about what an emergency is. The
  // 'emergency' row in INTENTS is kept only as name-slot vocabulary (see isIntentWord):
  // it must never decide the intent, or the drift is back.
  if (isCrisis(q)) return 'emergency'
  for (const [k, kw] of INTENTS) if (k !== 'emergency' && kw.some((w) => q.includes(w))) return k
  return 'wellbeing'
}

/** Classify a single visitor message into structured understanding. Pure; no I/O. */
export function classify(raw: string): Understanding {
  const text = raw ?? ''
  const noneMeta: Understanding = { meta: true, intent: 'meta', name: null, relToken: null, rel: null, dispRel: null, gender: null, multi: false }
  if (!/[a-z]/i.test(text)) return noneMeta                       // emoji-only / punctuation-only
  if (META.some((re) => re.test(text.trim()))) return noneMeta
  const q = text.toLowerCase()
  const rels = relationships(text)
  const first = rels[0] ?? null
  const relToken = first?.token ?? null
  const name = findName(text, relToken)
  const nameCount = [...text.matchAll(/\b[A-Z][a-z]{1,}\b/g)]
    .filter((m) => { const l = m[0].toLowerCase(); return !STOP.has(l) && !SAFE.has(l) && !isIntentWord(l) && !PLACE.has(l) && !(AMBIG.has(l) && POSS.has(wordBefore(text, m.index ?? 0))) }).length
  const multi = rels.length > 1 || (/\band\b/i.test(text) && nameCount > 1)
  let gender: Gender | null = first ? first.group.gender : null
  if (!gender) {
    if (/\b(she|her)\b/i.test(q)) gender = 'she'
    else if (/\b(he|him|his)\b/i.test(q)) gender = 'he'
    else if (/\b(they|them)\b/i.test(q)) gender = 'they'
  }
  return {
    meta: false, intent: detectIntent(q), name, relToken,
    rel: first ? first.group.canon : null, dispRel: first ? first.group.canon : null, gender, multi,
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
