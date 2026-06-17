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
    tagline: "Trusted care, even when you can't be there",
    features: [
      '1 home visit every month (GPS photos + report)',
      'Weekly wellbeing call',
      'Family update after each interaction',
      'Medication reminder support',
      'Emergency contact management',
      'WhatsApp support',
      'Access to all CloseEye on-demand services',
    ],
  },
]

export const PLAN_NAMES: Record<PlanId, string> = {
  companion: 'CloseEye Companion',
}
