/**
 * PINNED AUDIT FAILURES — Connect understanding engine, audit of 2026-07-17.
 *
 * The audit found 47. Forty-one were slot generalizations and are FIXED — 29 by the
 * shared crisis vocabulary (crisis.ts), 12 by the shared lexicon (lexicon.ts) — and each
 * now lives in cases.json as a permanent regression test.
 *
 * SIX REMAIN, and they are not bugs waiting to be fixed. They are the honest edge of what
 * a deterministic engine can know:
 *
 *   "my father Uber"  ·  "call Ola for my mother"  ·  "my mother Whatsapp is not working"
 *   "my father Zomato order"  ·  "my mother Netflix subscription"  ·  "my father Airtel recharge"
 *
 * A brand in a name position is structurally identical to a person in a name position —
 * "call Ola for my mother" and "call Ravi for my mother" are the same sentence. Proper
 * nouns are unbounded, so no enumerable class separates them, and a brand blocklist is
 * precisely the special case the engine rule forbids. Left unfixed by founder decision.
 *
 * VERIFIED BEHAVIOUR (2026-07-17): these do NOT route to the ask flow — they FILL, with
 * subjectKnown=true and the brand as the subject. The engine treats them exactly as it
 * treats a real name, because it cannot tell the difference. The mitigation that exists
 * is the ledger's own "Did I get this right? / Not quite" affordance: a wrong name is one
 * tap from correction. Making ambiguity ask instead of fill would need a positive name
 * gazetteer or a confirm step — a product decision, not a correctness fix.
 *
 * HOW THIS FILE WORKS — read before touching it.
 *   Each case runs under `it.fails`, which passes ONLY while the assertion still throws.
 *   So the suite is green and these are visibly quarantined. The moment someone makes the
 *   engine get one right, THAT case turns red with "expected test to fail" — forcing it
 *   into cases.json as a permanent regression test. A fix cannot land silently, and a
 *   finding cannot be quietly forgotten. This file only ever shrinks. It has gone 47 -> 6.
 *
 * WHAT WAS NEVER HERE: category 2 (invented facts) and category 5 (silent wrong-fills)
 * produced zero failures across the probes — the never-invent guarantees held.
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
