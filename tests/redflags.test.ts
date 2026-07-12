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
