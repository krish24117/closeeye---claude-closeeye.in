/**
 * CloseEye V2 membership model — LOCKED (Product Director decision).
 * Clean rounded pricing only. Do not add plans, alter prices, or introduce
 * alternatives without a new explicit product decision.
 *
 * `id` matches the DB constraint on `subscriptions.plan_id`
 * ('companion' | 'trust' | 'family_os'); the user-facing names are Connect /
 * Care. Connect → companion, Care → trust (app-layer mapping, no schema change).
 */
export type PlanId = 'companion' | 'trust' | 'family_os'
export type PlanKey = 'connect' | 'care'

export interface Plan {
  id: PlanId
  key: PlanKey
  name: string
  short: string
  price: string
  period: string
  description: string
  benefits: string[]
  cta: string
  popular?: boolean
}

export const PLANS: Plan[] = [
  {
    id: 'companion',
    key: 'connect',
    name: 'CloseEye Connect',
    short: 'Connect',
    price: '₹500',
    period: '/month',
    description: "Stay connected even when you're away.",
    benefits: [
      'Dedicated Presence Manager',
      'Phone & WhatsApp coordination',
      'Family updates',
      'Emergency escalation (108 & family)',
      'Dashboard access',
    ],
    cta: 'Choose Connect',
  },
  {
    id: 'trust',
    key: 'care',
    name: 'CloseEye Care',
    short: 'Care',
    price: '₹1,500',
    period: '/month',
    popular: true,
    description: 'A verified CloseEye Guardian visits your loved one every month and keeps your family connected.',
    benefits: [
      'Everything in CloseEye Connect',
      'One monthly wellbeing visit',
      'Visit report with photos',
      'Medication reminders',
      'Priority scheduling',
    ],
    cta: 'Choose Care',
  },
]

/** Resolve a stored plan_id to its plan definition. */
export function planById(id?: string | null): Plan | null {
  return PLANS.find((p) => p.id === id) ?? null
}

/** Other à-la-carte services (not memberships). "Starting at" wording, locked. */
export const SERVICES = [
  { name: 'Home Wellbeing Visit', price: 'Starting at ₹1,000', note: 'Book an additional wellbeing visit whenever needed.', serviceId: 'home-wellbeing-visit', cta: 'Book Visit' },
  { name: 'Hospital Companion', price: 'Starting at ₹2,000', note: 'Accompaniment, admission support and family coordination.', serviceId: 'hospital-companion', cta: 'Book Visit' },
  { name: 'Custom Request', price: 'Starting at ₹500', note: 'Groceries, medicines, document pickup, temple visits and other family requests.', serviceId: 'custom-request', cta: 'Request Service' },
] as const

/** "Who are you protecting?" → the loved one's relationship stored on the row. */
export const PROTECT_OPTIONS = [
  { key: 'Parent', label: 'Parents', emoji: '👵' },
  { key: 'Spouse', label: 'Spouse', emoji: '💑' },
  { key: 'Child', label: 'Children', emoji: '🧒' },
  { key: 'Self', label: 'Myself', emoji: '🙋' },
] as const

/** Relationship options for the Add Family Member selector. */
export const RELATIONSHIP_OPTIONS = [
  'Father', 'Mother', 'Spouse', 'Son', 'Daughter',
  'Grandfather', 'Grandmother', 'Brother', 'Sister', 'Self', 'Other',
] as const

/** City suggestions for the Add Family Member autocomplete (free text allowed). */
export const CITY_SUGGESTIONS = [
  'Hyderabad', 'Bengaluru', 'Chennai', 'Mumbai', 'Delhi', 'Pune', 'Kolkata',
  'Ahmedabad', 'Jaipur', 'Kochi', 'Lucknow', 'Chandigarh', 'Coimbatore',
  'Visakhapatnam', 'Nagpur', 'Indore', 'Bhopal', 'Vijayawada', 'Mysuru', 'Surat',
] as const
