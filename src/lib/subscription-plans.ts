export type PlanId = 'companion'

export interface Plan {
  id: PlanId
  name: string
  monthlyPrice: number
  priceLabel: string
  tagline: string
  features: string[]
}

export const PLANS: Plan[] = [
  {
    id: 'companion',
    name: 'CloseEye Companion',
    monthlyPrice: 1500,
    priceLabel: '₹1,500/mo',
    tagline: 'Your complete monthly care package',
    features: [
      '1 home visit per month',
      'Weekly wellbeing calls',
      'Family updates & reports',
      'Medication reminders',
      'Emergency contact management',
      'WhatsApp support',
    ],
  },
]

export const PLAN_NAMES: Record<PlanId, string> = {
  companion: 'CloseEye Companion',
}
