import type { Metadata } from 'next'
import type { LucideIcon } from 'lucide-react'
import {
  HeartPulse, Stethoscope, Activity, Pill, Heart, ShieldAlert, MessageCircle, Check,
} from 'lucide-react'
import { Logo } from '@/components/ui/logo'
import { FeatureIcon } from '@/components/ui/feature-icon'
import { SITE } from '@/lib/site'
import { PrintButton } from './print-button'

export const metadata: Metadata = {
  title: 'Founder Brief · Close Eye',
  description: 'Close Eye — India’s Trusted Presence. A one-page founder brief.',
  robots: { index: false, follow: false },
}

const PRINT_CSS = `
@media print {
  @page { size: A4; margin: 13mm; }
  html, body { background: #fff !important; }
  * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  .fb-page { padding: 0 !important; background: #fff !important; }
  .fb-doc { max-width: 100% !important; border: 0 !important; border-radius: 0 !important; box-shadow: none !important; padding: 0 !important; }
  .fb-noprint { display: none !important; }
  .fb-section { break-inside: avoid; }
}
`

const SERVICES: { icon: LucideIcon; label: string }[] = [
  { icon: HeartPulse, label: 'Hospital Companion' },
  { icon: Stethoscope, label: 'Doctor Visit Assistance' },
  { icon: Activity, label: 'Diagnostics Coordination' },
  { icon: Pill, label: 'Medicine Support' },
  { icon: Heart, label: 'Wellness Visits' },
  { icon: ShieldAlert, label: 'Emergency Coordination' },
  { icon: MessageCircle, label: 'Close Eye Connect' },
]

const WHY_NOW = ['Growing elderly population', 'More nuclear families', 'Increasing migration', 'Millions of NRIs', 'Rising healthcare complexity']
const BUSINESS_MODEL = ['Membership plans', 'Presence visits', 'Healthcare coordination', 'Corporate family care', 'Future insurance partnerships']
const CURRENT_STAGE = ['Product vision defined', 'Brand identity established', 'SOP-first operating model', 'MVP available', 'Hyderabad launch preparation']
const NEXT_12 = ['Launch Hyderabad', 'Acquire first 500 paying families', 'Hospital partnerships', 'Trusted Care Network', 'Repeat memberships', 'Scalable operating model']
const LOOKING_FOR = ['Strategic feedback', 'Healthcare introductions', 'NRI community partnerships', 'Execution mentorship', 'Long-term relationships']

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <span className="eyebrow">{children}</span>
}

function List({ items, marker = 'dot' }: { items: string[]; marker?: 'dot' | 'check' }) {
  return (
    <ul className="mt-5 flex flex-col gap-2.5">
      {items.map((it) => (
        <li key={it} className="flex items-start gap-3 text-body-sm text-ink">
          {marker === 'check' ? (
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-green" strokeWidth={2.25} />
          ) : (
            <span className="mt-[0.45rem] h-1.5 w-1.5 shrink-0 rounded-full bg-green" aria-hidden />
          )}
          {it}
        </li>
      ))}
    </ul>
  )
}

function Divider() {
  return <div className="border-t border-line" />
}

