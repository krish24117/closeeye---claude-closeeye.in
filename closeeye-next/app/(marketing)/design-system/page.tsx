import type { Metadata } from 'next'
import {
  ShieldCheck,
  Home,
  HeartPulse,
  MessageSquareText,
  Lock,
  UserRoundCheck,
} from 'lucide-react'
import { Container } from '@/components/ui/container'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { FeatureIcon } from '@/components/ui/feature-icon'
import { Logo } from '@/components/ui/logo'

export const metadata: Metadata = {
  title: 'Design System',
  description: 'The Close Eye design language — tokens, type, colour and components.',
  robots: { index: false, follow: false },
}

function Row({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-line py-14">
      <div className="grid gap-8 lg:grid-cols-[0.5fr_1.5fr]">
        <div>
          <h2 className="text-h3">{title}</h2>
          {note && <p className="mt-2 max-w-xs text-body-sm text-muted">{note}</p>}
        </div>
        <div>{children}</div>
      </div>
    </section>
  )
}

const SWATCHES: { name: string; token: string; cls: string; hex: string }[] = [
  { name: 'Primary Dark', token: '--ink', cls: 'bg-ink', hex: '#0E2A1F' },
  { name: 'Primary Green', token: '--green', cls: 'bg-green', hex: '#1F5137' },
  { name: 'Accent Green', token: '--accent', cls: 'bg-accent', hex: '#A6D4B4' },
  { name: 'Accent Soft', token: '--accent-soft', cls: 'bg-accent-soft', hex: '#E4F0E7' },
  { name: 'Warm Ivory', token: '--ivory', cls: 'bg-ivory border border-line', hex: '#F6F3EC' },
  { name: 'Pure White', token: '--card', cls: 'bg-card border border-line', hex: '#FFFFFF' },
  { name: 'Light Border', token: '--line', cls: 'bg-line', hex: '#E7E1D6' },
  { name: 'Secondary Text', token: '--muted', cls: 'bg-muted', hex: '#5B6B62' },
  { name: 'Success Green', token: '--success', cls: 'bg-success', hex: '#069953' },
]

const TYPE: { label: string; cls: string; sample: string }[] = [
  { label: 'text-h1', cls: 'text-h1', sample: 'Trusted presence' },
  { label: 'text-h2', cls: 'text-h2', sample: 'Trusted presence' },
  { label: 'text-h3', cls: 'text-h3', sample: 'Trusted presence' },
  { label: 'text-h4', cls: 'text-h4', sample: 'Trusted presence' },
  { label: 'text-lead', cls: 'text-lead text-muted', sample: 'A trusted human presence for the people you love.' },
  { label: 'text-body', cls: 'text-body', sample: 'A trusted human presence for the people you love.' },
  { label: 'text-caption', cls: 'text-caption text-muted', sample: 'A trusted human presence for the people you love.' },
]

const SPACE = [
  { n: '2', px: '8' },
  { n: '4', px: '16' },
  { n: '6', px: '24' },
  { n: '8', px: '32' },
  { n: '12', px: '48' },
  { n: '16', px: '64' },
]

export default function DesignSystemPage() {
  return (
    <Container className="section-pad pt-32 sm:pt-36">
      <header className="max-w-2xl">
        <Logo />
        <h1 className="mt-8 text-h1">The Close Eye Design System</h1>
        <p className="mt-5 text-lead text-muted">
          One language for the website, app, WhatsApp, deck and print. If the logo
          were removed, the colour, type, spacing and tone should still read as
          Close Eye. Constraint is the point — few tokens, used consistently.
        </p>
      </header>

      <Row title="Colour" note="Nine tokens. Nothing outside this palette — no ad-hoc greens, no gold.">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {SWATCHES.map((s) => (
            <div key={s.name}>
              <div className={`h-20 w-full rounded-lg ${s.cls}`} />
              <p className="mt-2 text-body-sm font-semibold text-ink">{s.name}</p>
              <p className="text-caption text-muted">{s.token} · {s.hex}</p>
            </div>
          ))}
        </div>
      </Row>

      <Row title="Typography" note="One family (Open Sauce One). One scale. No random sizes or weights.">
        <div className="flex flex-col gap-6">
          {TYPE.map((t) => (
            <div key={t.label} className="flex flex-col gap-1 border-b border-line pb-6 last:border-0">
              <span className="text-caption uppercase tracking-widest text-green">{t.label}</span>
              <span className={t.cls}>{t.sample}</span>
            </div>
          ))}
        </div>
      </Row>

      <Row title="Spacing" note="An 8-point grid. Every gap and pad is a multiple of 8px.">
        <div className="flex flex-wrap items-end gap-6">
          {SPACE.map((s) => (
            <div key={s.n} className="flex flex-col items-center gap-2">
              <div className="rounded-sm bg-accent" style={{ width: `${Number(s.px)}px`, height: `${Number(s.px)}px` }} />
              <span className="text-caption text-muted">{s.px}px</span>
            </div>
          ))}
        </div>
      </Row>

      <Row title="Buttons" note="Only three: primary, secondary, link. Plus an on-dark inversion.">
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center gap-4">
            <Button>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="text">Text link</Button>
          </div>
          <div className="flex flex-wrap items-center gap-4 rounded-lg bg-ink p-6">
            <Button onDark>Primary</Button>
            <Button variant="secondary" onDark>Secondary</Button>
            <Button variant="text" onDark>Text link</Button>
          </div>
        </div>
      </Row>

      <Row title="Icons" note="Lucide, stroke width 1.5, via FeatureIcon. One family, one weight.">
        <div className="flex flex-wrap gap-4">
          {[ShieldCheck, Home, HeartPulse, MessageSquareText, Lock, UserRoundCheck].map((I, i) => (
            <FeatureIcon key={i} icon={I} />
          ))}
        </div>
      </Row>

      <Row title="Badges & cards" note="Used sparingly. Most sections use full-width, split or timeline layouts.">
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap gap-3">
            <Badge>Soft badge</Badge>
            <span className="rounded-lg bg-ink px-3 py-2"><Badge tone="onDark">On dark</Badge></span>
          </div>
          <Card interactive className="max-w-sm">
            <FeatureIcon icon={ShieldCheck} />
            <h3 className="mt-5 text-h4">Verified Guardians</h3>
            <p className="mt-2 text-body-sm text-muted">
              Background-checked, trained, and accountable to a real person.
            </p>
          </Card>
        </div>
      </Row>

      <Row title="Radius, shadow & motion" note="One elevation language. Motion: ease-premium, ≤24px travel, reduced-motion safe.">
        <div className="flex flex-wrap gap-5">
          <div className="flex flex-col items-center gap-2">
            <div className="h-20 w-20 rounded-md border border-line/70 bg-card" />
            <span className="text-caption text-muted">radius-md · 14px</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="h-20 w-20 rounded-lg border border-line/70 bg-card shadow-md" />
            <span className="text-caption text-muted">shadow-md</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="h-20 w-20 rounded-xl border border-line/70 bg-card shadow-lg" />
            <span className="text-caption text-muted">shadow-lg</span>
          </div>
        </div>
      </Row>
    </Container>
  )
}
