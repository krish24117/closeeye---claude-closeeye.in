/**
 * THE CRISIS FLOOR — the gate for BOTH surfaces.
 *
 * Ask Close Eye had ZERO automated tests until 2026-07-17. It is the surface that gives
 * medical guidance to paying families, and nothing would have told us if it regressed.
 * Connect had 194 tests and never gives medical guidance. That inversion is what this
 * file ends: one floor, one suite, both surfaces gated by the same run.
 *
 * WHAT IS PINNED HERE
 *   1. The 25 emergency probes — every one must fire, on BOTH surfaces.
 *   2. The 18 calm messages — none may fire, on BOTH surfaces.
 *   3. Every category the medical team owns — at least one probe each, so a category
 *      cannot be deleted or broken silently.
 *   4. The iPhone apostrophe — a real family types "can’t", not "can't".
 *   5. The routing contract classifyCrisis() must keep: self-harm goes to the helpline
 *      lane, never to 108; a physical life-threat goes to emergency services.
 *   6. The VETO's limit — the load-bearing safety property. A frame may suppress a WEAK
 *      cue; it must NEVER suppress a STRONG one.
 *
 * If you are here because a test went red: the floor is shared. A change that fixes Ask
 * moves Connect too, and vice versa. That is the point — it is why the drift ended.
 */
import { describe, it, expect } from 'vitest'
import { detectCrisis, isCrisis } from './crisis.ts'
import { classifyCrisis } from '../ask-health/safety-engine.ts'

/* Both views of the same floor. Ask reaches it through classifyCrisis (which adds the
   safeguarding + mental-health lanes above it); Connect reaches it through isCrisis. */
const askFires = (t: string) => classifyCrisis(t) !== null
const connectFires = (t: string) => isCrisis(t)

/* ── 1 · the 25 emergencies. Both surfaces, no exceptions. ── */
const MUST_FIRE = [
  'amma fell in the bathroom', 'she is unresponsive', 'not waking up', 'she is not waking up',
  'breathing problem', 'she has breathing problem', 'blood coming from her head',
  'she cannot breath', 'appa is not talking and not moving', 'my father is having fits',
  'she fainted', 'he is choking', 'severe chest pain', 'my mother had a fall',
  'she is bleeding heavily', 'amma collapsed', 'father unconscious',
  'she is very weak and cannot get up', 'he is not responding to me',
  'my father is vomiting blood', 'amma is having a fit', 'her lips are turning blue',
  'he cant breath properly', 'my mother fell from the stairs', 'she is having trouble breathing',
]

/* ── 2 · the 18 calm messages. A crisis word in an innocent frame is not a crisis. ── */
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

/* ── 3 · every category the medical team owns. One probe each, minimum. ── */
const CATEGORY_PROBES: [string, string][] = [
  ['cardiac', 'he has chest pain'],
  ['cardiac', 'appa is clutching his chest'],
  ['breathing', 'she is not breathing'],
  ['breathing', 'her lips are turning blue'],
  ['breathing', 'she has a breathing problem'],
  ['stroke', 'I think he is having a stroke'],
  ['stroke', 'her face is drooping and her speech is slurred'],
  ['consciousness', 'amma is unconscious'],
  ['consciousness', 'he is having a fit'],
  ['fall_injury', 'she had a bad fall'],
  ['fall_injury', 'appa fell down and hit his head'],
  ['bleeding', 'she is bleeding heavily'],
  ['bleeding', 'he is vomiting blood'],
  ['accident_trauma', 'my father met with an accident'],
  ['overdose', 'she took too many pills'],
  ['allergic', 'his throat is swelling'],
  ['self_harm', 'he wants to kill himself'],
  ['severe_pain', 'she has the worst headache of her life'],
  ['poisoning', 'the baby swallowed a button cell battery'],
  ['burns', 'she has a deep burn on her hand'],
  ['drowning', 'we pulled him out of the pool'],
  ['infant_critical', 'my newborn has a fever'],
  ['meningitis_rash', 'the rash does not fade when pressed with a glass'],
  ['ml_consciousness', 'amma behosh ho gayi'],
  ['ml_breathing', 'saans nahi aa raha'],
  ['ml_cardiac', 'seene mein dard ho raha hai'],
  ['ml_fall', 'gir gaya aur uth nahi raha, sar se khoon'],
  ['ml_bleeding', 'bahut khoon beh raha hai'],
  ['blood_glucose', 'her blood sugar crashed'],
  ['ml_seizure', 'daura pada hai'],
  ['ml_self_harm', 'woh marna chahta hai'],
  ['services_involved', 'we called an ambulance'],
  ['explicit_distress', 'something is very wrong with amma'],
]

/* ── 4 · what a phone actually sends. ── */
const IPHONE = ['she can’t breathe', 'he won’t wake up', 'she can’t get up', 'he isn’t breathing']

