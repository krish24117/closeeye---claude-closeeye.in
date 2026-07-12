import { z } from 'zod'
import { Home, HeartPulse, Sparkles, type LucideIcon } from 'lucide-react'

/* ── Options (Design-System-driven content) ────────────────────────────── */

export interface BookingService {
  id: 'home-wellbeing-visit' | 'hospital-companion' | 'custom-request'
  icon: LucideIcon
  name: string
  blurb: string
  duration: string
  priceFrom: string
  priceValue: number
  allowsEmergency: boolean
}

export const BOOKING_SERVICES: BookingService[] = [
  {
    id: 'home-wellbeing-visit',
    icon: Home,
    name: 'Home Wellbeing Visit',
    blurb: 'A warm, in-person check-in at home — with a same-day update for you.',
    duration: '60–90 minutes',
    priceFrom: '₹1,000',
    priceValue: 1000,
    allowsEmergency: false,
  },
  {
    id: 'hospital-companion',
    icon: HeartPulse,
    name: 'Hospital Companion',
    blurb: 'Someone beside your family member through admission, appointments and recovery.',
    duration: 'Half or full day',
    priceFrom: '₹2,000',
    priceValue: 2000,
    allowsEmergency: true,
  },
  {
    id: 'custom-request',
    icon: Sparkles,
    name: 'Custom Request',
    blurb: 'Groceries, medicines, a festival visit — anything your family needs.',
    duration: 'Varies with the request',
    priceFrom: '₹500',
    priceValue: 500,
    allowsEmergency: false,
  },
]

/** Hospital Companion is booked by duration — the family picks half or full day.
 *  Prices mirror the published menu (lib/services.ts SERVICE_MENU) and the edge
 *  function price maps (submit-booking-request / razorpay-*), which already know
 *  both variants — so this is a client-only choice, no backend change. */
export const HOSPITAL_DURATIONS = [
  { id: 'half_day', label: 'Half day', note: 'Coordination, registration and updates', priceValue: 2000, priceFrom: '₹2,000', canonicalId: 'hospital_assistance_half_day' },
  { id: 'full_day', label: 'Full day', note: 'End-to-end support and care coordination', priceValue: 4000, priceFrom: '₹4,000', canonicalId: 'hospital_assistance_full_day' },
] as const

export type HospitalDurationId = (typeof HOSPITAL_DURATIONS)[number]['id']

export const RELATIONSHIPS = ['Father', 'Mother', 'Grandparents', 'Spouse', 'Sibling', 'Friend', 'Other'] as const

export const PURPOSES = [
  { id: 'wellbeing', label: 'Wellbeing Check' },
  { id: 'hospital', label: 'Hospital Visit' },
  { id: 'companionship', label: 'Companionship' },
  { id: 'medicine', label: 'Medicine Reminder' },
  { id: 'emergency', label: 'Emergency Support' },
  { id: 'custom', label: 'Custom' },
] as const

export const TIME_SLOTS = [
  { id: 'morning', label: 'Morning', note: '8am – 12pm', emergencyOnly: false },
  { id: 'afternoon', label: 'Afternoon', note: '12pm – 4pm', emergencyOnly: false },
  { id: 'evening', label: 'Evening', note: '4pm – 8pm', emergencyOnly: false },
  { id: 'emergency', label: 'Emergency', note: 'As soon as possible', emergencyOnly: true },
] as const

export const PAYMENT_METHODS = [
  { id: 'upi', label: 'UPI', note: 'GPay, PhonePe, Paytm' },
  { id: 'card', label: 'Card', note: 'Visa, Mastercard, RuPay' },
  { id: 'netbanking', label: 'Net Banking', note: 'All major banks' },
  { id: 'wallet', label: 'Wallet', note: 'Paytm, Amazon Pay' },
] as const

export const COMM_PREFS = ['WhatsApp', 'Phone call', 'Email'] as const

/* ── Validation (per step + full) ──────────────────────────────────────── */

const phone = z
  .string()
  .trim()
  .regex(/^[6-9]\d{9}$/, 'Please enter a valid 10-digit mobile number')

export const serviceSchema = z.object({
  serviceId: z.enum(['home-wellbeing-visit', 'hospital-companion', 'custom-request'], {
    errorMap: () => ({ message: 'Choose a visit to continue' }),
  }),
})

export const lovedOneSchema = z.object({
  relationship: z.enum(RELATIONSHIPS, { errorMap: () => ({ message: 'Tell us who this is for' }) }),
  name: z.string().trim().min(2, "Please enter their name"),
  age: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || (/^\d{1,3}$/.test(v) && +v > 0 && +v < 120), 'Enter a valid age'),
  city: z.string().trim().min(2, 'Which city are they in?'),
  address: z.string().trim().min(6, 'A full address helps the Guardian arrive'),
  notes: z.string().trim().max(600).optional(),
})

export const purposeSchema = z.object({
  purpose: z.enum(['wellbeing', 'hospital', 'companionship', 'medicine', 'emergency', 'custom'], {
    errorMap: () => ({ message: 'Pick the reason for the visit' }),
  }),
  details: z.string().trim().max(600).optional(),
})

export const scheduleSchema = z.object({
  date: z.string().min(1, 'Choose a date'),
  timeSlot: z.enum(['morning', 'afternoon', 'evening', 'emergency'], {
    errorMap: () => ({ message: 'Choose a time that suits you' }),
  }),
})

export const contactSchema = z.object({
  yourName: z.string().trim().min(2, 'Please enter your name'),
  phone,
  whatsapp: z.string().trim().optional().refine((v) => !v || /^[6-9]\d{9}$/.test(v), 'Enter a valid WhatsApp number'),
  email: z.string().trim().email('Enter a valid email').optional().or(z.literal('')),
  commPref: z.enum(COMM_PREFS, { errorMap: () => ({ message: 'How should we reach you?' }) }),
})

export const bookingSchema = serviceSchema
  .merge(lovedOneSchema)
  .merge(purposeSchema)
  .merge(scheduleSchema)
  .merge(contactSchema)
  .extend({ paymentMethod: z.enum(['upi', 'card', 'netbanking', 'wallet']).optional() })

export type BookingData = z.infer<typeof bookingSchema>

export function serviceById(id?: string): BookingService | undefined {
  return BOOKING_SERVICES.find((s) => s.id === id)
}
