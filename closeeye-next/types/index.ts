import type { LucideIcon } from 'lucide-react'

export interface TrustPoint {
  icon: LucideIcon
  label: string
}

export interface ServiceCard {
  id: string
  icon: LucideIcon
  name: string
  summary: string
  priceFrom: string
  href: string
}

export interface JourneyStep {
  index: number
  icon: LucideIcon
  title: string
  description: string
}

export interface TrustPillar {
  icon: LucideIcon
  title: string
  description: string
}

export interface Testimonial {
  id: string
  quote: string
  author: string
  relation: string
  location: string
  avatar?: string
}

export interface FaqItem {
  question: string
  answer: string
}
