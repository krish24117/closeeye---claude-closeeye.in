/**
 * Track 2, Step 1 — the pinned regression cases. The Understanding Constitution's founding case
 * and its siblings, as executable spec. Step 2's comprehension core runs the model against these
 * and the eval (checkCase) blocks the merge if any fabricates. In Step 1 they define the target
 * and prove the eval catches the exact screenshot bug.
 */
import type { Understanding } from './comprehension'

export interface CaseExpectation {
  /** subject.who must be a PERSON — never one of these places/things (the exact bug). */
  subjectNotOneOf?: string[]
  /** typed locations that must be extracted (travel ≠ residence). */
  locations?: Partial<Understanding['locations']>
  /** no need was stated → need must be none_stated/unknown, not invented. */
  needMustBeUnstated?: boolean
  /** ambiguous input → a clarifying_question is required (ask, never assume). */
  mustAsk?: boolean
}

export interface ComprehensionCase {
  name: string
  input: string
  expect: CaseExpectation
}

export const COMPREHENSION_CASES: ComprehensionCase[] = [
  {
    name: 'founding — travelling between two cities',
    input: 'My mother is travelling from Hyderabad to Bangalore',
    expect: {
      subjectNotOneOf: ['hyderabad', 'bangalore'], // the screenshot bug: a city in the person slot
      locations: { from: 'hyderabad', to: 'bangalore' },
      needMustBeUnstated: true, // she is travelling; no help was requested
    },
  },
  {
    name: 'sibling — relocation (moving, not visiting)',
    input: 'We are shifting my father to Chennai next month',
    expect: { subjectNotOneOf: ['chennai'], locations: { to: 'chennai' } },
  },
  {
    name: 'sibling — an insurance task (a thing, not a person)',
    input: "I need to renew my mother's health insurance",
    expect: { subjectNotOneOf: ['insurance', 'health'] },
  },
  {
    name: 'ambiguous — one word, must ask',
    input: 'Amma',
    expect: { mustAsk: true },
  },
]

const norm = (s: string) => s.trim().toLowerCase()

/**
 * The eval: does this understanding satisfy the case's spec? Returns the failures (empty = pass).
 * This is what runs on the model's output in the regression suite (Step 2); it catches the
 * semantic errors the structural net cannot — above all, a place named as a person.
 */
export function checkCase(u: Understanding, c: ComprehensionCase): string[] {
  const fails: string[] = []
  const who = norm(u.subject.who)

  for (const bad of c.expect.subjectNotOneOf ?? []) {
    if (who === norm(bad) || who.includes(norm(bad))) {
      fails.push(`subject.who "${u.subject.who}" is a place/thing, not the person`)
    }
  }
  if (c.expect.locations?.from && norm(u.locations.from ?? '') !== norm(c.expect.locations.from)) {
    fails.push(`locations.from expected "${c.expect.locations.from}", got "${u.locations.from ?? '—'}"`)
  }
  if (c.expect.locations?.to && norm(u.locations.to ?? '') !== norm(c.expect.locations.to)) {
    fails.push(`locations.to expected "${c.expect.locations.to}", got "${u.locations.to ?? '—'}"`)
  }
  if (c.expect.needMustBeUnstated && !['none_stated', 'unknown', ''].includes(norm(u.need))) {
    fails.push(`need "${u.need}" was invented — nothing was requested`)
  }
  if (c.expect.mustAsk && !u.clarifying_question) {
    fails.push('ambiguous input but no clarifying_question — must ask')
  }
  return fails
}
