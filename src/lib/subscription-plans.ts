export type PlanId = 'companion' | 'trust' | 'family_os'

export interface Plan {
  id: PlanId
  name: string
  price: number
  priceLabel: string
  tagline: string
  features: string[]
  popular?: boolean
  best?: boolean
}

export const PLANS: Plan[] = [
  {
    id: 'companion',
    name: 'Companion',
    price: 999,
    priceLabel: '₹999/mo',
    tagline: 'Occasional peace of mind',
    features: [
      '1 companion visit/month',
      'Photo + WhatsApp report',
      'PDF visit summary',
      'Family dashboard access',
    ],
  },
  {
    id: 'trust',
    name: 'Trust',
    price: 1999,
    priceLabel: '₹1,999/mo',
    tagline: 'Consistent, dedicated care',
    features: [
      '4 companion visits/month',
      'Dedicated companion',
      'PDF reports + WhatsApp delivery',
      'Family member notifications',
      'Priority support',
    ],
    popular: true,
  },
  {
    id: 'family_os',
    name: 'Family OS',
    price: 3499,
    priceLabel: '₹3,499/mo',
    tagline: 'Full-family peace of mind',
    features: [
      '8 companion visits/month',
      'Emergency SOS alerts',
      'Multi-member access (3 members)',
      '24/7 WhatsApp support',
      'Monthly family briefing',
      'All PDF reports',
    ],
    best: true,
  },
]

export const PLAN_NAMES: Record<PlanId, string> = {
  companion: 'Companion',
  trust: 'Trust',
  family_os: 'Family OS',
}
