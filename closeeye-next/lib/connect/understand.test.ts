/**
 * PERMANENT REGRESSION SUITE — replays all 1,000 first-time conversations
 * through the Connect engine on every run. If any previously-correct
 * conversation breaks, the failing case is printed with expected-vs-actual.
 *
 * Exit gate (must hold forever):
 *   • zero fabricated facts and zero invented names (Constitution)
 *   • zero dead-end conversations
 *   • registration reached with a personalized CTA in ≥ 90% of conversations
 *   • zero repeated responses within a conversation
 *   • intent / name / relationship accuracy at their locked benchmark
 */
import { describe, it, expect } from 'vitest'
import { buildCorpus, type Case } from './understand.corpus'
import { classify, followup, aboutLabel, ctaText, nameFromAnswer, pronoun } from './understand'

const CORPUS = buildCorpus(1000)

// tone / safety guards
const isSimple = (s: string) => { const w = s.replace(/[—–:]/g, ' ').split(/\s+/).filter(Boolean); return w.length <= 12 && s.length <= 90 }
const ROBOTIC = /\b(error|invalid|null|undefined|detected|processing|query|parameter|exception|fallback)\b/i
const FABRICATION = /\b(is fine|doing well|is well|is healthy|took|has taken|slept well|blood pressure is|sugar is|feeling better|is stable|is okay now|recovered)\b/i

interface Result {
  intent: string; name: string | null; rel: string | null
  reachedCTA: boolean; ctaText: string | null; deadEnd: boolean
  metaHandled: boolean; lines: string[]
}

/** Simulate the full two-turn conversation exactly as the UI drives the engine. */
function simulate(kase: Case): Result {
  const lines: string[] = []
  const say = (s: string | null | undefined) => { if (s) lines.push(s) }
  const u = classify(kase.text)
  const res: Result = {
    intent: u.intent, name: u.name, rel: u.rel, reachedCTA: false,
    ctaText: null, deadEnd: false, metaHandled: false, lines,
  }

  if (u.meta) {
    say('I’m Close Eye. I come to know the people you love.')
    say('Who would you like me to look after?')
    res.metaHandled = true
    const nm = nameFromAnswer(kase.answerName)
    if (nm) { say(`Getting to know ${nm}…`); const c = ctaText(nm); say(c); res.reachedCTA = true; res.ctaText = c; res.name = nm }
    else res.deadEnd = true
    return res
  }

  if (u.name) say(`Person: ${u.name}`)
  if (u.dispRel) say(`Relationship: ${u.dispRel}`)
  say(`About: ${aboutLabel(u)}`)
  say(`Still learning: ${u.name ? `I don’t know ${u.name} yet` : `${pronoun.possessive(u.gender)} name`}`)

  const kind = followup(u)
  if (kind === 'detail') say(u.name ? `How old is ${u.name}?` : 'How old are they?')
  else if (kind === 'name') say(u.dispRel ? `What’s ${pronoun.possessive(u.gender)} name?` : 'Their name?')

  let name = u.name
  if (kind === 'name') name = nameFromAnswer(kase.answerName)
  if (!name) { res.deadEnd = true; return res }

  say(`Getting to know ${name}…`)
  say(`Close Eye doesn’t know ${pronoun.object(u.gender)} yet.`)
  const c = ctaText(name)
  say(c)
  res.reachedCTA = true; res.ctaText = c; res.name = name
  return res
}

interface Fail { id: number; cat: string; text: string; why: string }
function runAll() {
  const stat = { n: CORPUS.length, intentOK: 0, intentTot: 0, nameOK: 0, nameTot: 0, relOK: 0, relTot: 0,
    reachedCTA: 0, deadEnd: 0, ctaPersonalized: 0, repeats: 0, notSimple: 0, robotic: 0, fabrication: 0, invented: 0 }
  const failures: Fail[] = []
  const add = (k: Case, why: string) => failures.push({ id: k.id, cat: k.cat, text: k.text, why })

  for (const k of CORPUS) {
    const r = simulate(k)
    // accuracy (only where a ground-truth label exists)
    if (!k.meta) { stat.intentTot++; if (r.intent === k.xIntent) stat.intentOK++; else add(k, `intent want ${k.xIntent} got ${r.intent}`) }
    else if (r.intent !== 'meta') add(k, `expected meta, got ${r.intent}`)
    if (k.xName) { stat.nameTot++; if (r.name && r.name.toLowerCase() === k.xName.toLowerCase()) stat.nameOK++; else add(k, `name want ${k.xName} got ${r.name ?? '—'}`) }
    if (!k.xName && !k.meta && !k.multi && classify(k.text).name) { stat.invented++; add(k, `invented name ${classify(k.text).name}`) }
    if (k.xRel) { stat.relTot++; if (r.rel === k.xRel) stat.relOK++; else add(k, `relationship want ${k.xRel} got ${r.rel ?? '—'}`) }
    // safety + tone
    for (const l of r.lines) if (FABRICATION.test(l)) { stat.fabrication++; add(k, `FABRICATION "${l}"`) }
    for (const l of r.lines) if (ROBOTIC.test(l)) { stat.robotic++; add(k, `robotic "${l}"`) }
    for (const l of r.lines) if (!isSimple(l)) { stat.notSimple++; add(k, `not-simple "${l}"`) }
    const seen = new Set<string>(); for (const l of r.lines) { if (seen.has(l)) { stat.repeats++; add(k, `repeat "${l}"`) } seen.add(l) }
    // completion
    if (r.reachedCTA) stat.reachedCTA++
    if (r.deadEnd) { stat.deadEnd++; add(k, 'DEAD-END: no personalized CTA') }
    if (r.reachedCTA && r.name && r.ctaText!.includes(r.name)) stat.ctaPersonalized++
    else if (r.reachedCTA) add(k, `CTA not personalized: ${r.ctaText}`)
  }
  return { stat, failures }
}

const { stat, failures } = runAll()
const preview = failures.slice(0, 15).map((f) => `#${f.id} [${f.cat}] "${f.text}" → ${f.why}`).join('\n')

describe('Connect understanding engine — 1,000-conversation regression', () => {
  it('has zero failing conversations (the whole corpus)', () => {
    expect(failures.length, `\n${failures.length} failing conversations:\n${preview}`).toBe(0)
  })
  it('never fabricates a fact (Constitution)', () => { expect(stat.fabrication).toBe(0) })
  it('never invents a person’s name (Constitution)', () => { expect(stat.invented).toBe(0) })
  it('has zero dead-end conversations', () => { expect(stat.deadEnd).toBe(0) })
  it('never repeats a response within a conversation', () => { expect(stat.repeats).toBe(0) })
  it('keeps every line simple and human (never robotic)', () => { expect(stat.notSimple + stat.robotic).toBe(0) })
  it('reaches a personalized registration CTA in ≥90% of conversations', () => {
    expect(stat.ctaPersonalized / stat.n).toBeGreaterThanOrEqual(0.9)
  })
  it('classifies intent at the locked benchmark', () => { expect(stat.intentOK / stat.intentTot).toBeGreaterThanOrEqual(0.98) })
  it('extracts the person at the locked benchmark', () => { expect(stat.nameOK / stat.nameTot).toBeGreaterThanOrEqual(0.98) })
  it('detects relationship at the locked benchmark', () => { expect(stat.relOK / stat.relTot).toBeGreaterThanOrEqual(0.98) })
})
