// B2 regression — a failed Health-Profile load must never open the editable
// form, so a save can never overwrite the loved one's saved allergies /
// medications with blanks.
//
// Run: node --test tests/elder-profile-form.test.ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { healthFormPhase } from '../closeeye-next/lib/db/elder-profile-form.ts'

test('the B2 invariant — a load error is ALWAYS an error state, never the editable form', () => {
  // `ready` is the only phase that shows the form + Save button. A load error
  // must never resolve to `ready`, whatever else is true.
  assert.equal(healthFormPhase({ loadError: true, memberResolved: true, formLoaded: true }), 'error')
  assert.equal(healthFormPhase({ loadError: true, memberResolved: true, formLoaded: false }), 'error')
  assert.equal(healthFormPhase({ loadError: true, memberResolved: false, formLoaded: false }), 'error')
})

test('loading while the member or the profile is still resolving', () => {
  assert.equal(healthFormPhase({ loadError: false, memberResolved: false, formLoaded: false }), 'loading')
  assert.equal(healthFormPhase({ loadError: false, memberResolved: true, formLoaded: false }), 'loading')
  assert.equal(healthFormPhase({ loadError: false, memberResolved: false, formLoaded: true }), 'loading')
})

test('ready only with no error AND both the member and a loaded profile present', () => {
  // A loved one with no profile yet still loads successfully (an empty but
  // legitimately editable form) → ready. That path is unaffected by the fix.
  assert.equal(healthFormPhase({ loadError: false, memberResolved: true, formLoaded: true }), 'ready')
})
