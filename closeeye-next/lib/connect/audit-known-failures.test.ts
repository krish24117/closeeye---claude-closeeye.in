/**
 * PINNED AUDIT FAILURES — Connect understanding engine, audit of 2026-07-17.
 *
 * Every entry is a REAL failure, proven against the shipped engine, pinned with the
 * CORRECT expectation — not the broken behaviour. Nothing here is fixed yet: the audit
 * was requested as an audit, and the fixes await the founder's direction.
 *
 * HOW THIS FILE WORKS — read before touching it.
 *   Each case runs under `it.fails`, which passes ONLY while the assertion still throws.
 *   So today the suite is green and these are visibly quarantined. The moment someone
 *   generalizes a slot and the engine gets one right, THAT case turns red with
 *   "expected test to fail" — forcing whoever fixed it to move the case into cases.json
 *   as a permanent regression test. A fix cannot land silently, and a finding cannot be
 *   quietly forgotten. This file only ever shrinks.
 *
 * WHAT IS NOT HERE: category 2 (invented facts) and category 5 (silent wrong-fills)
 * produced zero failures across the probes — the never-invent guarantees held.
 *
 * `kind` records the honest verdict on each:
 *   slot-generalization — fixable under the standing rule (broaden a slot, never a
 *                         special case). 41 of 47.
 *   genuine-ambiguity   — a human reading the same sentence could not be sure either.
 *                         6 of 47, all brands/services in a name position.
 */
import { describe, it, expect } from 'vitest'
import { readLedger } from './ledger'
import { classify } from './understand'
import findings from './audit-known-failures.json'

interface Finding {
  category: string
  text: string
  assert: 'name' | 'need-is' | 'need-is-not'
  want: string | null
  observedOnAudit: string
  kind: string
  note: string
}

const CATEGORY: Record<string, string> = {
  C1: 'WRONG WHO — a noun became a person you love',
  C3: 'MISSED EMERGENCY — real urgency that never fired',
  C4: 'FALSE EMERGENCY — a calm message that triggered urgent/108',
}

describe('PINNED audit failures (2026-07-17) — each turns RED when fixed; move it to cases.json then', () => {
  for (const f of findings as Finding[]) {
    const label = `${CATEGORY[f.category] ?? f.category} [${f.kind}] — ${JSON.stringify(f.text)}`
    it.fails(label, () => {
      if (f.assert === 'name') {
        expect(classify(f.text).name).toBe(f.want)          // want: null — never a person
      } else if (f.assert === 'need-is') {
        expect(readLedger(f.text).need).toBe(f.want)        // want: 'emergency' — must fire
      } else {
        expect(readLedger(f.text).need).not.toBe(f.want)    // want: 'emergency' — must NOT fire
      }
    })
  }
})
