// B3 regression — feedback is shaped correctly and an empty form is not
// submittable. (The behavioural fix — only showing success on a real write —
// lives in submitFeedback/feedback page; these guard the data contract.)
//
// Run: node --test tests/feedback-shape.test.ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isSubmittableFeedback, buildFeedbackRow } from '../closeeye-next/lib/db/feedback-shape.ts'

test('isSubmittableFeedback: needs at least a rating, a score, or a note', () => {
  assert.equal(isSubmittableFeedback({ rating: 0, nps: null, category: 'x', kind: 'praise', message: '   ' }), false)
  assert.equal(isSubmittableFeedback({ rating: 4, nps: null, category: 'x', kind: 'praise', message: '' }), true)
  assert.equal(isSubmittableFeedback({ rating: 0, nps: 9, category: 'x', kind: 'praise', message: '' }), true)
  assert.equal(isSubmittableFeedback({ rating: 0, nps: null, category: 'x', kind: 'bug', message: 'broken' }), true)
})

test('buildFeedbackRow: shapes the row, trims the note, keeps a signed-in user id', () => {
  const row = buildFeedbackRow(
    { rating: 5, nps: 10, category: 'A visit', kind: 'praise', message: '  lovely visit  ' },
    'user-123',
  )
  assert.deepEqual(row, {
    user_id: 'user-123',
    rating: 5,
    nps: 10,
    category: 'A visit',
    kind: 'praise',
    message: 'lovely visit',
  })
})

test('buildFeedbackRow: rating 0 + empty message become null; anonymous user id is null', () => {
  const row = buildFeedbackRow(
    { rating: 0, nps: 8, category: '   ', kind: 'idea', message: '' },
    null,
  )
  assert.deepEqual(row, { user_id: null, rating: null, nps: 8, category: null, kind: 'idea', message: null })
})
