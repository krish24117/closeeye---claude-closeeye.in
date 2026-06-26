// Single source of truth for the /services pricing page.
// All amounts are CHARGED in INR (paise). USD shown is approximate only — we
// never transact in USD and never call an FX API.

export type ServiceCtaType = 'subscription' | 'one_off' | 'emergency' | 'membership'

export interface ServiceVariant {
  id: string
  label: string          // e.g. "Half day (up to ~4 hours)"
  amountPaise: number
  priceLabel: string     // e.g. "₹2,000"
}

export interface ServiceItem {
  id: string
  name: string
  subLabel: string       // one-line: duration / what's included
  type: ServiceCtaType
  amountPaise: number | null   // null when the user MUST pick a variant (price range)
  priceLabel: string           // "₹1,000" or "₹2,000–4,000"
  variants?: ServiceVariant[]
}

// ── USD display (approximate, configurable, NON-transactional) ───────────────
// Update this single constant as the rate drifts (≈ ₹83 per USD => 0.012).
export const USD_PER_INR = 0.012

export function paiseToUsdApprox(paise: number): string {
  const usd = (paise / 100) * USD_PER_INR
  return `≈ $${Math.round(usd)}`
}

// ── Founding membership (RUNG 1) ─────────────────────────────────────────────
export const MEMBERSHIP_PAISE = 10000 // ₹100, one-time

// ── Monthly plan (RUNG 2) ────────────────────────────────────────────────────
export const MONTHLY_PLAN = {
  planId: 'companion' as const,
  name: 'Monthly Companion Plan',
  amountPaise: 150000,
  priceLabel: '₹1,500',
  period: '/month',
  badge: 'Where most families start',
  bullets: [
    'A monthly home visit + weekly wellbeing calls',
    'A WhatsApp report after every visit',
    'Medicine reminders',
    'Priority rates on every on-demand service',
  ],
}

// ── On-demand (RUNG 3) ───────────────────────────────────────────────────────
// Note the `type` field drives the CTA — do NOT hardcode "Book".
export const ONE_OFF_SERVICES: ServiceItem[] = [
  {
    id: 'home_visit',
    name: 'Home visit',
    subLabel: '~60-min in-person wellbeing visit + WhatsApp report within the hour',
    type: 'one_off',
    amountPaise: 100000,
    priceLabel: '₹1,000',
  },
  {
    id: 'doctor_visit_support',
    name: 'Doctor visit support',
    // Copy fix: "Companion accompanies them to the doctor" (was "escorts to doctor")
    subLabel: 'Companion accompanies them to the doctor, takes notes, reports back',
    type: 'one_off',
    amountPaise: 150000,
    priceLabel: '₹1,500',
  },
  {
    id: 'hospital_assistance',
    name: 'Hospital assistance',
    subLabel: 'In-hospital presence and coordination; family updated throughout',
    type: 'one_off',
    amountPaise: null, // range — drawer forces a variant before any charge
    priceLabel: '₹2,000–4,000',
    variants: [
      { id: 'hospital_assistance_half_day', label: 'Half day (up to ~4 hours)', amountPaise: 200000, priceLabel: '₹2,000' },
      { id: 'hospital_assistance_full_day', label: 'Full day (up to ~8 hours)', amountPaise: 400000, priceLabel: '₹4,000' },
    ],
  },
  {
    id: 'grocery_medicine',
    name: 'Grocery & medicine',
    subLabel: 'Collection and delivery with receipt provided',
    type: 'one_off',
    amountPaise: 50000,
    priceLabel: '₹500',
  },
  {
    id: 'emergency_response',
    name: 'Emergency response',
    subLabel: '2-hour rapid visit for a fall, sudden illness, or distress',
    type: 'emergency',
    amountPaise: 300000,
    priceLabel: '₹3,000',
  },
]
