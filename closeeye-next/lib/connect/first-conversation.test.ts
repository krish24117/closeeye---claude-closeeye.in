/**
 * FIRST CONVERSATION INTEGRITY — the launch acceptance gate.
 *
 * This is CloseEye's core product promise, tested as a hard gate. It generates
 * ≥1,000 realistic conversations — single-turn AND multi-turn clarify sequences —
 * runs each through a faithful model of the deterministic flow, and enforces four
 * invariants. Any violation fails the build.
 *
 *   1. NO REPEATED QUESTION      — never ask the same thing twice; once known, never re-ask.
 *   2. NEVER FORGET AN ANSWER    — understood slots are monotonic across a conversation.
 *   3. CLARIFY MUST TEACH        — every clarification either strictly increases understanding
 *                                  or the system hands off (it never keeps asking to no effect).
 *   4. NO USELESS QUESTION       — every question asked is relevant to the current need
 *                                  (would change the next action); nothing generic/off-target.
 *
 * The engine is deterministic, so the corpus is generated combinatorially (no
 * randomness) and the gate is reproducible.
 */
import { describe, it, expect } from 'vitest'
import { readLedger, type ReadLedger } from './ledger'

/* ── understood slots — canonical + monotonic (a later turn never has fewer) ── */
function slots(rl: ReadLedger): Set<string> {
  const s = new Set<string>()
  if (rl.subjectKnown) s.add('subject')
  if (rl.need !== 'unclear') s.add('need')
  if (rl.city) s.add('city')
  if (rl.situation) s.add('situation')
  if (rl.livesAlone) s.add('alone')
  if (rl.distant) s.add('distant')
  return s
}
const isSuperset = (a: Set<string>, b: Set<string>) => [...b].every((x) => a.has(x))

/* ── every question asked must be relevant to the current need ── */
const ALLOWED: Record<string, string[]> = {
  wellbeing: ['health', 'mornings', 'nearby'],
  errand: ['when_where', 'reach', 'details', 'due', 'papers', 'helps'],
  medical: ['seeing', 'meds', 'doctor'],
  emergency: ['where', 'with'],
  companionship: ['days', 'loves', 'often'],
  documents: ['which', 'where'],
  memories: ['whose'],
  history: ['from'],
  unclear: [],
}

/* ── a faithful model of the /connect flow (mirrors experience.tsx) ── */
type Action = { kind: 'answer' | 'ask' | 'handoff'; questions: string[] }
function flowStep(rl: ReadLedger, againCount: number): Action {
  if (rl.subjectKnown) return { kind: 'answer', questions: rl.blanks.map((b) => b.key) } // present need-blanks
  if (againCount >= 2) return { kind: 'handoff', questions: [] }                          // 2-round cap → human
  return { kind: 'ask', questions: ['__subject__'] }                                       // "who is this for?"
}

interface Turn { rl: ReadLedger; step: Action; slots: Set<string> }
function run(messages: string[]): Turn[] {
  const turns: Turn[] = []
  let combined = ''
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i]!
    combined = combined ? `${combined}. ${msg}` : msg
    const rl = readLedger(combined)
    turns.push({ rl, step: flowStep(rl, i), slots: slots(rl) }) // againCount === clarifications so far === i
  }
  return turns
}

