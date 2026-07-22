import { describe, it, expect } from 'vitest'
import { isCrisis } from '@shared/crisis'

/**
 * THE CRISIS FLOOR — gated in the app's own suite so it runs on every deploy.
 *
 * The canonical suite (supabase/functions/_shared/crisis.test.ts) lives outside the closeeye-next
 * project root and so was never part of the app's vitest gate. This mirrors its load-bearing recall
 * + precision contract against the SAME shared floor the app imports (@shared/crisis · isCrisis),
 * and EXTENDS it with the Life-Safety Validation Sprint (2026-07-20): broad natural-language coverage
 * of how real families phrase an emergency — not simple keyword matching.
 *
 * If this goes red: the floor is shared with Ask Close Eye. Fix the floor, not the test. A missed
 * emergency is the worst possible failure; a false alarm only offers help that wasn't needed.
 */

// ── Every one of these MUST fire. Grouped by how a real family would phrase the emergency. ──
const MUST_FIRE = [
  // Unconsciousness / not waking — incl. the NEGATED-CONTRACTION forms that used to slip through.
  'my mother isn’t waking up', 'she won’t wake up', 'he is not waking up', 'I can’t wake her up',
  'she wasn’t waking up', 'he hasn’t woken up', 'amma is not waking',
  'she is unconscious', 'he collapsed', 'she keeled over', 'he is out cold', 'she fainted',
  'he passed out', 'she blacked out', 'he is unresponsive', 'she is not responsive',
  'he is not responding', 'she isn’t responding', 'he is not moving', 'she went limp',
  'he is having a seizure', 'she had a fit', 'he is convulsing', 'she is foaming at the mouth',
  // Cardiac — arrest / absent pulse were the critical gap.
  'severe chest pain', 'he has chest pain', 'crushing pain in his chest', 'he is having a heart attack',
  'he is in cardiac arrest', 'her heart stopped', 'his heart has stopped beating',
  'there is no pulse', 'she has no pulse', 'I can’t find her pulse', 'I cannot feel a pulse',
  // Breathing.
  'she is not breathing', 'he stopped breathing', 'she can’t breathe', 'he isn’t breathing',
  'she has a breathing problem', 'he is choking', 'her lips are turning blue', 'he is going blue',
  // Stroke.
  'I think he is having a stroke', 'her face is drooping', 'he is slurring his words',
  'her speech is slurred and her face is drooping',
  // Bleeding / trauma.
  'she is bleeding heavily', 'he is bleeding out', 'blood is coming from her head', 'he is vomiting blood',
  'my father had a bad fall', 'she fell down the stairs',
  // Someone already escalated, or plain distress.
  'we called an ambulance', 'something is very wrong with amma', 'I need urgent help',
]

// ── A crisis word in an innocent frame MUST NOT fire — precision protects trust. ──
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
  // New precision guards for the Life-Safety additions:
  'his heart finally stopped racing when he sat down', // "stopped racing" must not read as arrest
  'she is feeling blue today',                          // sadness idiom, not cyanosis
  'my father is a nurse and works the night shift',     // occupational frame
]

describe('crisis floor · recall — every emergency phrasing must fire', () => {
  it.each(MUST_FIRE)('fires on: %s', (msg) => {
    expect(isCrisis(msg)).toBe(true)
  })
})

describe('crisis floor · precision — innocent frames must stay calm', () => {
  it.each(MUST_NOT_FIRE)('stays calm on: %s', (msg) => {
    expect(isCrisis(msg)).toBe(false)
  })
})

// NOTE (open crisis-floor items for medical-team review): bare "won't respond" / "doesn't respond"
// are intentionally NOT added (ambiguous — "not responding to treatment", "won't respond to texts");
// the clear unconsciousness forms above cover the real cases. Extend STRONG only, never WEAK.
