// CloseEye Connect · Safety Engine — crisis classification layer.
//
// Sits ABOVE the canonical pattern floor (../_shared/crisis.ts — the SAME file Connect uses;
// there is no second copy). It returns ONLY the crisis category, severity
// and recommended action — NEVER a phone number or a country-specific resource. The Resource
// Router (resource-router.ts) maps the action to regional resources from a config pack.
//
// This keeps the Safety Engine provider-agnostic and country-extensible: a new country is a
// new resource pack, not a change here. The Safety Engine is also a PRODUCT capability — every
// entry point (chat, voice, WhatsApp, future APIs) must call this same module.

import { detectCrisis } from '../_shared/crisis.ts'   // THE canonical floor — shared with Connect

export type CrisisCategory =
  | 'medical_emergency'
  | 'mental_health_crisis'
  | 'safeguarding_child'
  | 'safeguarding_adult'

export type Severity = 'critical' | 'high' | 'moderate'
export type RecommendedAction = 'EMERGENCY_SERVICES' | 'CRISIS_HELPLINE' | 'SAFEGUARDING_SUPPORT'

export interface CrisisClassification {
  category: CrisisCategory
  severity: Severity
  action: RecommendedAction
  /** The matched phrase — for the audit trail. NOT a resource. */
  signal: string
  /** Whether a human (Presence Manager / care team) should be looped in. */
  escalateToHuman: boolean
}

function norm(t: string): string {
  return t.toLowerCase().replace(/[’‘‛`´ʼ]/g, "'").replace(/\s+/g, ' ').trim()
}

// Exhausted-parent / figurative hyperbole about SOMEONE ELSE — never a safeguarding report.
// "some nights I could kill him, he won't sleep" is a cry for rest, not abuse. This guards
// the safeguarding lane only; genuine self-directed ideation ("kill myself") is untouched.
// TODO(policy): the hyperbole-vs-real-threat boundary is a clinical/safeguarding decision —
// review with the medical + safeguarding leads before launch.
const HYPERBOLE =
  /(could|want to|going to|feel like|ready to|about to) (kill|strangle|murder|throttle) (him|her|them|it|the (baby|child|kid)|this (baby|child|kid)|my (baby|child|kid|son|daughter))\b/

const SAFEGUARDING_CHILD: RegExp[] = [
  /(shook|shaking|shake|shaken) (my|the|our|his|her) (baby|infant|newborn|child)/,
  /(hit|hitting|beat|beating|slapp\w+|punch\w+|hurt\w*|abus\w+|burn\w+) (my|the|our|his|her|their) (child|children|baby|son|daughter|kid|infant|grandchild)/,
  /(child|baby|kid|son|daughter|infant) (is )?(being )?(abused|beaten|molested|starved|neglected|locked up)/,
  /(neglect\w*|starv\w+|abandon\w+) (the |my |our )?(child|baby|kid|infant)/,
]
const SAFEGUARDING_ADULT: RegExp[] = [
  /(husband|wife|partner|father|mother|son|daughter|brother|sister|in.?law|he|she) (hits|beats|hurts|abuses|is (hitting|beating|abusing|hurting))/,
  /domestic (violence|abuse)/,
  /(being|am|getting) (hit|beaten|abused|threatened|assaulted) (at home|by (my|him|her))/,
  /(elder|elderly) (abuse|neglect)/,
]
const MENTAL_HEALTH: RegExp[] = [
  /(want|wants|wanting|trying|thinking of|planning) (to )?(die|end (it|my life|his life|her life)|kill (my|him|her|them)self)/,
  /\bsuicid/,
  /(self[- ]?harm|harm (my|him|her|them)self|hurt (my|him|her|them)self|cut(ting)? (my|him|her)self)/,
  /(don('| ?)t|do not|no longer) want to (live|be alive|be here|go on|wake up|exist)/,
  // Passive ideation — recall-biased on purpose. TODO(clinical): tune precision with the
  // medical team; "don't see the point" can false-positive. A caring, non-clinical response
  // is the acceptable failure mode here (over-care beats a missed cry for help).
  /(don('| ?)t|do not|can('| ?)t) (see|find) (the|any|much) point\b/,
  /no (point|reason) (in|to|for) (living|go on|going on|carry on|carrying on|being here|it)/,
  /(what'?s the point|no point) (anymore|of living|in living|in going on|in trying)/,
  /better off (dead|without me)|(they|everyone|world).{0,15}better (off )?without me/,
  // TODO(clinical): "can't go on / can't do this anymore" is AMBIGUOUS — caregiver burnout vs
  // ideation. Deliberately NOT flagged as a crisis here (burnout routes to human/PM support,
  // not the crisis-helpline lane). Revisit with the medical team; consider a despair co-signal.
]

function firstMatch(text: string, pats: RegExp[]): string | null {
  for (const p of pats) { const m = text.match(p); if (m) return m[0] }
  return null
}

/**
 * Classify a message into a crisis category + severity + recommended action, or null when
 * there is no crisis. Precedence: a physical life-threat (most time-critical) first, then
 * safeguarding, then mental health. Returns NO resources — the Resource Router maps `action`
 * to regional numbers. Subject-independent (intent before age).
 */
export function classifyCrisis(rawText: string): CrisisClassification | null {
  const text = norm(rawText)

  // 1. Physical life-threat — most time-critical. Reuses the deterministic pattern floor.
  const rf = detectCrisis(rawText)
  if (rf.matched) {
    // self_harm is also detected by the pattern floor — route it to the mental-health lane,
    // NOT the 108 medical lane.
    if (rf.category === 'self_harm' || rf.category === 'ml_self_harm') {
      return { category: 'mental_health_crisis', severity: 'high', action: 'CRISIS_HELPLINE', signal: rf.phrase, escalateToHuman: true }
    }
    return { category: 'medical_emergency', severity: 'critical', action: 'EMERGENCY_SERVICES', signal: rf.phrase, escalateToHuman: true }
  }

  // 2. Safeguarding — its own lane (support + human, never 108). Guarded against hyperbole
  //    so we never auto-accuse an exhausted family.
  if (!HYPERBOLE.test(text)) {
    const child = firstMatch(text, SAFEGUARDING_CHILD)
    if (child) return { category: 'safeguarding_child', severity: 'high', action: 'SAFEGUARDING_SUPPORT', signal: child, escalateToHuman: true }
    const adult = firstMatch(text, SAFEGUARDING_ADULT)
    if (adult) return { category: 'safeguarding_adult', severity: 'high', action: 'SAFEGUARDING_SUPPORT', signal: adult, escalateToHuman: true }
  }

  // 3. Mental-health crisis — soft ideation the pattern floor doesn't cover.
  const mh = firstMatch(text, MENTAL_HEALTH)
  if (mh) return { category: 'mental_health_crisis', severity: 'high', action: 'CRISIS_HELPLINE', signal: mh, escalateToHuman: true }

  return null
}
