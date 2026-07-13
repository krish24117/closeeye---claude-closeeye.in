// CloseEye Subject Detection. Run: node --test tests/subject-detection.test.ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { detectSubject, shouldClarifySubject } from '../supabase/functions/ask-health/subject.ts'

const S = (t) => detectSubject(t).subject

test('age cues win and map to the right band', () => {
  assert.equal(S('my 2 month old has a fever'), 'infant')
  assert.equal(S('she is 3 weeks old'), 'infant')
  assert.equal(S('my 6 year old has a cold'), 'child')
  assert.equal(S('he is 15 years old'), 'teen')
  assert.equal(S('my 40 year old brother'), 'adult')
  assert.equal(S('she is 72 years old'), 'elder')
})

test('relationship words', () => {
  assert.equal(S('my baby wont settle'), 'infant')
  assert.equal(S('my son swallowed something'), 'child')
  assert.equal(S('my father is having chest pain'), 'elder')
  assert.equal(S('amma is unwell'), 'elder')
  assert.equal(S('my wife is pregnant'), 'adult')
})

test('self and unspecified', () => {
  assert.equal(S('I have chest pain'), 'self')
  assert.equal(S('what activities are good for wellbeing'), 'unspecified')
})

test('clarify only when unknown AND high-risk', () => {
  assert.equal(shouldClarifySubject(detectSubject('someone is not breathing'), true), true)
  assert.equal(shouldClarifySubject(detectSubject('my father collapsed'), true), false) // known subject
  assert.equal(shouldClarifySubject(detectSubject('what foods are healthy'), false), false)
})
