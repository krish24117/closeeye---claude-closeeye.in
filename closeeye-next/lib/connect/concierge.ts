/**
 * The concierge track — Phase 2 of the orb-concierge (founder-approved 2026-07-24).
 *
 * DETERMINISTIC service + plan answers inside /space/connect: "how can Close Eye help with
 * taxes / a lawyer / groceries / a hospital day / a visit / what does it cost?" answers with
 * a service card (category + the CANONICAL price), action pills into the real booking flow,
 * and a Presence-Manager hand-off — Connect orchestrates, people fulfil.
 *
 * LAWS (Understanding Constitution + cases.test.ts fix rule):
 * - Runs strictly AFTER the crisis floor (the caller only reaches us post-escalate) and never
 *   on the medical lane. Precedent: medicalAdviceSought — a deterministic post-floor slot.
 * - Never a family-fact claim: concierge answers state catalogue facts only.
 * - Prices are IMPORTED from the same sources the booking flow charges from
 *   (features/booking/schema, lib/plans) — quoted, never re-typed, so they cannot drift.
 * - Every slot generalizes: word-boundary topic regexes + an action cue, with paraphrase
 *   siblings pinned in concierge.test.ts. Fix the slot, never the sentence.
 */
import { BOOKING_SERVICES } from '@/features/booking/schema'
import { PLANS } from '@/lib/plans'

export interface ConciergeAction {
  label: string
  /** Navigate — into the real booking flow / plan page. */
  href?: string
  /** Or continue the conversation — the tapped text is asked as the next turn. */
  ask?: string
  dark?: boolean
}

export interface ConciergeAnswer {
  /** The serif lead — one warm, certain sentence. */
  lead: string
  /** Plain words: what happens, who oversees it. */
  body: string
  /** Category + price pills (source-chip styling). */
  chips: string[]
  actions: ConciergeAction[]
  /** Show the Presence-Manager hand-off row. */
  handoff: boolean
}

/* ── Canonical prices — quoted from the exact sources the booking flow uses ── */
const svc = (id: string) => BOOKING_SERVICES.find((s) => s.id === id)
const VISIT_PRICE = svc('home-wellbeing-visit')?.priceFrom ?? '₹1,000'
const HOSPITAL_PRICE = svc('hospital-companion')?.priceFrom ?? '₹2,000'
const CUSTOM_PRICE = svc('custom-request')?.priceFrom ?? '₹1,000'
const plan = (key: string) => PLANS.find((p) => p.key === key)
const MEMBERSHIP_PRICE = plan('connect')?.price ?? '₹1,000'
const PRESENCE_PRICE = plan('care')?.price ?? '₹8,000'

/* ── The slots ─────────────────────────────────────────────────────────────── */
/** An action cue — the question asks Close Eye to DO/arrange something, or asks capability.
 *  Keeps statements and family-fact questions ("how is Amma?") out of the concierge. */
const CUE = /\b(help|need|want|can|could|arrange|book|schedule|find|get|send|how (do|can|does)|please|looking for|what.*(costs?|pric\w*|charg\w*|fees?)|do you)\b/i

const TOPIC = {
  hospital: /\b(hospital|admission|admitted|surgery|operation|opd|discharge)\b/i,
  errand: /\b(grocer\w*|medicines?|pharmacy|errands?|pick[- ]?up|deliver\w*|shopping)\b/i,
  legal: /\b(lawyer|advocate|legal|property\s+(papers?|dispute|verification|registration)|notary)\b/i,
  admin: /\b(tax(es)?|itr|income[- ]tax|filing|bank(ing)?|pension|kyc|paperwork|documents?|certificates?|insurance)\b/i,
  visit: /\b(visit|check[- ]?in|companion(ship)?|drop\s+(in|by)|spend time|look in on)\b/i,
  plan: /\b(plans?|pricing|prices?|cost|costs|charges?|fees?|subscription|membership|how much)\b/i,
} as const

/** The plan-flow option phrases (also what the option pills send as the next turn). */
const PLAN_CHOICE = {
  occasional: /\b(occasionall?y|from time to time|now and then|once in a while|when (we|i) need)\b/i,
  prepared: /\b(prepared|just in case|ready|preparedness|peace of mind)\b/i,
  consistent: /\b(consistent\w*|regular\w*|always|ongoing|continuous\w*|looking after|dedicated)\b/i,
} as const

/** Deterministic detection. Returns null when the concierge has no honest answer —
 *  the question then flows to the grounded family path exactly as before. */
export function detectConcierge(question: string): ConciergeAnswer | null {
  const q = (question || '').trim()
  if (!q) return null

  // The plan mini-flow's own answers first. The tapped option arrives as a SHORT plain sentence;
  // the length guard keeps long family sentences ("she occasionally needs help walking…") out.
  if (q.length <= 64) {
    if (PLAN_CHOICE.occasional.test(q) && /\b(help|support)\b/i.test(q)) return PLAN_CARDS.occasional
    if (PLAN_CHOICE.prepared.test(q) && /\b(keep|stay|be|us|me)\b/i.test(q)) return PLAN_CARDS.prepared
    if (PLAN_CHOICE.consistent.test(q) && /\b(looking after|look after|caring|there for)\b/i.test(q)) return PLAN_CARDS.consistent
  }

  if (!CUE.test(q)) return null
  if (TOPIC.hospital.test(q)) return HOSPITAL
  if (TOPIC.errand.test(q)) return ERRAND
  if (TOPIC.legal.test(q)) return LEGAL
  if (TOPIC.admin.test(q)) return ADMIN
  if (TOPIC.visit.test(q)) return VISIT
  if (TOPIC.plan.test(q)) return PLAN_QUESTION
  return null
}