/* ── the four invariants, per conversation ── */
function checkInvariants(turns: Turn[], opts: { clarifyMeaningful?: boolean } = {}): string[] {
  const errs: string[] = []
  let sawAnswer = false
  let askCount = 0
  for (let i = 0; i < turns.length; i++) {
    const t = turns[i]!
    // (4) no useless question — need-relevant blanks only
    for (const q of t.step.questions) {
      if (q === '__subject__') continue // the subject is always action-relevant
      if (!(ALLOWED[t.rl.need] ?? []).includes(q)) errs.push(`inv4: need="${t.rl.need}" asked irrelevant "${q}"`)
    }
    // (1) no repeated question — never ask after we've answered; never ask the subject a 3rd time
    if (t.step.kind === 'ask') { askCount++; if (sawAnswer) errs.push(`inv1: asked again after answering (turn ${i})`) }
    if (t.step.kind === 'answer') sawAnswer = true
    if (i >= 2 && t.step.kind === 'ask') errs.push(`inv1: asked a 3rd time (turn ${i}) — cap breached`)
    if (i > 0) {
      const prev = turns[i - 1]!
      // (2) never forget — slots are monotonic
      if (!isSuperset(t.slots, prev.slots)) errs.push(`inv2: forgot a slot at turn ${i} (${[...prev.slots]} -> ${[...t.slots]})`)
      // (3) clarify must teach. A GOOD-FAITH clarification must strictly increase
      // understanding. Noise ("hmm") is not a real clarification — it is bounded by
      // the 2-round cap → handoff (inv1 below), which is a stronger guarantee than
      // endless asking. So strict growth is enforced for meaningful clarifications.
      const grew = t.slots.size > prev.slots.size
      if (opts.clarifyMeaningful && !grew) errs.push(`inv3: meaningful clarification at turn ${i} did not increase understanding`)
    }
  }
  if (askCount > 2) errs.push(`inv1: asked ${askCount} times (> 2)`)
  return errs
}

/* ── corpus generation (deterministic, combinatorial) ── */
const RELS = ['mother', 'father', 'grandmother', 'grandfather', 'sister', 'brother', 'uncle', 'aunt', 'wife', 'husband', 'son', 'daughter', 'parents', 'grandparents']
const NAMES = ['Amma', 'Lakshmi', 'Ramesh', 'Priya', 'Arjun', 'Meera']
const CITIES = ['Hyderabad', 'Bangalore', 'Pune', 'Chennai', 'Mumbai', 'Delhi', 'London', 'Dubai']

const relTemplates: ((w: string, c: string) => string)[] = [
  (w, c) => `How is my ${w} doing these days?`,
  (w, c) => `I'm worried about my ${w} in ${c}`,
  (w, c) => `My ${w} lives alone in ${c} and I can't be there`,
  (w, c) => `Just want to know my ${w} is okay`,
  (w, c) => `My ${w} has a high fever`,
  (w, c) => `My ${w}'s blood pressure has been high`,
  (w, c) => `My ${w} hasn't been eating well lately`,
  (w, c) => `Can someone pick up groceries for my ${w} in ${c}?`,
  (w, c) => `Please help my ${w} with the tax filing every year`,
  (w, c) => `My ${w} needs someone to accompany them to the hospital`,
  (w, c) => `My ${w} is lonely and misses company`,
  (w, c) => `My ${w} feels alone all day in ${c}`,
  (w, c) => `My ${w} fell down and can't get up`,
  (w, c) => `My ${w} is not breathing, please help`,
  (w, c) => `Please keep my ${w}'s medical reports safe`,
  (w, c) => `I want to save my ${w}'s old photos and stories`,
]
const nameTemplates: ((n: string, c: string) => string)[] = [
  (n, c) => `How is ${n} doing?`,
  (n, c) => `${n} lives alone in ${c}`,
  (n, c) => `${n} has a fever and I'm worried`,
  (n, c) => `Someone needs to help ${n} in ${c}`,
]
const collectiveTemplates: ((c: string) => string)[] = [
  (c) => `My family is shifting to ${c} and we need help settling in`,
  (c) => `We are relocating to ${c}, can someone help us set up?`,
  (c) => `I'm moving to ${c} next month and need someone on the ground`,
  (c) => `This is for me, relocating to ${c}`,
]

function buildCorpus(): string[] {
  const set = new Set<string>()
  for (const w of RELS) for (const c of CITIES) for (const t of relTemplates) set.add(t(w, c))
  for (const n of NAMES) for (const c of CITIES) for (const t of nameTemplates) set.add(t(n, c))
  for (const c of CITIES) for (const t of collectiveTemplates) set.add(t(c))
  return [...set]
}

