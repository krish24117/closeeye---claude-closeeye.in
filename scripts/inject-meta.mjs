// Post-build: write per-route index.html files with correct title, description,
// og:title, og:description, og:url, twitter:title, twitter:description, and
// canonical href injected statically. No browser or SSR needed.
//
// Social scrapers (WhatsApp, Twitter, LinkedIn) read only the first HTTP
// response — they never run JS. This ensures they see the right preview for
// every public route. Google runs JS and indexes full content regardless, but
// it also benefits from seeing the correct title in the initial HTML.

import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DIST = join(__dirname, '../dist')
const SITE = 'https://www.closeeye.in'

const META = {
  '/': {
    title: 'Close Eye — Trusted Elder Care Companion for NRI Families | Hyderabad',
    description: 'Close Eye provides verified companion visits for elderly parents of NRI families in Hyderabad. We visit, check their health, and send a WhatsApp report within the hour.',
  },
  '/services': {
    title: 'Services — Close Eye',
    description: 'Companion visits, hospital companions, emergency visits, and monthly care plans — choose the right support for your loved one in India.',
  },
  '/about': {
    title: 'About Us — Close Eye',
    description: 'Meet Close Eye — verified local companions providing trusted, in-person wellbeing visits for elderly parents and loved ones across India.',
  },
  '/faq': {
    title: 'FAQ — Close Eye',
    description: 'Answers to common questions about Close Eye visits, companion verification, pricing, cancellations, and coverage areas.',
  },
  '/contact': {
    title: 'Contact — Close Eye',
    description: 'Get in touch with the Close Eye team on WhatsApp or email — we reply within a few hours.',
  },
  '/waitlist': {
    title: 'Join Waitlist — Close Eye',
    description: 'Join the Close Eye waitlist to be notified the moment we launch verified companion visits in your city.',
  },
  '/for-societies': {
    title: 'For Societies — Close Eye',
    description: 'Partner with Close Eye to bring verified elder-care companions, wellbeing visits, and a real emergency plan to your residents — at no cost to the society.',
  },
  '/companions': {
    title: 'How We Verify Companions — Close Eye',
    description: 'Every Close Eye companion is verified at seven levels — application, interviews, police clearance, Aadhaar, training, and supervised visits — before they ever visit your parent alone.',
  },
  '/join-as-companion': {
    title: 'Join as a Companion — Close Eye',
    description: 'Apply to become a verified Close Eye companion in Hyderabad. Meaningful work caring for elders, with training and support from our founding team.',
  },
  '/privacy-policy': {
    title: 'Privacy Policy — Close Eye',
    description: "How Close Eye collects, uses, and protects your family's data.",
  },
  '/terms': {
    title: 'Terms of Service — Close Eye',
    description: 'Terms of service for booking and using Close Eye companion visits.',
  },
  '/refund-policy': {
    title: 'Refund & Cancellation Policy — Close Eye',
    description: 'Cancellation and refund policy for Close Eye companion visits and monthly plans.',
  },
  '/ask': {
    title: 'Ask Close Eye — Free health guidance for your elderly parents',
    description: "Get free, instant guidance on your elderly parent's health, medications, and wellbeing — from Close Eye's AI guided by our medical team. No login needed.",
  },
}

function escapeForAttr(str) {
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;')
}

function injectMeta(html, route, { title, description }) {
  const url = route === '/' ? SITE + '/' : SITE + route
  const t = escapeForAttr(title)
  const d = escapeForAttr(description)

  return html
    // <title>
    .replace(/<title>[^<]*<\/title>/, `<title>${t}</title>`)
    // meta description  (self-closing with />)
    .replace(
      /<meta name="description" content="[^"]*"\s*\/>/,
      `<meta name="description" content="${d}" />`,
    )
    // og:title
    .replace(
      /<meta property="og:title" content="[^"]*"\s*\/>/,
      `<meta property="og:title" content="${t}" />`,
    )
    // og:description
    .replace(
      /<meta property="og:description" content="[^"]*"\s*\/>/,
      `<meta property="og:description" content="${d}" />`,
    )
    // og:url
    .replace(
      /<meta property="og:url" content="[^"]*"\s*\/>/,
      `<meta property="og:url" content="${url}" />`,
    )
    // twitter:title
    .replace(
      /<meta name="twitter:title" content="[^"]*"\s*\/>/,
      `<meta name="twitter:title" content="${t}" />`,
    )
    // twitter:description
    .replace(
      /<meta name="twitter:description" content="[^"]*"\s*\/>/,
      `<meta name="twitter:description" content="${d}" />`,
    )
    // canonical
    .replace(
      /<link rel="canonical" href="[^"]*"\s*\/>/,
      `<link rel="canonical" href="${url}" />`,
    )
}

const template = readFileSync(join(DIST, 'index.html'), 'utf-8')
let count = 0

for (const [route, meta] of Object.entries(META)) {
  const html = injectMeta(template, route, meta)
  if (route === '/') {
    writeFileSync(join(DIST, 'index.html'), html, 'utf-8')
  } else {
    const dir = join(DIST, route.slice(1))
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, 'index.html'), html, 'utf-8')
  }
  count++
}

console.log(`[inject-meta] ${count} routes written`)