/* ── The cards ─────────────────────────────────────────────────────────────── */
const SEE_INCLUDED: ConciergeAction = { label: 'See what’s included', href: '/plans#included' }

const ADMIN: ConciergeAnswer = {
  lead: 'Yes — we arrange that.',
  body: 'Paperwork, banking and tax support are part of our Administration services. A verified specialist handles it, and your Presence Manager oversees everything — exact quote before anything starts.',
  chips: ['Administration', `From ${CUSTOM_PRICE}`],
  actions: [{ label: 'Arrange it', href: '/space/book?service=custom-request', dark: true }, SEE_INCLUDED],
  handoff: true,
}

const LEGAL: ConciergeAnswer = {
  lead: 'I’ll connect you.',
  body: 'Legal coordination is part of our Administration services. Your Presence Manager will shortlist verified options near your family and set up the first call — you stay in control of every step.',
  chips: ['Legal coordination', 'Exact quote first'],
  actions: [{ label: 'Arrange it', href: '/space/book?service=custom-request', dark: true }, SEE_INCLUDED],
  handoff: true,
}

const ERRAND: ConciergeAnswer = {
  lead: 'Consider it handled.',
  body: 'Groceries, medicines and errands are one-off Custom Requests — booked in a minute, confirmed by your Presence Manager, done with care.',
  chips: ['Custom Request', `From ${CUSTOM_PRICE}`],
  actions: [{ label: 'Arrange it', href: '/space/book?service=custom-request', dark: true }, SEE_INCLUDED],
  handoff: true,
}

const HOSPITAL: ConciergeAnswer = {
  lead: 'Someone will be beside them.',
  body: 'A Hospital Companion stays through admission, appointments and recovery — briefed by your Presence Manager, so no one faces a hospital alone.',
  chips: ['Hospital Companion', `From ${HOSPITAL_PRICE}`],
  actions: [{ label: 'Arrange a companion', href: '/space/book?service=hospital-companion', dark: true }, SEE_INCLUDED],
  handoff: true,
}

const VISIT: ConciergeAnswer = {
  lead: 'A Guardian can be there.',
  body: 'A warm, in-person wellbeing visit — unhurried time with the person you love, and photos with a full report to you the same day.',
  chips: ['Wellbeing visit', `From ${VISIT_PRICE}`],
  actions: [{ label: 'Book a visit', href: '/space/book?service=home-wellbeing-visit', dark: true }, SEE_INCLUDED],
  handoff: true,
}

const PLAN_QUESTION: ConciergeAnswer = {
  lead: 'Let me ask one thing first.',
  body: 'How would you like Close Eye to be there for your family?',
  chips: [],
  actions: [
    { label: `Help occasionally, when we need it · from ${VISIT_PRICE}/service`, ask: 'Help occasionally, when we need it' },
    { label: `Keep us prepared, just in case · ${MEMBERSHIP_PRICE}/month`, ask: 'Keep us prepared, just in case' },
    { label: `Someone consistently looking after them · from ${PRESENCE_PRICE}/month`, ask: 'Someone consistently looking after them', dark: true },
  ],
  handoff: false,
}

const PLAN_CARDS: Record<'occasional' | 'prepared' | 'consistent', ConciergeAnswer> = {
  occasional: {
    lead: 'Then Pay as You Go fits best.',
    body: `Book any service exactly when you need it — no monthly commitment. Wellbeing visits from ${VISIT_PRICE}, hospital days from ${HOSPITAL_PRICE}, custom requests from ${CUSTOM_PRICE}.`,
    chips: ['Pay as You Go', `From ${VISIT_PRICE} / service`],
    actions: [{ label: 'Book your first visit', href: '/space/book', dark: true }, { label: 'See all plans', href: '/space/billing/plan' }],
    handoff: true,
  },
  prepared: {
    lead: 'Then Membership fits best.',
    body: 'Stay prepared before you ever need help — priority booking, your family’s details ready in advance, emergency information on hand, and member pricing on every service.',
    chips: ['Close Eye Membership', `${MEMBERSHIP_PRICE} / month`],
    actions: [{ label: 'Choose Membership', href: '/space/billing/plan', dark: true }, { label: 'See all plans', href: '/space/billing/plan' }],
    handoff: true,
  },
  consistent: {
    lead: 'Then Presence fits your family best.',
    body: 'A dedicated Guardian who truly knows them, regular familiar visits, and proof after every one — coordinated end-to-end by your Presence Manager.',
    chips: ['Close Eye Presence', `From ${PRESENCE_PRICE} / month`],
    actions: [{ label: 'Choose Presence', href: '/space/billing/plan', dark: true }, { label: 'See all plans', href: '/space/billing/plan' }],
    handoff: true,
  },
}