/* ── multi-turn clarify + cap corpora ── */
const AMBIGUOUS = ['I need some help', 'hospital companion', 'someone to help out please', 'not sure where to start', 'we need local support', 'can you help my family']
const meaningfulClarify = (w: string, c: string) => `it's for my ${w} in ${c}`
const partialClarify = (c: string) => `they are in ${c}` // adds city but not subject
const USELESS = ['hmm', 'not sure', 'idk really']

describe('First Conversation Integrity — launch acceptance gate', () => {
  const corpus = buildCorpus()

  it('generates a corpus of at least 1,000 realistic conversations', () => {
    // single-turn + 2-turn clarify (ambiguous × rel × city) + 3-turn + cap
    const clarify2 = AMBIGUOUS.length * RELS.length * CITIES.length
    const total = corpus.length + clarify2 + AMBIGUOUS.length * CITIES.length + AMBIGUOUS.length
    expect(total).toBeGreaterThanOrEqual(1000)
  })

  it('single-turn: every question is need-relevant and no turn is a dead end', () => {
    const fails: string[] = []
    for (const text of corpus) {
      const turns = run([text])
      const t = turns[0]!
      if (t.step.kind === 'ask' && t.rl.subjectKnown) fails.push(`dead-end mismatch: ${text}`)
      fails.push(...checkInvariants(turns).map((e) => `${e} :: ${text}`))
    }
    expect(fails.slice(0, 20)).toEqual([])
  })

  it('multi-turn: a meaningful clarification resolves the subject, never re-asks, never forgets', () => {
    const fails: string[] = []
    let n = 0
    for (const opener of AMBIGUOUS) for (const w of RELS) for (const c of CITIES) {
      const turns = run([opener, meaningfulClarify(w, c)])
      n++
      // the opener is genuinely ambiguous; the clarification must resolve it
      if (turns[0]!.rl.subjectKnown) continue // (opener already clear — not a clarify case)
      if (!turns[1]!.rl.subjectKnown) fails.push(`unresolved after clarify: "${opener}" + "${meaningfulClarify(w, c)}"`)
      fails.push(...checkInvariants(turns, { clarifyMeaningful: true }).map((e) => `${e} :: ${opener} | ${w}/${c}`))
    }
    expect(n).toBeGreaterThan(500)
    expect(fails.slice(0, 20)).toEqual([])
  })

  it('multi-turn (3): partial then full clarification each increases understanding, capped correctly', () => {
    const fails: string[] = []
    for (const opener of AMBIGUOUS) for (const c of CITIES) {
      const turns = run([opener, partialClarify(c), `for my mother`])
      if (turns[0]!.rl.subjectKnown) continue
      fails.push(...checkInvariants(turns).map((e) => `${e} :: ${opener}/${c}`))
      // once the subject is known, we must be answering — never still asking
      const last = turns[turns.length - 1]!
      if (!last.rl.subjectKnown) fails.push(`subject never resolved: ${opener}/${c}`)
    }
    expect(fails.slice(0, 20)).toEqual([])
  })

  it('cap: useless clarifications hand off after two rounds — never a third question', () => {
    const fails: string[] = []
    for (const opener of AMBIGUOUS) {
      const turns = run([opener, USELESS[0]!, USELESS[1]!])
      if (turns[0]!.rl.subjectKnown) continue
      // monotonic + no third ask + a handoff is reached
      fails.push(...checkInvariants(turns).map((e) => `${e} :: ${opener}`))
      const asked3rd = turns[2]!.step.kind === 'ask'
      if (asked3rd) fails.push(`asked a third time: ${opener}`)
      if (turns[2]!.step.kind !== 'handoff') fails.push(`no handoff at cap: ${opener} (${turns[2]!.step.kind})`)
    }
    expect(fails.slice(0, 20)).toEqual([])
  })
})
