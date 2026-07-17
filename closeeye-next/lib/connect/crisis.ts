/**
 * Close Eye Connect — THE crisis vocabulary. One list, shared.
 *
 * Why this file exists: there used to be two. `understand.ts` carried a careful,
 * sense-qualified list ("fell down", "fell and", "has fallen") and `ledger.ts` — the
 * module /connect actually renders — carried a bare-substring one (`fell`). They drifted,
 * and the audit of 2026-07-17 measured the cost in both directions at once:
 *
 *   "my parents fell in love in Delhi"   -> answered as an EMERGENCY (108 offered)
 *   "my mother had a fall"               -> not recognised at all
 *
 * The guarantee written in understand.ts's docblock — "'fell in love' never fabricates a
 * crisis" — was true of the module we did not ship and false of the one we did. Both now
 * import from here, so the promise and the behaviour cannot drift apart again.
 *
 * THE DESIGN — cues are not equal, and pretending they are is what broke it:
 *
 *   STRONG  an unambiguous medical condition. "not breathing", "chest pain", "collapsed".
 *           There is no innocent reading, so nothing can veto it. If a family types one
 *           of these we act, whatever else the sentence says.
 *
 *   WEAK    a word that means crisis only in the right frame. "fell", "critical",
 *           "accident", "emergency", "ICU". Each is sense-qualified with a lookahead
 *           (fell, but not "fell in love"), and each yields to a VETO frame — because
 *           "my father is a doctor in the ICU" is a job, not an emergency.
 *
 *   VETO    an occupational or administrative frame. It can only ever suppress a WEAK
 *           cue. This is the load-bearing safety property: "my father is a doctor and he
 *           collapsed" still fires, because "collapsed" is STRONG and STRONG is never
 *           vetoed. A frame must never be able to talk us out of a real emergency.
 *
 *   URGENCY urgency ABOUT a place where emergencies happen ("take her to the hospital
 *           immediately"). Not urgency alone — "now" is one of the most common words a
 *           person types. An explicit denial ("nothing urgent", "no rush") is believed.
 *
 * The two failure directions are not symmetric, and neither is free. A missed emergency
 * can cost a life. A false one costs the trust that makes the lane worth having — a
 * family told "this sounds urgent" over a routine checkup learns to ignore us. So the
 * tiers are the honest answer: never soften a real condition, never cry wolf on a word.
 */

/* ── STRONG · unambiguous conditions. Never vetoed. ──
   Typo/inflection tolerant by construction, because families type in a hurry and in a
   second language: breath/breathe, cant/can't/cannot, waking/wake. */
const CRISIS_STRONG = new RegExp([
  // breathing
  /not\s+breathing|stopped\s+breathing|can(?:'|no|')?t\s+breath(?:e|ing)?|cannot\s+breath(?:e|ing)?/.source,
  /difficulty\s+breath\w*|trouble\s+breath\w*|breathing\s+(?:problem|trouble|issue|difficulty)|breathless|gasping|chok(?:e|ing)/.source,
  // cardiac
  /chest\s+pain|heart\s+attack|cardiac/.source,
  // neuro / consciousness
  /seizure|convuls\w*|(?:having|has|had|is\s+having)\s+(?:a\s+)?fits?\b/.source,
  /unconscious|unresponsive|not\s+responding|won'?t\s+respond|won'?t\s+wake|can(?:'|no|')?t\s+wake|not\s+waking|passed\s+out|faint\w*|collaps\w*/.source,
  // bleeding / cyanosis
  /bleeding|blood\s+everywhere|blood\s+(?:is\s+)?coming|vomit\w*\s+blood|coughing\s+blood/.source,
  /lips?[^.!?]{0,20}\bblue\b|turning\s+blue/.source,
  // immobility
  /not\s+moving|can(?:'|no|')?t\s+move|can(?:'|no|')?t\s+get\s+up|cannot\s+get\s+up/.source,
  // toxic / trauma
  /overdose|poison\w*|snake\s+bite|drown\w*|badly\s+hurt|seriously\s+hurt|got\s+hurt|injured|very\s+(?:sick|ill)/.source,
  // services already involved — someone has already escalated
  /ambulance|call\s+108|\b108\b|\b911\b|\b999\b|hospitali[sz]\w*|rushed\s+(?:to|her|him|them)|taken\s+to\s+(?:the\s+)?hospital|admitted\s+to/.source,
  // explicit distress
  /something\s+(?:is\s+)?(?:very\s+|terribly\s+|badly\s+)?wrong|very\s+wrong|gone\s+wrong|wrong\s+with\s+(?:her|him|them|my|amma|appa|mom|dad)/.source,
  /need\s+help\s+immediately|help\s+(?:immediately|urgently)|come\s+(?:quick\w*|fast|immediately|urgently)/.source,
].join('|'), 'i')

