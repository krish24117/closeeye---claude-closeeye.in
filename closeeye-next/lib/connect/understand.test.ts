/**
 * PERMANENT REGRESSION SUITE — replays 10,000 realistic first-time conversations
 * through the Connect engine on every run.
 *
 * The hard gate is SAFETY, not accuracy. The engine must NEVER invent:
 *   • a person        (a name when none was typed)
 *   • a relationship  (a relationship when none was implied)
 *   • an emergency    (a crisis the words don't signal)
 *   • health / context(any asserted fact)
 * …and must always ASK when uncertain (never assume) and never dead-end.
 *
 * Accuracy (intent / name / relationship recall) is reported and held above a
 * benchmark, but under-detection is safe: when unsure the engine asks.
 */
import { describe, it, expect } from 'vitest'
import { buildCorpus, type Case } from './understand.corpus'
import { classify, followup, aboutLabel, ctaText, nameFromAnswer, pronoun } from './understand'

const CORPUS = buildCorpus(10000)

const isSimple = (s: string) => { const w = s.replace(/[—–:]/g, ' ').split(/\s+/).filter(Boolean); return w.length <= 14 && s.length <= 100 }
const ROBOTIC = /\b(error|invalid|null|undefined|detected|processing|query|parameter|exception|fallback)\b/i
const FABRICATION = /\b(is fine|doing well|is well|is healthy|took|has taken|slept well|blood pressure is|sugar is|feeling better|is stable|is okay now|recovered)\b/i

interface Result { intent: string; name: string | null; rel: string | null; askedForName: boolean; reachedCTA: boolean; ctaText: string | null; deadEnd: boolean; lines: string[] }

function simulate(kase: Case): Result {
  const lines: string[] = []
  const say = (s?: string | null) => { if (s) lines.push(s) }
  const u = classify(kase.text)
  const res: Result = { intent: u.intent, name: u.name, rel: u.rel, askedForName: false, reachedCTA: false, ctaText: null, deadEnd: false, lines }

  if (u.meta) {
    say('I’m Close Eye. I come to know the people you love.')
    say('Who would you like me to look after?')
    res.askedForName = true
    const nm = nameFromAnswer(kase.answerName)
    if (nm) { say(`Getting to know ${nm}…`); const c = ctaText(nm); say(c); res.reachedCTA = true; res.ctaText = c; res.name = nm } else res.deadEnd = true
    return res
  }

  if (u.name) say(`Person: ${u.name}`)
  if (u.dispRel) say(`Relationship: ${u.dispRel}`)
  say(`About: ${aboutLabel(u)}`)
  say(`Still learning: ${u.name ? `I don’t know ${u.name} yet` : `${pronoun.possessive(u.gender)} name`}`)

  const kind = followup(u)
  if (kind === 'detail') say(u.name ? `How old is ${u.name}?` : 'How old are they?')
  else if (kind === 'name') { say(u.dispRel ? `What’s ${pronoun.possessive(u.gender)} name?` : 'Their name?'); res.askedForName = true }

  let name = u.name
  if (kind === 'name') name = nameFromAnswer(kase.answerName)
  if (!name) { res.deadEnd = true; return res }
  say(`Getting to know ${name}…`)
  say(`Close Eye doesn’t know ${pronoun.object(u.gender)} yet.`)
  const c = ctaText(name); say(c)
  res.reachedCTA = true; res.ctaText = c; res.name = name
  return res
}

interface Fail { id: number; style: string; text: string; why: string }
const eq = (a: string | null, b: string | null) => !!a && !!b && a.toLowerCase() === b.toLowerCase()