describe('crisis floor · the 25 emergencies fire on BOTH surfaces', () => {
  for (const t of MUST_FIRE) {
    it(`Connect · ${t}`, () => expect(connectFires(t)).toBe(true))
    it(`Ask     · ${t}`, () => expect(askFires(t)).toBe(true))
  }
})

describe('crisis floor · calm messages fire on NEITHER surface', () => {
  for (const t of MUST_NOT_FIRE) {
    it(`Connect · ${t}`, () => expect(connectFires(t)).toBe(false))
    it(`Ask     · ${t}`, () => expect(askFires(t)).toBe(false))
  }
})

describe('crisis floor · every medical category still exists', () => {
  for (const [cat, probe] of CATEGORY_PROBES) {
    it(`${cat} · ${probe}`, () => {
      const r = detectCrisis(probe)
      expect(r.matched, `"${probe}" no longer matches ANY category`).toBe(true)
      if (r.matched) expect(r.category, `"${probe}" moved out of ${cat}`).toBe(cat)
    })
  }
})

describe('crisis floor · a family types on a phone', () => {
  for (const t of IPHONE) {
    it(`Connect · ${t}`, () => expect(connectFires(t)).toBe(true))
    it(`Ask     · ${t}`, () => expect(askFires(t)).toBe(true))
  }
})

describe('routing contract · the lane must match the crisis', () => {
  it('self-harm goes to the HELPLINE, never to 108', () => {
    const c = classifyCrisis('he wants to kill himself')
    expect(c?.category).toBe('mental_health_crisis')
    expect(c?.action).toBe('CRISIS_HELPLINE')
    expect(c?.escalateToHuman).toBe(true)
  })
  it('romanised self-harm routes to the helpline too', () => {
    expect(classifyCrisis('woh marna chahta hai')?.action).toBe('CRISIS_HELPLINE')
  })
  it('a physical life-threat goes to emergency services', () => {
    const c = classifyCrisis('appa is not breathing')
    expect(c?.category).toBe('medical_emergency')
    expect(c?.action).toBe('EMERGENCY_SERVICES')
    expect(c?.severity).toBe('critical')
  })
  it('Connect does NOT surface self-harm — it has no helpline lane, and 108 is the wrong door', () => {
    // The floor sees it; Connect's view deliberately withholds it rather than route a
    // person in mental-health crisis to an ambulance. Ask routes it correctly (above).
    expect(detectCrisis('he wants to kill himself').matched).toBe(true)
    expect(isCrisis('he wants to kill himself')).toBe(false)
  })
  it('safeguarding keeps its own lane, and hyperbole never accuses a tired family', () => {
    expect(classifyCrisis('my husband hits me')?.action).toBe('SAFEGUARDING_SUPPORT')
    expect(classifyCrisis('some nights I could kill him, he won’t sleep')?.category)
      .not.toBe('safeguarding_child')
  })
})

/**
 * THE STROKE SENSE-QUALIFICATION — approved by the founder 2026-07-17, for medical review.
 *
 * redflags.ts carried a bare /\bstroke\b/ with the note: "recall-biased: a historical or
 * benign mention is an acceptable false positive; a missed 'he's having a stroke' is not."
 * That is the right instinct, and the qualification below does not soften it. It removes
 * exactly ONE reading — "a stroke OF luck" — because "stroke of" never denotes the
 * condition in English. Every genuine phrasing fires exactly as it did before.
 *
 * These two blocks are the contract. If a future change makes a POSITIVE go red, a real
 * stroke stopped being detected — revert it. If a NEGATIVE goes red, we are crying wolf
 * again. Both directions are pinned deliberately: the qualification is only safe while
 * both halves hold.
 */
describe('stroke · genuine phrasings must fire exactly as before', () => {
  const REAL = [
    'I think he is having a stroke',
    'my father is having a stroke',
    'she had a stroke last night',
    'he has had a stroke',
    'amma had a massive stroke',
    'he suffered a stroke',
    'she is showing stroke symptoms',
    'appa had a mini stroke',
    'my mother had a stroke and cannot speak',
    // the rest of the stroke category — unrelated to the qualification, pinned so the
    // category cannot be quietly gutted while the lookahead takes the blame
    'her face is drooping on one side',
    'his speech is slurred',
    'one side of her body is weak',
    'suddenly numb on one side',
  ]
  for (const t of REAL) {
    it(`Connect · ${t}`, () => expect(connectFires(t)).toBe(true))
    it(`Ask     · ${t}`, () => expect(askFires(t)).toBe(true))
  }
  it('a real stroke is STRONG — no frame can veto it', () => {
    // The person reporting it works at a hospital. That must not matter.
    expect(connectFires('my sister is a nurse at the hospital and dad is having a stroke')).toBe(true)
    expect(askFires('my sister is a nurse at the hospital and dad is having a stroke')).toBe(true)
  })
  it('still routes to emergency services, unchanged', () => {
    const c = classifyCrisis('I think he is having a stroke')
    expect(c?.category).toBe('medical_emergency')
    expect(c?.action).toBe('EMERGENCY_SERVICES')
    expect(c?.severity).toBe('critical')
  })
})

