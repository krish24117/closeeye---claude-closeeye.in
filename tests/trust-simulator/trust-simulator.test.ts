// CloseEye Connect — Trust Simulator · harness (Phase 4).
//
// Run: node --test tests/trust-simulator/trust-simulator.test.ts
//
// What runs TODAY: the deterministic red-flag dimension, against the CURRENT engine
// (detectRedFlag). This is honest TDD — the suite EXISTS before the Safety Engine, and its
// gaps are the Phase-6 worklist. What is PENDING: Subject Detection (Phase 6 module) and the
// Trust-Score judge + human sample (Phase 6+). Nothing is faked green.
//
// The build stays green by asserting only the REGRESSION invariants (no benign false
// positive; proven universal emergencies keep firing). The GATE STATUS line reports honestly
// whether the full safety gate is met — it is NOT, until Phase 6 lands the Life-Threatening
// Red Flags module. Trust is the release gate.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { detectRedFlag } from '../../supabase/functions/ask-health/redflags.ts'
import { SCENARIOS } from './scenarios.ts'

const strip = (s) => s.replace(/^\[[A-Z_]+\]\s*/, '')
const UTTERANCE = new Set(['medical', 'safeguarding', 'context', 'onboarding', 'platform-failure'])

test('Trust Simulator — deterministic safety report (honest gate status)', () => {
  const caught = [], gap = [], falsePos = []
  let emergencies = 0, benign = 0

  for (const sc of SCENARIOS) {
    if (!UTTERANCE.has(sc.category)) continue
    if (sc.expect.redFlag === undefined) continue
    const fired = detectRedFlag(strip(sc.input)).matched
    if (sc.expect.redFlag) {
      emergencies++
      ;(fired ? caught : gap).push(`${sc.id}  "${sc.input}"`)
    } else {
      benign++
      if (fired) falsePos.push(`${sc.id}  "${sc.input}"`)
    }
  }

  const behavioural = SCENARIOS.filter((s) => s.category === 'operational-failure').length
  const pct = emergencies ? Math.round((caught.length / emergencies) * 100) : 0

  console.log(`
╔══════════════════════════════════════════════════════════════════╗
║  CloseEye Trust Simulator — Tier-A baseline (Phase 4)              ║
╠══════════════════════════════════════════════════════════════════╣
║  Scenarios ............ ${String(SCENARIOS.length).padStart(3)}  (curated base; scales 100→500→1000
║                              via the variation generator)
║  Emergency utterances . ${String(emergencies).padStart(3)}
║    caught by current engine . ${String(caught.length).padStart(3)}  (${pct}%)
║    PHASE-6 GAP .............. ${String(gap.length).padStart(3)}  ← must reach 0 to ship
║  Benign utterances .... ${String(benign).padStart(3)}   false positives: ${falsePos.length}
║  Behavioural (op-failure) . ${String(behavioural).padStart(3)}  (graceful-degradation, Phase 6)
╠══════════════════════════════════════════════════════════════════╣
║  DIMENSIONS PENDING PHASE 6:                                       ║
║    · Subject Detection ....... module not built (0% coverage)      ║
║    · Trust Score ............. judge + human sample (needs live LLM)║
╠══════════════════════════════════════════════════════════════════╣
║  GATE STATUS: ${gap.length === 0 && falsePos.length === 0 ? 'safety-deterministic MET ✓         ' : 'NOT MET — Phase 6 required        '}          ║
╚══════════════════════════════════════════════════════════════════╝`)

  if (gap.length) {
    console.log('\nPHASE-6 WORKLIST — emergencies the current engine does NOT yet catch:')
    for (const g of gap) console.log('  ✗ ' + g)
  }
  if (falsePos.length) {
    console.log('\nFALSE POSITIVES (must be zero):')
    for (const f of falsePos) console.log('  ! ' + f)
  }

  // REGRESSION GATE #1 — the deterministic engine must never over-fire on a calm question.
  assert.equal(falsePos.length, 0, `Benign scenarios false-positived:\n${falsePos.join('\n')}`)
})

test('regression — proven universal emergencies keep firing (locks prior fixes)', () => {
  // These phrases are already proven in tests/redflags.test.ts; the Trust Simulator locks
  // them so a future change can never silently regress a life-threat we already catch.
  const mustFire = ['MED-INF-01', 'MED-CHI-06', 'MED-ELD-11', 'MED-ELD-12', 'MED-ELD-13', 'MED-ELD-14', 'CAP-01', 'INF-02', 'INF-04']
  for (const id of mustFire) {
    const sc = SCENARIOS.find((s) => s.id === id)
    assert.ok(sc, `scenario ${id} exists`)
    assert.equal(detectRedFlag(strip(sc.input)).matched, true, `regression: ${id} "${sc.input}" must fire a red flag`)
  }
})

test('every scenario is well-formed (schema guard for the growing suite)', () => {
  const ids = new Set()
  for (const sc of SCENARIOS) {
    assert.ok(sc.id && !ids.has(sc.id), `duplicate or missing id: ${sc.id}`)
    ids.add(sc.id)
    assert.ok(sc.input && sc.input.trim().length > 0, `${sc.id}: empty input`)
    assert.ok(sc.trust && sc.trust.note, `${sc.id}: every scenario needs a Trust-Score note`)
    assert.ok(sc.expect, `${sc.id}: missing expect block`)
  }
})
