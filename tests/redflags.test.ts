// B4 regression — the emergency red-flag floor must catch "not breathing".
// This is the test that did not exist: the old suite only sent "collapsed and is
// not breathing", which passed on "collapsed" and masked that the standalone
// breathing phrase had zero coverage.
//
// Run: node --test tests/redflags.test.ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { detectRedFlag } from '../supabase/functions/ask-health/redflags.ts'

const hit = (msg) => {
  const r = detectRedFlag(msg)
  assert.equal(r.matched, true, `expected a red flag for: "${msg}"`)
  return r
}
const miss = (msg) => assert.equal(detectRedFlag(msg).matched, false, `expected NO red flag for: "${msg}"`)

test('the B4 bug — absent/stopped breathing now escalates (was a silent miss)', () => {
  for (const msg of [
    'he is not breathing',
    'she stopped breathing',
    "he isn't breathing",
    'not breathing',
    'my father is not breathing',
    "she's not breathing",
    'he has stopped breathing',
    "he won't breathe",
    'she is no longer breathing',
    'he is barely breathing',
  ]) {
    assert.equal(hit(msg).category, 'breathing', `wrong category for: "${msg}"`)
  }
})

test('existing emergencies still fire (no regression)', () => {
  assert.equal(hit('dad has chest pain').category, 'cardiac')
  assert.equal(hit("she can't breathe").category, 'breathing')
  assert.equal(hit('she is gasping for air').category, 'breathing')
  assert.equal(hit('he is short of breath').category, 'breathing')
  assert.equal(hit('grandma collapsed on the floor').category, 'consciousness')
  // the masking case the old test relied on still works too
  assert.equal(hit('he collapsed and is not breathing').matched, true)
})

test('benign "breathing" talk does NOT false-positive', () => {
  miss('her breathing is normal today')
  miss('we did some breathing exercises this morning')
  miss('she is breathing comfortably and resting well')
  miss('how is her appetite today')
  miss('what time should the guardian arrive')
})

test('audit gaps closed — stroke, falls, serious bleeding now escalate', () => {
  assert.equal(hit('I think he is having a stroke').category, 'stroke')
  assert.equal(hit('she had a stroke this morning').category, 'stroke')
  assert.equal(hit('grandma had a fall').category, 'fall_injury')
  assert.equal(hit('he fell down in the bathroom').category, 'fall_injury')
  assert.equal(hit('she took a bad fall').category, 'fall_injury')
  assert.equal(hit('he slipped on the floor').category, 'fall_injury')
  assert.equal(hit('he is still bleeding').category, 'bleeding')
  assert.equal(hit('there is bleeding from his head').category, 'bleeding')
})

test('bare falls do NOT false-positive on benign phrases', () => {
  miss('he fell asleep in his chair')
  miss('she fell ill last week but is fine now')
  miss('they fell in love many years ago')
  miss('the temperature fell overnight')
})

// Phase 6 — Life-Threatening Red Flags: the universal + infant additions.
test('Phase 6 — poisoning / foreign body fires', () => {
  assert.equal(hit('my toddler swallowed a button battery').category, 'poisoning')
  assert.equal(hit('he drank kerosene').category, 'poisoning')
  assert.equal(hit('a coin is stuck in her throat').category, 'poisoning')
  assert.equal(hit('the baby swallowed a magnet').category, 'poisoning')
})

test('Phase 6 — burns / drowning fire', () => {
  assert.equal(hit('she has a deep burn on her hand').category, 'burns')
  assert.equal(hit('it was an electrical burn').category, 'burns')
  assert.equal(hit('we pulled him out of the pool and he isnt responding').matched, true)
  assert.equal(hit('my son nearly drowned').category, 'drowning')
})

test('Phase 6 — infant-critical fires (subject-dependent) and rash', () => {
  assert.equal(hit('my 2 month old has a fever of 39').category, 'infant_critical')
  assert.equal(hit('my newborn is burning up').category, 'infant_critical')
  assert.equal(hit('the baby is floppy and wont wake').matched, true)
  assert.equal(hit('a rash that doesnt fade when I press a glass on it').category, 'meningitis_rash')
})

test('Phase 6 — infant fever does NOT fire for an adult, and calm baby talk stays benign', () => {
  miss('my father has a mild fever and is resting comfortably')   // adult fever ≠ infant emergency
  miss('my baby has a mild cold and is eating well')
  miss('my baby has been crying for two hours, how can I calm her') // the trust case — must stay benign
  miss('my baby wont settle at night')
  miss('we had swimming lessons at the pool today')
})
