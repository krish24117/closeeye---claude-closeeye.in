/**
 * Close Eye Next — single source of truth for brand + site-wide constants.
 * Environment-overridable so the same build ships to preview and production.
 */

export const SITE = {
  name: 'Close Eye',
  legalName: 'Close Eye',
  // Registered entity behind the Close Eye brand (from closeeye.in).
  legalEntity: 'Stexa Products & Services Pvt. Ltd.',
  tagline: "When you can't be there, Close Eye can.",
  shortTagline: 'Care beyond presence',
  description:
    'Trusted human presence for the people you love — home wellbeing visits, hospital companionship, and custom support across India.',
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://closeeye.in',
  locale: 'en-IN',
  // Official contact — sourced from the live closeeye.in site.
  email: 'hello@closeeye.in',
  phoneDisplay: '+91 90002 21261',
  phoneHref: 'tel:+919000221261',
  whatsappNumber: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? '919000221261',
  ogImage: '/og-image.png',
  version: '1.0.0',
  // Env-overridable; any empty value hides automatically so no unverified
  // detail ever ships as a placeholder.
  address: process.env.NEXT_PUBLIC_OFFICE_ADDRESS ?? 'Hyderabad, Telangana, India — 500001',
  hours: process.env.NEXT_PUBLIC_WORKING_HOURS ?? 'Mon–Sat · 9:00 AM – 7:00 PM IST',
  mapsUrl: process.env.NEXT_PUBLIC_MAPS_URL ?? '',
} as const

/**
 * Official Close Eye social profiles — company accounts only, never personal.
 * Leave a URL empty ('') to hide that icon automatically; a broken/mock social
 * link must never ship. Fill with the official profile URL to reveal the icon.
 */
export type SocialKey = 'linkedin' | 'instagram' | 'facebook' | 'youtube' | 'x'
// Defaults are the official Close Eye profiles from closeeye.in. YouTube and X
// have no official account yet, so they stay empty and their icons stay hidden.
export const SOCIAL_LINKS: { key: SocialKey; label: string; href: string }[] = [
  { key: 'linkedin', label: 'LinkedIn', href: process.env.NEXT_PUBLIC_SOCIAL_LINKEDIN ?? 'https://www.linkedin.com/company/closeeye/' },
  { key: 'instagram', label: 'Instagram', href: process.env.NEXT_PUBLIC_SOCIAL_INSTAGRAM ?? 'https://www.instagram.com/closeeyeglobal/' },
  { key: 'facebook', label: 'Facebook', href: process.env.NEXT_PUBLIC_SOCIAL_FACEBOOK ?? 'https://www.facebook.com/closeeyeglobal' },
  { key: 'youtube', label: 'YouTube', href: process.env.NEXT_PUBLIC_SOCIAL_YOUTUBE ?? '' },
  { key: 'x', label: 'X', href: process.env.NEXT_PUBLIC_SOCIAL_X ?? '' },
]

/** Only the social profiles that are actually configured. */
export const activeSocialLinks = () => SOCIAL_LINKS.filter((s) => s.href.trim().length > 0)

/** Prefilled WhatsApp deep link — works on mobile and desktop web. */
export function whatsappLink(
  message = "Hi Close Eye — I'd like to check on my family.",
): string {
  return `https://wa.me/${SITE.whatsappNumber}?text=${encodeURIComponent(message)}`
}

export type NavItem = { label: string; href: string }

// Section links are absolute (`/#id`) so they resolve to the homepage from any
// route — the navbar and footer render on every page.
// Section links are absolute (`/#id`) so they resolve to the homepage from any
// route — the navbar and footer render on every page.
export const NAV_ITEMS: NavItem[] = [
  { label: 'Home', href: '/' },
  { label: 'How We Help', href: '/services' },
  { label: 'Membership', href: '/membership' },
  { label: 'Founder Story', href: '/founder-story' },
  { label: 'Contact', href: '/#contact' },
]

export const FOOTER_GROUPS: { title: string; links: NavItem[] }[] = [
  {
    title: 'Quick Links',
    links: [
      { label: 'Home', href: '/' },
      { label: 'About', href: '/about' },
      { label: 'Services', href: '/services' },
      { label: 'Pricing', href: '/membership' },
      { label: 'Become a Guardian', href: '/become-a-guardian' },
      { label: 'Become a Companion', href: '/become-a-companion' },
      { label: 'Contact', href: '/contact' },
    ],
  },
  {
    title: 'Support',
    links: [
      { label: 'Help Center', href: '/help' },
      { label: 'Family Space', href: '/family' },
      { label: 'Founder Story', href: '/founder-story' },
      { label: 'Share feedback', href: '/feedback' },
      { label: 'Emergency support', href: '/contact#emergency' },
    ],
  },
]

/** Legal & policy links — rendered in the footer's bottom bar. */
export const LEGAL_LINKS: NavItem[] = [
  { label: 'Privacy', href: '/privacy' },
  { label: 'Terms', href: '/terms' },
  { label: 'Refund', href: '/refund-policy' },
  { label: 'Cancellation', href: '/cancellation-policy' },
  { label: 'Consent', href: '/consent' },
  { label: 'Medical disclaimer', href: '/medical-disclaimer' },
  { label: 'Cookies', href: '/cookies' },
]
