/**
 * Membership plans offered at onboarding. `id` matches the DB constraint on
 * `subscriptions.plan_id` ('companion' | 'trust' | 'family_os'). Prices are
 * indicative for selection only — no charge is taken here; the actual amount is
 * confirmed later at Razorpay checkout from the Membership page.
 */
export type PlanId = 'companion' | 'trust' | 'family_os'

export interface Plan {
  id: PlanId
  name: string
  tagline: string
  price: string
  period: string
  features: string[]
  popular?: boolean
}

export const PLANS: Plan[] = [
  {
    id: 'companion',
    name: 'Companion',
    tagline: 'Friendly check-ins and calls to stay close',
    price: '₹2,000',
    period: '/mo',
    features: ['Regular check-in calls', 'Wellbeing updates', 'WhatsApp support'],
  },
  {
    id: 'trust',
    name: 'Trust',
    tagline: 'Wellbeing visits with a dedicated Presence Manager',
    price: '₹8,000',
    period: '/mo',
    popular: true,
    features: ['Up to 8 home visits a month', 'A dedicated Presence Manager', 'Same-day reports & photos', 'Priority emergency response'],
  },
  {
    id: 'family_os',
    name: 'Family OS',
    tagline: 'Complete care — visits, health and priority support',
    price: '₹15,000',
    period: '/mo',
    features: ['Everything in Trust', 'Health & medication coordination', 'Doctor & hospital assistance', 'Unlimited priority support'],
  },
]

/** "Who are you protecting?" → the loved one's relationship stored on the row. */
export const PROTECT_OPTIONS = [
  { key: 'Parent', label: 'Parents', emoji: '👵' },
  { key: 'Spouse', label: 'Spouse', emoji: '💑' },
  { key: 'Child', label: 'Children', emoji: '🧒' },
  { key: 'Self', label: 'Myself', emoji: '🙋' },
] as const

/** Relationship options for the Add Family Member selector (each with a simple icon). */
export const RELATIONSHIP_OPTIONS = [
  { key: 'Father', emoji: '👨' },
  { key: 'Mother', emoji: '👩' },
  { key: 'Spouse', emoji: '💍' },
  { key: 'Son', emoji: '🧑' },
  { key: 'Daughter', emoji: '👧' },
  { key: 'Grandfather', emoji: '👴' },
  { key: 'Grandmother', emoji: '👵' },
  { key: 'Brother', emoji: '👦' },
  { key: 'Sister', emoji: '👩‍🦰' },
  { key: 'Self', emoji: '🙋' },
  { key: 'Other', emoji: '👤' },
] as const

/** City suggestions for the Add Family Member autocomplete (free text allowed). */
export const CITY_SUGGESTIONS = [
  'Hyderabad', 'Bengaluru', 'Chennai', 'Mumbai', 'Delhi', 'Pune', 'Kolkata',
  'Ahmedabad', 'Jaipur', 'Kochi', 'Lucknow', 'Chandigarh', 'Coimbatore',
  'Visakhapatnam', 'Nagpur', 'Indore', 'Bhopal', 'Vijayawada', 'Mysuru', 'Surat',
] as const
