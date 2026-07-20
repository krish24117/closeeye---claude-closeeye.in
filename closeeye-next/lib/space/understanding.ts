/**
 * Family Page v2 — the deterministic derivations behind "the mind of Close Eye".
 *
 * This is the page's Decision Engine v1 (Constitution Article I). It turns the Family
 * Graph — stated facts, still-open blanks, the situation, coverage — into: a Snapshot
 * (how he is), Recommendations (what should happen next), and organised Understanding
 * (what Close Eye knows). Pure; no I/O; every output is derived, never asserted.
 *
 * ─── THE HONESTY GUARANTEE (Constitution: never assume; peace of mind must be earned) ─
 * The Snapshot NEVER claims a person is "calm/safe" without a real positive signal — a
 * completed visit, or an observed entry. A family we have known for seven minutes reads
 * "still getting to know him", never a green "Safe". False calm is the one thing a trust
 * platform cannot ship, and deriveSnapshot() is where that line is held.
 */
import type { LedgerLine, Blank } from '@/lib/connect/ledger'

/* ── inputs (slices of SpaceData; primitives so this is trivially testable) ── */
export interface Subject { name: string; relationship: string | null; city: string | null }
export interface UnderstandingInput {
  subject: Subject
  gender: 'she' | 'he' | 'they' | null
  known: LedgerLine[]     // stated facts
  learned: LedgerLine[]   // facts the family added later
  blanks: Blank[]         // still-open prompts
  observedCount: number   // guardian/visit observations — the only basis for "calm"
}

const they = (g: UnderstandingInput['gender']) => (g === 'she' ? 'her' : g === 'he' ? 'him' : 'them')
const subj = (g: UnderstandingInput['gender']) => (g === 'she' ? 'she' : g === 'he' ? 'he' : 'they')
const allFacts = (i: UnderstandingInput) => [...i.known, ...i.learned]
const factText = (i: UnderstandingInput) => allFacts(i).map((f) => `${f.label} ${f.body}`).join(' · ').toLowerCase()
const hasBlank = (i: UnderstandingInput, re: RegExp) => i.blanks.some((b) => re.test(b.text.toLowerCase()))

const RELOCATING = /mov(e|ing)|reloc|shift/i
const NEEDS_REACH = /reach .*(20|twenty) min|who can reach/i
const NEEDS_HEALTH = /health|manages day to day|medic/i

/* ════════ 1 · SNAPSHOT — how he is (derived, never asserted) ════════ */
export type SnapState = 'action' | 'attention' | 'learning' | 'settled' | 'calm'
export interface SnapCell { k: string; v: string; dim?: boolean }
export interface Snapshot { state: SnapState; headline: string; sub: string; cells: SnapCell[] }

export function deriveSnapshot(i: UnderstandingInput, recs: Recommendation[]): Snapshot {
  const him = they(i.gender)
  const criticalCount = recs.filter((r) => r.critical).length
  const relocating = RELOCATING.test(factText(i))
  const positiveSignal = i.observedCount > 0 // the ONLY basis for claiming calm

  let state: SnapState, headline: string, sub: string
  if (criticalCount > 0) {
    state = 'action'
    headline = criticalCount === 1 ? 'One detail to add' : `${criticalCount} details to add`
    sub = `Add ${criticalCount === 1 ? 'it' : 'them'} so Close Eye can look out for ${him}.`
  } else if (i.blanks.length > 0) {
    state = 'learning'
    headline = `Getting to know your ${i.subject.relationship ?? 'family'}`
    sub = `Add what you know — it all helps Close Eye look out for ${him}.`
  } else if (!positiveSignal) {
    // Everything essential is known and nothing is pending — but no ONE has been to see
    // him, so we do NOT claim he is well. Honest: nothing needs you; not "he is safe".
    state = 'settled'
    headline = 'Nothing needs you right now'
    sub = `Close Eye understands ${him}, and is ready the moment ${subj(i.gender)} needs someone.`
  } else {
    state = 'calm'
    headline = `All calm — ${subj(i.gender)} is doing well`
    sub = `From the last time a trusted person was with ${him}.`
  }

  const situation = relocating ? 'Relocating' : (findFact(i, /what.?s happening/i)?.body ?? null)
  const cells: SnapCell[] = [
    { k: 'Where', v: i.subject.city ?? 'not yet known', dim: !i.subject.city },
    { k: 'Situation', v: situation ?? 'not yet known', dim: !situation },
    { k: 'Someone nearby', v: hasBlank(i, NEEDS_REACH) ? 'not yet known' : (findFact(i, /reach/i)?.body ?? 'noted'), dim: hasBlank(i, NEEDS_REACH) },
  ]
  return { state, headline, sub, cells }
}

