import { Home, HeartPulse, Sparkles, type LucideIcon } from 'lucide-react'

export interface ServiceDetail {
  id: string
  icon: LucideIcon
  name: string
  tagline: string
  description: string
  includes: string[]
  priceFrom: string
  photoDirection: string
  /** Real photo in /public. When set, ImageFrame renders it (with the warm treatment) instead of the placeholder. */
  image?: string
  imageAlt?: string
}

/** The three core ways to be there — detailed for the Services page. */
export const SERVICE_DETAILS: ServiceDetail[] = [
  {
    id: 'home-wellbeing-visit',
    icon: Home,
    name: 'Home Wellbeing Visit',
    tagline: 'A warm, in-person check-in — at home.',
    description:
      'A verified Guardian visits your loved one at home, spends unhurried time with them, quietly notices how they truly are, and sends you a personal update the same day. It’s the reassurance of knowing someone kind was actually there.',
    includes: [
      'A dedicated, background-verified Guardian',
      'Gentle wellbeing and home-safety check',
      'Photos and a written note on WhatsApp',
      'A same-day visit report',
    ],
    priceFrom: '₹1,000',
    photoDirection:
      'A Guardian sitting with an elderly parent at home, sharing tea and conversation — soft window light, genuine ease.',
  },
  {
    id: 'hospital-companion',
    icon: HeartPulse,
    name: 'Hospital Companion',
    tagline: 'No one should face a hospital alone.',
    description:
      'From admission and paperwork to appointments and recovery, a Guardian stays beside your loved one through the parts that feel overwhelming — coordinating with staff and keeping you informed at every step, so distance never means absence.',
    includes: [
      'Bedside presence through the day',
      'Admission, paperwork and appointment support',
      'Coordination with hospital staff and doctors',
      'Real-time updates to the family',
    ],
    priceFrom: '₹2,000',
    photoDirection:
      'A Guardian beside a patient in a real hospital room, calm and attentive — natural light, hand on the rail, unhurried care.',
    image: '/hospital.png',
    imageAlt:
      'A Close Eye Guardian standing attentively beside an elderly patient resting in a hospital bed, warm natural light through the window.',
  },
  {
    id: 'custom-request',
    icon: Sparkles,
    name: 'Custom Request',
    tagline: 'Anything your family needs, arranged.',
    description:
      'Groceries and medicines, a festival visit, help coordinating a home repair, or something only your family understands. Tell your Presence Manager what would help — if it makes life easier for the people you love, we’ll try to arrange it.',
    includes: [
      'Groceries, medicines and essentials',
      'Festival and special-occasion visits',
      'Home-maintenance coordination',
      'Bespoke, one-off requests',
    ],
    priceFrom: '₹500',
    photoDirection:
      'A Guardian arriving at a family home with groceries and flowers for a festival — warm street light, a welcoming doorway.',
    image: '/welcoming.png',
    imageAlt:
      'A Close Eye Guardian arriving at a festively decorated home with flowers and groceries, warmly greeted by an elderly couple at their doorway.',
  },
]

export interface MenuItem {
  name: string
  price: string
  note: string
}

/** The full on-demand menu — a single price list, not cards. */
export const SERVICE_MENU: MenuItem[] = [
  { name: 'Home wellbeing visit', price: '₹1,000', note: 'In-person check-in, safety observation, family update' },
  { name: 'Hospital assistance — half day', price: '₹2,000', note: 'Coordination, registration and updates' },
  { name: 'Hospital assistance — full day', price: '₹4,000', note: 'End-to-end support and care coordination' },
  { name: 'Emergency support visit', price: '₹3,000', note: 'Immediate local response and assessment' },
  { name: 'Grocery or medicine assistance', price: '₹500', note: 'Purchase, delivery and confirmation' },
  { name: 'Home maintenance coordination', price: '₹500', note: 'Plumber, electrician or repair coordination' },
]
