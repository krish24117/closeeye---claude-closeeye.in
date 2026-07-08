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

/** Fuller relationship list for adding a loved one from the dashboard. */
export const RELATIONSHIPS = ['Father', 'Mother', 'Parent', 'Spouse', 'Grandfather', 'Grandmother', 'Child', 'Sibling', 'Self', 'Other'] as const
