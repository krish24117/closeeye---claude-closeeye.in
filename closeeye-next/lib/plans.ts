/**
 * Close Eye membership model (founder 2026-07-23 — retired the old ₹500 Connect /
 * ₹1,500 Care plans). Dev-stage pricing; may change. Clean round numbers only.
 *
 * The two subscription SLOTS are preserved (so every consumer keeps working):
 *   · `id` still matches the DB constraint on `subscriptions.plan_id`
 *     ('companion' | 'trust' | 'family_os')
 *   · `key` is still 'connect' | 'care' (logic across booking/dashboard/admin keys off it)
 * Only the customer-facing NAMES, PRICES and BENEFITS changed:
 *   companion/connect → Close Eye Membership (₹1,000)
 *   trust/care        → Close Eye Presence   (from ₹8,000)
 * Full tiering (Presence Essential/Plus/Family Office + international $ pricing) lives on
 * the marketing /pricing page (lib/pricing.ts, region-detected).
 *
 * ⚠️ Live payment (Razorpay) is NOT re-wired to these amounts yet — the existing Razorpay
 * plans are the old prices, so the in-app CTA captures intent for the care team instead of
 * charging. Wiring new Razorpay plan IDs for these amounts is a separate, deliberate step.
 */
import { formatMoney } from '@/lib/platform/currency'
import { DEFAULT_REGION_CODE } from '@/lib/platform/regions'

export type PlanId = 'companion' | 'trust' | 'family_os'
export type PlanKey = 'connect' | 'care'

export interface Plan {
  id: PlanId
  key: PlanKey
  name: string
  short: string
  /** The numeric price (major units) — the currency-agnostic truth. */
  amount: number
  /** India-default display, formatted via the CurrencyService. For a family in another
   *  region, format at render time: formatMoney(plan.amount, family.region). */
  price: string
  period: string
  description: string
  benefits: string[]
  cta: string
  popular?: boolean
}

// India-default formatting (Phase 3: prices are still India-only). No currency symbol is
// hardcoded here now — it comes from Intl via the CurrencyService. Per-region prices
// format(amount, region) at render time.
const inr = (amount: number) => formatMoney(amount, DEFAULT_REGION_CODE)

export const PLANS: Plan[] = [
  {
    id: 'companion',
    key: 'connect',
    name: 'Close Eye Membership',
    short: 'Membership',
    amount: 1000,
    price: inr(1000),
    period: '/month',
    description: 'Stay prepared, before you ever need help — priority booking, your family’s details on hand, and member pricing on every service.',
    benefits: [
      'Priority booking when you need it',
      'Your family’s details, ready in advance',
      'Emergency information on hand',
      'Support a message away, on WhatsApp',
      'Member pricing on every service',
    ],
    cta: 'Become a Member',
  },
  {
    id: 'trust',
    key: 'care',
    name: 'Close Eye Presence',
    short: 'Presence',
    amount: 8000,
    price: inr(8000),
    period: '/month',
    popular: true,
    description: 'An ongoing, trusted local presence — a dedicated Guardian who truly knows your family, with verified proof of how they’re doing after every visit.',
    benefits: [
      'A trusted local presence your family can rely on',
      'Regular, familiar time with your loved one',
      'Proof of every visit — never a guess',
      'You stay informed, wherever you are',
      'Early awareness of what’s changing',
    ],
    cta: 'Choose Presence',
  },
]

/** Resolve a stored plan_id to its plan definition. */
export function planById(id?: string | null): Plan | null {
  return PLANS.find((p) => p.id === id) ?? null
}

/** Other à-la-carte services (not memberships). "Starting at" wording, locked. */
export const SERVICES = [
  { name: 'Home Wellbeing Visit', amount: 1000, price: `Starting at ${inr(1000)}`, note: 'Book an additional wellbeing visit whenever needed.', serviceId: 'home-wellbeing-visit', cta: 'Book Visit' },
  { name: 'Hospital Companion', amount: 2000, price: `Starting at ${inr(2000)}`, note: 'Accompaniment, admission support and family coordination.', serviceId: 'hospital-companion', cta: 'Book Visit' },
  { name: 'Custom Request', amount: 1000, price: `Starting at ${inr(1000)}`, note: 'Groceries, medicines, document pickup, temple visits and other family requests.', serviceId: 'custom-request', cta: 'Request Service' },
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
