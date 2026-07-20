import { describe, it, expect } from 'vitest'
import { isCrisis } from '@shared/crisis'

/**
 * THE CRISIS FLOOR — gated in the app's own suite so it runs on every deploy.
 *
 * The canonical suite (supabase/functions/_shared/crisis.test.ts) lives outside the closeeye-next
 * project root and so was never part of the app's vitest gate. This mirrors its load-bearing recall
 * contract against the SAME shared floor the app imports (@shared/crisis · isCrisis), so a regression
 * that would let an emergency slip through — or fire on an innocent phrase — fails the deployment.
 *
 * If this goes red: the floor is shared with Ask Close Eye. Fix the floor, not the test.
 */

// Every one of these MUST be detected as a crisis — a missed emergency is the worst possible failure.
const MUST_FIRE = [
  'amma fell in the bathroom', 'she is unresponsive', 'not waking up', 'she is not waking up',
  'breathing problem', 'she has breathing problem', 'blood coming from her head',
  'she cannot breath', 'appa is not talking and not moving', 'my father is having fits',
  'she fainted', 'he is choking', 'severe chest pain', 'my mother had a fall',
  'she is bleeding heavily', 'amma collapsed', 'father unconscious',
  'she is very weak and cannot get up', 'he is not responding to me',
  'my father is vomiting blood', 'amma is having a fit', 'her lips are turning blue',
  'he cant breath properly', 'my mother fell from the stairs', 'she is having trouble breathing',
  // the iPhone apostrophe — a real family types "can’t", not "can't"
  'she can’t breathe',
]
// NOTE (crisis-floor finding, out of Phase-4 scope): "my mother isn’t waking up" (contracted
// negation) does NOT currently fire, though "not waking up" does. Flagged for medical-team review —
// not asserted here, because the crisis floor is locked business logic and must not be widened in a
// gate without that review.

// A crisis word in an innocent frame is NOT a crisis — a false alarm erodes trust and cries wolf.
const MUST_NOT_FIRE = [
  'my parents fell in love in Delhi', 'my father fell asleep on the sofa',
  'she is dying to see her grandchildren', 'my father is a doctor in the ICU',
  'my mother works at the hospital', 'my father is in the hospital business',
  'we have accident insurance for my father', 'my father had a stroke of luck',
  'critical thinking classes for my mother', 'my mother is very serious about her yoga',
  'emergency contact is my brother', 'I want to add emergency contact details',
  'my mother is critical of my cooking', 'my father fell behind on his bills',
  'my sister is a nurse in the emergency ward', 'my father volunteers at the hospital',
  'my mother is dying her hair', 'we had a minor accident with the car insurance paperwork',
]

describe('crisis floor · recall (every emergency must fire)', () => {
  it.each(MUST_FIRE)('fires on: %s', (msg) => {
    expect(isCrisis(msg)).toBe(true)
  })
})

describe('crisis floor · precision (innocent frames must not fire)', () => {
  it.each(MUST_NOT_FIRE)('stays calm on: %s', (msg) => {
    expect(isCrisis(msg)).toBe(false)
  })
})