export default function FounderBriefPage() {
  return (
    <div className="fb-page min-h-screen bg-ivory px-4 py-8 sm:px-6 sm:py-12">
      <style dangerouslySetInnerHTML={{ __html: PRINT_CSS }} />
      <PrintButton />

      <article className="fb-doc mx-auto flex w-full max-w-[62rem] flex-col gap-12 rounded-[2rem] border border-line bg-card px-8 py-10 shadow-lg sm:px-14 sm:py-16">

        {/* Masthead */}
        <header className="fb-section flex items-start justify-between gap-6">
          <Logo />
          <div className="text-right">
            <p className="text-caption font-semibold uppercase tracking-[0.14em] text-green">Founder Brief</p>
            <p className="mt-1 text-caption text-muted">Confidential</p>
          </div>
        </header>

        {/* Hero */}
        <section className="fb-section flex flex-col gap-5">
          <Eyebrow>India&rsquo;s Trusted Presence</Eyebrow>
          <h1 className="text-h2">
            When you can&rsquo;t be there,<br />
            <span className="text-green">{SITE.name} can.</span>
          </h1>
          <p className="max-w-[42rem] text-lead text-muted">
            {SITE.name} combines trusted human presence with intelligent technology to give families
            peace of mind when they cannot be physically present.
          </p>
        </section>

        <Divider />

        {/* Problem + Solution */}
        <section className="fb-section grid gap-8 sm:grid-cols-2">
          <div>
            <Eyebrow>The Problem</Eyebrow>
            <p className="mt-4 text-body text-body">
              Millions of Indian families live away from their parents and loved ones. When someone needs hospital
              support, diagnostics, medicines, emergency coordination or simply someone trustworthy to be present,
              families struggle to coordinate care remotely. Technology alone cannot replace human presence.
            </p>
          </div>
          <div>
            <Eyebrow>Our Solution</Eyebrow>
            <p className="mt-4 text-body text-body">
              {SITE.name} is India&rsquo;s Trusted Presence — a network of verified, caring people and intelligent
              coordination, so a family is never far from the person they love. Every interaction is designed to
              reduce anxiety and increase trust.
            </p>
          </div>
        </section>

        {/* Services */}
        <section className="fb-section">
          <Eyebrow>What we provide</Eyebrow>
          <div className="mt-6 grid gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
            {SERVICES.map((s) => (
              <div key={s.label} className="flex items-center gap-3.5">
                <FeatureIcon icon={s.icon} size="sm" />
                <span className="text-body-sm font-semibold text-ink">{s.label}</span>
              </div>
            ))}
          </div>
        </section>

        <Divider />

        {/* Why now + Vision */}
        <section className="fb-section grid gap-10 sm:grid-cols-2">
          <div>
            <Eyebrow>Why now</Eyebrow>
            <List items={WHY_NOW} />
            <p className="mt-5 text-body-sm text-muted">Families need trusted presence — not another healthcare app.</p>
          </div>
          <div className="flex flex-col justify-center">
            <Eyebrow>Vision</Eyebrow>
            <p className="mt-5 text-balance text-h3 font-medium leading-snug tracking-[-0.02em] text-ink">
              To become the trusted presence for every Indian family, wherever they are in the world.
            </p>
          </div>
        </section>

        <Divider />

        {/* Business model + Current stage */}
        <section className="fb-section grid gap-10 sm:grid-cols-2">
          <div>
            <Eyebrow>Business model</Eyebrow>
            <List items={BUSINESS_MODEL} />
          </div>
          <div>
            <Eyebrow>Current stage</Eyebrow>
            <List items={CURRENT_STAGE} marker="check" />
          </div>
        </section>

        <Divider />

        {/* Next 12 months + What we're looking for */}
        <section className="fb-section grid gap-10 sm:grid-cols-2">
          <div>
            <Eyebrow>Next 12 months</Eyebrow>
            <List items={NEXT_12} />
          </div>
          <div>
            <Eyebrow>What we&rsquo;re looking for</Eyebrow>
            <List items={LOOKING_FOR} />
          </div>
        </section>

        <Divider />

        {/* Founder */}
        <footer className="fb-section flex flex-wrap items-end justify-between gap-6">
          <div className="flex items-center gap-4">
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-accent-soft text-h4 font-bold text-green" aria-hidden>KS</span>
            <div>
              <p className="text-caption font-semibold uppercase tracking-[0.14em] text-green">Founder</p>
              <p className="mt-1.5 text-h4 text-ink">Krishna Seerla</p>
              <p className="text-body-sm text-muted">Founder · {SITE.name}</p>
            </div>
          </div>
          <div className="text-right">
            <a href={SITE.url} className="text-body-sm font-semibold text-green">{SITE.url.replace(/^https?:\/\//, '')}</a>
            <p className="mt-1 max-w-[22rem] text-caption italic text-muted">{SITE.tagline}</p>
          </div>
        </footer>
      </article>
    </div>
  )
}