/* ── WEAK · crisis only in the right frame. Sense-qualified, and vetoable. ──
   Each lookahead below is a real sentence a family typed, or would. */
const CRISIS_WEAK = new RegExp([
  // a fall — but not in love, not asleep, not behind on the bills
  /\bfell\b(?!\s+(?:in\s+love|asleep|behind|short|out\b|for\b|silent|ill\b))/.source,
  /\bfallen\b(?!\s+in\s+love|\s+behind)|(?:had|has|have|after)\s+(?:a\s+|another\s+|bad\s+)*fall\b/.source,
  // dying — but not dying to see you, not dying her hair
  /\bdying\b(?!\s+(?:to\b|for\b|(?:her|his|my|the)\s+hair))/.source,
  // a stroke — but not a stroke of luck
  /\bstroke\b(?!\s+of\b)/.source,
  // critical — but not critical thinking, not critical of my cooking
  /\bcritical\w*\b(?!\s+(?:thinking|of\b|to\b|for\b|about))/.source,
  // serious — but not serious about her yoga
  /(?:very\s+serious|serious\s+condition)\b(?!\s+about)/.source,
  // an accident — vetoed by an insurance/paperwork frame below
  /\baccident\b/.source,
  // the word emergency — but not the emergency contact field
  /\bemergency\b(?!\s+(?:contact|contacts|number|numbers|details|kit|fund|savings))/.source,
  // already at a place where emergencies happen — vetoed by an occupational frame below
  /in\s+(?:the\s+)?hospital|into\s+(?:the\s+)?hospital|in\s+teh\s+hospital|\bicu\b|casualty|emergency\s+(?:ward|room)/.source,
].join('|'), 'i')

/* ── VETO · an occupational or administrative frame. Suppresses WEAK cues only. ──
   "my father is a doctor in the ICU" is a career. "we have accident insurance" is a
   policy. Neither is a person in danger. This can never reach a STRONG cue. */
const CRISIS_VETO = new RegExp([
  // works there / trains there / volunteers there
  /\b(?:is|was|are|were)\s+(?:a|an)\s+(?:nurse|doctor|surgeon|physician|staff|technician|receptionist|attendant|paramedic|ward\s*boy|cleaner|volunteer)\b/.source,
  /\bworks?\s+(?:at|in|for)\b|\bworking\s+(?:at|in|for)\b|\bvolunteers?\s+(?:at|in|for)\b|\bemployed\b|\bin\s+the\s+\w+\s+business\b|\bshift\s+at\b/.source,
  // paperwork about a thing that already happened
  /\binsurance\b|\bpolicy\b|\bpolicies\b|\bclaim\w*\b|\bpaperwork\b|\bpremium\b|\bcoverage\b/.source,
].join('|'), 'i')

/* ── URGENCY · urgent ABOUT a medical place. Never urgency on its own. ── */
const URGENCY = /\b(?:right\s+now|immediately|urgently|urgent|asap|at\s+once|straight\s*away|quickly|now|fast|quick)\b/i
const NOT_URGENT = /\b(?:nothing|not|no|isn'?t)\s+(?:urgent|serious|an\s+emergency)\b|\bno\s+(?:rush|hurry)\b|\bnot\s+in\s+a\s+(?:rush|hurry)\b/i
const MEDICAL_DEST = /\b(?:hospital|emergency|casualty|icu|ward|clinic|doctor)\b/i

/**
 * Is this text about a crisis? The single question, asked the same way everywhere.
 * Pure; no I/O; no state (no /g flags above — `.test` on a global regex is stateful).
 */
export function isCrisis(text: string): boolean {
  if (CRISIS_STRONG.test(text)) return true                        // never vetoed
  if (CRISIS_WEAK.test(text) && !CRISIS_VETO.test(text)) return true
  if (URGENCY.test(text) && MEDICAL_DEST.test(text) && !NOT_URGENT.test(text)) return true
  return false
}
