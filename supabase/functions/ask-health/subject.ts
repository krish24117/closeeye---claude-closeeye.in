// CloseEye Connect · Subject Detection.
//
// Who is the conversation about? Deterministic — relationship words + age cues. Used for
// PERSONALIZATION and SUBJECT-HONEST escalation (a child emergency points to a children's ER,
// not "our care team is coming" — we don't visit children). It NEVER gates safety: the
// universal life-threats fire regardless of subject (intent before age); this only adds
// context. When it can't tell and the topic is high-risk, the caller should ASK, not assume.

export type Subject = 'infant' | 'child' | 'teen' | 'adult' | 'elder' | 'self' | 'unspecified'
export type Confidence = 'high' | 'medium' | 'low'
export interface SubjectResult { subject: Subject; confidence: Confidence; signal: string | null }

function norm(t: string): string {
  return t.toLowerCase().replace(/[’‘‛`´ʼ]/g, "'").replace(/\s+/g, ' ').trim()
}

const ELDER = /\b(mother|father|mom|mum|dad|mummy|daddy|amma|appa|nana|nani|dada|dadi|thatha|paati|ajja|ajji|grandmother|grandfather|grandma|grandpa|granny|grandad|grandparent|elderly|senior citizen)\b/
const INFANT = /\bnewborn\b|\bnew born\b|\binfant\b|\b(my|the|our|a) baby\b/
const CHILD = /\b(my|our|the) (son|daughter|kid|child|boy|girl)\b|\btoddler\b|\bmy little one\b/
const TEEN = /\bteenage(r)?\b|\badolescent\b/
const ADULT = /\b(my|our) (wife|husband|spouse|partner|brother|sister|sibling|friend)\b/
const SELF = /\bmyself\b|\bmy own (health|body)\b|\bi (have|feel|am|got) (a |an )?(chest pain|pain|sick|unwell|fever|headache|dizzy|bleeding|breathless)/

function bandFromYears(n: number): Subject {
  if (n < 2) return 'infant'
  if (n < 13) return 'child'
  if (n < 18) return 'teen'
  if (n < 60) return 'adult'
  return 'elder'
}

/**
 * Detect the subject of a message. Precedence: an explicit age cue (highest confidence),
 * then relationship words, then a first-person self signal, else unspecified.
 */
export function detectSubject(rawText: string): SubjectResult {
  const text = norm(rawText)

  // 1. Age cue — most precise.
  const age = text.match(/(\d+)\s*(year|yr|month|week|day)s?\s*old/)
  if (age) {
    const n = Number(age[1]); const unit = age[2]
    const subject = (unit === 'week' || unit === 'day' || unit === 'month') ? 'infant' : bandFromYears(n)
    return { subject, confidence: 'high', signal: age[0] }
  }

  // 2. Relationship words (specific → general).
  const m = (re: RegExp) => { const x = text.match(re); return x ? x[0] : null }
  const infant = m(INFANT); if (infant) return { subject: 'infant', confidence: 'high', signal: infant }
  const child = m(CHILD);   if (child)  return { subject: 'child', confidence: 'high', signal: child }
  const teen = m(TEEN);     if (teen)   return { subject: 'teen', confidence: 'high', signal: teen }
  const elder = m(ELDER);   if (elder)  return { subject: 'elder', confidence: 'high', signal: elder }
  const adult = m(ADULT);   if (adult)  return { subject: 'adult', confidence: 'medium', signal: adult }
  const self = m(SELF);     if (self)   return { subject: 'self', confidence: 'medium', signal: self }

  return { subject: 'unspecified', confidence: 'low', signal: null }
}

/**
 * Whether the caller should ASK who this is about before proceeding — true only when the
 * subject is unknown AND the situation is high-risk. Never assume a subject on a life-threat.
 */
export function shouldClarifySubject(subject: SubjectResult, isHighRisk: boolean): boolean {
  return isHighRisk && subject.subject === 'unspecified'
}