/* ════════ 2 · RECOMMENDATIONS — what should happen next (from gaps + situation) ════════ */
export interface Recommendation { id: string; why: string; text: string; action: 'book' | 'add'; tone: 'primary' | 'soft'; critical: boolean }

export function deriveRecommendations(i: UnderstandingInput): Recommendation[] {
  const out: Recommendation[] = []
  const him = they(i.gender)
  const relocating = RELOCATING.test(factText(i))

  // A move is a concrete, bookable errand — the primary next action.
  if (relocating) {
    const where = i.subject.city ? ` to ${i.subject.city}` : ''
    out.push({ id: 'move', why: `${subj(i.gender).toUpperCase()}'S MOVING`, text: `Book moving assistance${where}`, action: 'book', tone: 'primary', critical: false })
  }
  // CRITICAL — safety-relevant gaps. These are what drive the Snapshot to "action".
  if (hasBlank(i, NEEDS_REACH)) {
    out.push({ id: 'reach', why: `SO SOMEONE’S NEARBY`, text: `Add someone who’s close by in an emergency`, action: 'add', tone: 'soft', critical: true })
  }
  if (hasBlank(i, NEEDS_HEALTH)) {
    out.push({ id: 'health', why: 'FOR SAFETY', text: `Add ${him === 'them' ? 'their' : him === 'her' ? 'her' : 'his'} health conditions`, action: 'add', tone: 'soft', critical: true })
  }
  return out
}

/* ════════ 3 · UNDERSTANDING — organised into a mental model, not a table ════════ */
export type Category = 'Identity' | 'Current situation' | 'Health' | 'Daily routine' | 'Support network' | 'Preferences' | 'Relationships'
const CATEGORY_ORDER: Category[] = ['Identity', 'Current situation', 'Health', 'Daily routine', 'Support network', 'Relationships', 'Preferences']

/** Which section a label belongs to — keyword, deterministic. */
export function categoryOf(label: string): Category {
  const l = label.toLowerCase()
  if (/health|medic|manages day/.test(l)) return 'Health'
  if (/morning|routine|shape of .*day|day to day/.test(l)) return 'Daily routine'
  if (/reach|contact|nearby|who can|support/.test(l)) return 'Support network'
  if (/happening|words|when.*where|needed|move|reloc|situation/.test(l)) return 'Current situation'
  if (/love|prefer|enjoy|interest|likes|food/.test(l)) return /love/.test(l) ? 'Identity' : 'Preferences'
  if (/mother|father|son|daughter|wife|husband|sister|brother|family|relationship/.test(l)) return 'Relationships'
  return 'Identity' // someone you love, what you call, age → identity by default
}

export interface UFact { kind: 'fact'; body: string; provenance: 'stated' | 'inferred' }
export interface UBlank { kind: 'blank'; text: string; key: string }
export type UItem = UFact | UBlank
export interface USection { category: Category; items: UItem[]; knownCount: number; learningCount: number }

export function groupUnderstanding(i: UnderstandingInput): USection[] {
  const map = new Map<Category, UItem[]>()
  const push = (c: Category, item: UItem) => { if (!map.has(c)) map.set(c, []); map.get(c)!.push(item) }

  for (const f of allFacts(i)) {
    // "In your words" is the raw quote — kept out of the model; it's the source, not a fact.
    if (f.quote) continue
    push(categoryOf(f.label), { kind: 'fact', body: f.body, provenance: f.inferred ? 'inferred' : 'stated' })
  }
  for (const b of i.blanks) push(categoryOf(b.text), { kind: 'blank', text: b.text, key: b.key })

  return CATEGORY_ORDER
    .filter((c) => map.has(c))
    .map((c) => {
      const items = map.get(c)!
      return { category: c, items, knownCount: items.filter((x) => x.kind === 'fact').length, learningCount: items.filter((x) => x.kind === 'blank').length }
    })
}

/* ════════ 4 · ASK SUGGESTIONS — conversational, evolving from context ════════ */
export function askSuggestions(i: UnderstandingInput): string[] {
  const out: string[] = []
  const rel = i.subject.relationship ?? 'family'
  const first = rel.charAt(0).toUpperCase() + rel.slice(1)
  if (RELOCATING.test(factText(i))) out.push(`How can I help ${first === 'Father' ? 'Dad' : first === 'Mother' ? 'Mum' : first} move?`)
  if (i.blanks.length > 0) out.push(`What's still missing?`)
  out.push(`Is there anything urgent?`)
  return out.slice(0, 3)
}

/* ── helpers ── */
function findFact(i: UnderstandingInput, re: RegExp): LedgerLine | undefined {
  return allFacts(i).find((f) => re.test(f.label.toLowerCase()) || re.test(f.body.toLowerCase()))
}
