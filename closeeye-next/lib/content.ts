import {
  Home,
  HeartPulse,
  Sparkles,
  MessageSquareText,
  ShieldCheck,
  UserRoundCheck,
  Headset,
  Lock,
  MessagesSquare,
  FileText,
  UsersRound,
  HandHeart,
  Footprints,
  Smile,
} from 'lucide-react'
import type {
  TrustPoint,
  ServiceCard,
  JourneyStep,
  TrustPillar,
  Testimonial,
  FaqItem,
} from '@/types'

/* ── Hero trust strip ──────────────────────────────────────────────────── */
export const HERO_TRUST: TrustPoint[] = [
  { icon: ShieldCheck, label: 'Verified Guardians' },
  { icon: UserRoundCheck, label: 'Dedicated Presence Manager' },
  { icon: MessageSquareText, label: 'WhatsApp Updates' },
  { icon: FileText, label: 'Visit Reports' },
]

/* ── How can we help — exactly three ───────────────────────────────────── */
export const SERVICES: ServiceCard[] = [
  {
    id: 'home-wellbeing-visit',
    icon: Home,
    name: 'Home Wellbeing Visit',
    summary:
      'A verified Guardian visits your loved one at home, checks in with warmth, and sends you a personal update.',
    priceFrom: '₹1,000',
    href: '#how-we-help',
  },
  {
    id: 'hospital-companion',
    icon: HeartPulse,
    name: 'Hospital Companion',
    summary:
      'Someone stays beside them through admission, appointments, and recovery — so no one faces a hospital alone.',
    priceFrom: '₹2,000',
    href: '#how-we-help',
  },
  {
    id: 'custom-request',
    icon: Sparkles,
    name: 'Custom Request',
    summary:
      'Groceries, medicines, a festival visit, or something only your family understands. Tell us — we arrange it.',
    priceFrom: '₹500',
    href: '#how-we-help',
  },
]

/* ── How it works — five steps ─────────────────────────────────────────── */
export const JOURNEY: JourneyStep[] = [
  {
    index: 1,
    icon: UsersRound,
    title: 'Tell us about your family',
    description:
      'Share who you care for and what matters to them. It takes a few minutes.',
  },
  {
    index: 2,
    icon: Headset,
    title: 'Presence Manager assigned',
    description:
      'A dedicated human becomes your single point of contact — no call centres.',
  },
  {
    index: 3,
    icon: Footprints,
    title: 'Guardian visits',
    description:
      'A verified, trained Guardian arrives with genuine care and full attention.',
  },
  {
    index: 4,
    icon: MessageSquareText,
    title: 'You receive updates',
    description:
      'Photos, notes, and a visit report reach you on WhatsApp — the same day.',
  },
  {
    index: 5,
    icon: Smile,
    title: 'Peace of mind',
    description:
      'You breathe easier, knowing someone was truly there for the people you love.',
  },
]

/* ── Why families trust Close Eye — six pillars ─────────────────────────── */
export const TRUST_PILLARS: TrustPillar[] = [
  {
    icon: ShieldCheck,
    title: 'Verified Guardians',
    description:
      'Every Guardian is background-checked, trained, and accountable to a real person — never anonymous.',
  },
  {
    icon: UserRoundCheck,
    title: 'Presence Manager',
    description:
      'One dedicated human coordinates every visit and knows your family by name.',
  },
  {
    icon: FileText,
    title: 'Visit Reports',
    description:
      'A clear, honest record after every visit — what happened, how they were, what comes next.',
  },
  {
    icon: MessagesSquare,
    title: 'WhatsApp Updates',
    description:
      'Real-time photos and notes where you already are. No new app to learn.',
  },
  {
    icon: Lock,
    title: 'Privacy',
    description:
      "Your family's details stay private and protected. Shared only with the people who care for them.",
  },
  {
    icon: HandHeart,
    title: 'Human Support',
    description:
      'Real people, reachable when it matters. Compassion is our first response, not a script.',
  },
]

/* ── Founder story excerpt (mirrors the production Founder's Story) ─────── */
export const FOUNDER = {
  name: 'Krishna',
  role: 'Founder',
  portrait: '/founder.png',
  excerpt:
    "On the day my daughter was born — the happiest day of my life — I realised I had almost no one to call. In that quiet, I understood a fear every family carries: what happens to the people we love when we can't be there? Close Eye is my answer.",
} as const

/* ── Membership ────────────────────────────────────────────────────────── */
export const MEMBERSHIP = {
  eyebrow: 'Membership',
  title: 'Choose Your Membership',
  body: 'Choose the level of care that best fits your family. Every membership includes trusted human support, thoughtful technology, and peace of mind.',
  perks: [
    'Priority access to Guardians in your city',
    'A dedicated Presence Manager for your family',
    'Warm, human reports after every visit',
    'Clear, consistent pricing you can trust',
  ],
} as const

/* ── Testimonials (placeholder — real quotes drop straight in) ─────────── */
export const TESTIMONIALS: Testimonial[] = [
  {
    id: 't1',
    quote:
      'I live in Toronto and my parents are in Hyderabad. For the first time in years, I sleep through the night.',
    author: 'Placeholder Name',
    relation: 'Daughter',
    location: 'Toronto → Hyderabad',
  },
  {
    id: 't2',
    quote:
      'The Guardian sat with my father through his entire procedure. The photos afterwards meant everything to us.',
    author: 'Placeholder Name',
    relation: 'Son',
    location: 'London → Chennai',
  },
  {
    id: 't3',
    quote:
      'It never feels like a service. It feels like family showing up when we cannot.',
    author: 'Placeholder Name',
    relation: 'Granddaughter',
    location: 'Dubai → Pune',
  },
]

/* ── FAQ ───────────────────────────────────────────────────────────────── */
export const FAQS: FaqItem[] = [
  {
    question: 'Who are the Guardians who visit my family?',
    answer:
      'Guardians are trained, background-verified individuals in your loved one’s city. Each is accountable to a named Presence Manager, so there is always a real person responsible for every visit.',
  },
  {
    question: 'How do I receive updates after a visit?',
    answer:
      'You receive photos, a short note, and a visit report on WhatsApp — usually the same day. No new app to install, no login to remember.',
  },
  {
    question: 'Which cities does Close Eye cover?',
    answer:
      'We are growing city by city across India, starting with major metros. Tell us where your family lives and we’ll confirm availability right away.',
  },
  {
    question: 'Can I request something specific for a single visit?',
    answer:
      'Yes. Alongside wellbeing visits and hospital companionship, a Custom Request covers groceries, medicines, festival visits, or anything your family needs. If it helps them, we’ll try to arrange it.',
  },
  {
    question: 'How is my family’s privacy protected?',
    answer:
      'Details are shared only with the Presence Manager and the assigned Guardian for a visit. We never sell data, and you control what is shared.',
  },
  {
    question: 'What happens in an emergency?',
    answer:
      'Your Presence Manager coordinates an immediate local response and keeps you informed at every step. For medical emergencies, we help reach the right care fast while you are looped in on WhatsApp.',
  },
]
