/**
 * The understanding regression suite — it only GROWS.
 *
 * cases.json is seeded with the gate cases and extended from real, admin-flagged
 * failures (npm run sync:understanding pulls reviewed rows from understanding_log).
 * Every case pins what the deterministic engine must understand for a real input.
 * A newly-added case that fails is a real failure to fix — never delete a case.
 *
 * THE FIX RULE (enforced here):
 *   Failures are fixed by GENERALIZING A SLOT — a subject (person / family / self),
 *   a need, a situation, an agreement rule — never by adding a special case. A fix
 *   that only handles the exact sentence that failed is rejected. So every failure
 *   added here ships with ≥1 PARAPHRASE SIBLING (different city / verb / wording):
 *   if the fix overfit the one sentence, a sibling breaks and the suite catches it.
 */
import { describe, it, expect } from 'vitest'
import { readLedger } from './ledger'
import cases from './cases.json'

interface Case {
  text: string
  subjectKnown?: boolean
  subjectKind?: 'person' | 'family' | 'self' | null
  need?: string
  forLoved?: boolean
  name?: string | null   // the person's given name — null asserts we did NOT invent one
  note?: string
}

describe('understanding regression cases (grows from real flagged failures)', () => {
  for (const c of cases as Case[]) {
    const label = `${c.note ? c.note + ' — ' : ''}${JSON.stringify(c.text).slice(0, 64)}`
    it(label, () => {
      const rl = readLedger(c.text)
      if (c.subjectKnown !== undefined) expect(rl.subjectKnown).toBe(c.subjectKnown)
      if (c.subjectKind !== undefined) expect(rl.subjectKind).toBe(c.subjectKind)
      if (c.need !== undefined) expect(rl.need).toBe(c.need)
      if (c.forLoved !== undefined) expect(rl.forLoved).toBe(c.forLoved)
      if (c.name !== undefined) expect(rl.name).toBe(c.name)
    })
  }
})