describe('stroke · "stroke of ___" is a figure of speech, never an emergency', () => {
  const FIGURATIVE = [
    'my father had a stroke of luck',
    'that was a stroke of genius',
    'she had a stroke of bad luck at work',
    'with a stroke of the pen it was done',
    'what a stroke of good fortune for our family',
  ]
  for (const t of FIGURATIVE) {
    it(`Connect · ${t}`, () => expect(connectFires(t)).toBe(false))
    it(`Ask     · ${t}`, () => expect(askFires(t)).toBe(false))
  }
  it('the exclusion is exactly one reading — "stroke of" and nothing else', () => {
    // Proof the qualification did not widen: remove the "of" and it fires again.
    expect(connectFires('he had a stroke of luck')).toBe(false)
    expect(connectFires('he had a stroke')).toBe(true)
  })
})

/**
 * THE RED BUTTON'S OWN WORDS.
 *
 * closeeye-next/components/family/ask-closeeye-card.tsx renders a red "I need urgent
 * help" button, and on 2026-07-17 this floor did not recognise that sentence as a
 * crisis. "I need help urgently" fired; "I need urgent help" did not — the slot knew
 * "help ADVERB" but not "ADJECTIVE help". So the button was broken twice: it pointed at
 * a message thread AND its words were inaudible to the engine behind it.
 *
 * The button now submits these words to Ask, which is what makes the escalation fire.
 * If this test goes red, the red door is silent again. Keep the literal in step with the
 * label in ask-closeeye-card.tsx.
 */
describe('the red button — its label must fire the floor it depends on', () => {
  const URGENT_HELP = 'I need urgent help'   // MUST equal the label in ask-closeeye-card.tsx
  it(`"${URGENT_HELP}" — the exact button label — escalates`, () => {
    expect(isCrisis(URGENT_HELP)).toBe(true)
    const c = classifyCrisis(URGENT_HELP)
    expect(c?.category).toBe('medical_emergency')
    expect(c?.action).toBe('EMERGENCY_SERVICES')
    expect(c?.escalateToHuman).toBe(true)   // notifyCareTeam + /pm/escalations
  })
  for (const t of [
    'I need urgent help', 'urgent help', 'I need urgent help right now',
    'please send immediate help', 'we need emergency help',
    'I need help urgently', 'help immediately',   // the adverb order, which always worked
  ]) {
    it(`urgency + help, either word order · ${t}`, () => expect(isCrisis(t)).toBe(true))
  }
  it('does not fire on help without urgency — the generalization did not widen', () => {
    expect(isCrisis('I need help with her medicines')).toBe(false)
    expect(isCrisis('can you help me book a visit')).toBe(false)
  })
})

describe('the VETO may never suppress a STRONG cue — the load-bearing safety property', () => {
  it('a doctor in the ICU is a job', () => {
    expect(isCrisis('my father is a doctor in the ICU')).toBe(false)
  })
  it('…but a doctor who collapsed is an emergency', () => {
    expect(isCrisis('my father is a doctor and he collapsed')).toBe(true)
    expect(askFires('my father is a doctor and he collapsed')).toBe(true)
  })
  it('accident insurance is paperwork', () => {
    expect(isCrisis('we have accident insurance for my father')).toBe(false)
  })
  it('…but a bleeding accident is an emergency, insurance or not', () => {
    expect(isCrisis('he had an accident and is bleeding, we have insurance')).toBe(true)
    expect(askFires('he had an accident and is bleeding, we have insurance')).toBe(true)
  })
  it('a nurse in the emergency ward is a job', () => {
    expect(isCrisis('my sister is a nurse in the emergency ward')).toBe(false)
  })
  it('…but a nurse who is not breathing is an emergency', () => {
    expect(isCrisis('my sister is a nurse and she is not breathing')).toBe(true)
  })
})

describe('urgency about a medical place', () => {
  it('fires', () => expect(isCrisis('take her to the hospital immediately')).toBe(true))
  it('but a stated non-urgency is believed', () =>
    expect(isCrisis('take my father to the hospital on Tuesday, nothing urgent')).toBe(false))
  it('and a routine trip is not an emergency', () =>
    expect(isCrisis('I want to take my father to the hospital for his checkup next month')).toBe(false))
})

describe('one floor, not two — the drift guard', () => {
  it('Connect and Ask agree on every emergency probe', () => {
    const disagree = MUST_FIRE.filter((t) => connectFires(t) !== askFires(t))
    expect(disagree, `surfaces disagree on: ${disagree.join(' | ')}`).toEqual([])
  })
  it('Connect and Ask agree on every calm probe', () => {
    const disagree = MUST_NOT_FIRE.filter((t) => connectFires(t) !== askFires(t))
    expect(disagree, `surfaces disagree on: ${disagree.join(' | ')}`).toEqual([])
  })
})