function runAll() {
  const st = {
    invParson: 0, invRel: 0, invEmergency: 0, fabrication: 0, robotic: 0, notSimple: 0, repeats: 0, deadEnd: 0, ctaUnpersonalized: 0,
    intentOK: 0, intentTot: 0, nameOK: 0, nameTot: 0, relOK: 0, relTot: 0, emgOK: 0, emgTot: 0, ctaReached: 0, askedWhenNoName: 0, noNameCases: 0,
  }
  const hard: Fail[] = []
  const add = (k: Case, why: string) => { if (hard.length < 4000) hard.push({ id: k.id, style: k.style, text: k.text, why }) }

  for (const k of CORPUS) {
    const u = classify(k.text)
    const r = simulate(k)

    // ── HARD never-invent gates ──
    if (!k.meta && !k.truthName && u.name) { st.invParson++; add(k, `invented person "${u.name}"`) }
    if (!k.meta && k.truthName && u.name && !eq(u.name, k.truthName)) { st.invParson++; add(k, `wrong person "${u.name}" (meant ${k.truthName})`) }
    if (!k.meta && !k.truthRel && u.rel) { st.invRel++; add(k, `invented relationship "${u.rel}"`) }
    if (!k.meta && k.truthRel && u.rel && u.rel !== k.truthRel) { st.invRel++; add(k, `wrong relationship "${u.rel}" (meant ${k.truthRel})`) }
    if (u.intent === 'emergency' && k.truthIntent !== 'emergency') { st.invEmergency++; add(k, `invented emergency`) }
    for (const l of r.lines) { if (FABRICATION.test(l)) { st.fabrication++; add(k, `fabricated "${l}"`) } }
    for (const l of r.lines) { if (ROBOTIC.test(l)) { st.robotic++; add(k, `robotic "${l}"`) } }
    for (const l of r.lines) { if (!isSimple(l)) { st.notSimple++; add(k, `not-simple "${l}"`) } }
    const seen = new Set<string>(); for (const l of r.lines) { if (seen.has(l)) { st.repeats++; add(k, `repeat "${l}"`) } seen.add(l) }
    if (r.deadEnd) { st.deadEnd++; add(k, 'DEAD-END') }
    if (r.reachedCTA && (!r.name || !r.ctaText!.includes(r.name))) { st.ctaUnpersonalized++; add(k, `CTA not personalized`) }

    // ── when-uncertain-ask ──
    if (!k.meta && !u.name) { st.noNameCases++; if (r.askedForName) st.askedWhenNoName++; else if (u.intent !== 'emergency') add(k, 'did not ask for a name when it had none') }

    // ── accuracy (soft) ──
    if (!k.meta && !k.trap) { st.intentTot++; if (u.intent === k.truthIntent) st.intentOK++ }
    if (k.truthName) { st.nameTot++; if (eq(u.name, k.truthName)) st.nameOK++ }
    if (k.truthRel) { st.relTot++; if (u.rel === k.truthRel) st.relOK++ }
    if (k.truthIntent === 'emergency') { st.emgTot++; if (u.intent === 'emergency') st.emgOK++ }
    if (r.reachedCTA) st.ctaReached++
  }
  return { st, hard }
}

const { st, hard } = runAll()
const invented = st.invParson + st.invRel + st.invEmergency + st.fabrication
const pc = (a: number, b: number) => (b ? ((100 * a) / b).toFixed(2) + '%' : '—')
const summary = [
  `n=${CORPUS.length}`,
  `INVENT person=${st.invParson} rel=${st.invRel} emergency=${st.invEmergency} fabrication=${st.fabrication}`,
  `dead-end=${st.deadEnd} repeats=${st.repeats} robotic=${st.robotic} not-simple=${st.notSimple} cta-unpersonalized=${st.ctaUnpersonalized}`,
  `intent=${pc(st.intentOK, st.intentTot)} name=${pc(st.nameOK, st.nameTot)} rel=${pc(st.relOK, st.relTot)} emergency-recall=${pc(st.emgOK, st.emgTot)}`,
  `registration=${pc(st.ctaReached, CORPUS.length)} ask-when-no-name=${pc(st.askedWhenNoName, st.noNameCases)}`,
].join('\n')
// eslint-disable-next-line no-console
console.log('\n── 10,000-conversation validation ──\n' + summary + (hard.length ? `\nfirst failures:\n` + hard.slice(0, 20).map((f) => `  #${f.id} [${f.style}] "${f.text}" → ${f.why}`).join('\n') : '') + '\n')

describe('Connect engine — 10,000-conversation production readiness', () => {
  it('never invents a person', () => { expect(st.invParson, hard.filter(h => /person/.test(h.why)).slice(0,10).map(h=>`${h.text} → ${h.why}`).join('\n')).toBe(0) })
  it('never invents a relationship', () => { expect(st.invRel, hard.filter(h => /relationship/.test(h.why)).slice(0,10).map(h=>`${h.text} → ${h.why}`).join('\n')).toBe(0) })
  it('never invents an emergency', () => { expect(st.invEmergency, hard.filter(h => /emergency/.test(h.why)).slice(0,10).map(h=>`${h.text} → ${h.why}`).join('\n')).toBe(0) })
  it('never fabricates health or context', () => { expect(st.fabrication).toBe(0) })
  it('never dead-ends', () => { expect(st.deadEnd).toBe(0) })
  it('never repeats a line within a conversation', () => { expect(st.repeats).toBe(0) })
  it('stays simple and human (never robotic)', () => { expect(st.robotic + st.notSimple).toBe(0) })
  it('always asks for a name when it has none (never assumes)', () => { expect(st.askedWhenNoName).toBe(st.noNameCases) })
  it('reaches a personalized registration CTA in ≥95% of conversations', () => { expect(st.ctaReached / CORPUS.length).toBeGreaterThanOrEqual(0.95) })
  it('classifies intent ≥90%', () => { expect(st.intentOK / st.intentTot).toBeGreaterThanOrEqual(0.9) })
  it('extracts the person ≥85% (when recoverable)', () => { expect(st.nameOK / st.nameTot).toBeGreaterThanOrEqual(0.85) })
  it('detects relationship ≥90%', () => { expect(st.relOK / st.relTot).toBeGreaterThanOrEqual(0.9) })
})
