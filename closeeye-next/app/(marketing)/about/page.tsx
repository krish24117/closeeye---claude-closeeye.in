import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, Target, Eye, ShieldCheck, HeartHandshake } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Container } from '@/components/ui/container'
import { Button } from '@/components/ui/button'
import { TrustSafety } from '@/components/marketing/trust-safety'
import { SITE, whatsappLink } from '@/lib/site'

export const metadata: Metadata = { title: 'About', description: 'Why Close Eye exists, our mission and vision, and the standards we hold ourselves to.' }

const PILLARS: { icon: LucideIcon; h: string; p: string }[] = [
  { icon: Target, h: 'Mission', p: 'To be a trusted human presence for the people you love — so no family faces life’s important moments alone.' },
  { icon: Eye, h: 'Vision', p: 'A world where distance never means absence, and every elder is cared for with dignity, warmth and consistency.' },
  { icon: ShieldCheck, h: 'Trust & safety', p: 'Every Guardian and Companion is background-verified, trained and rated. A dedicated Presence Manager oversees your family personally.' },
  { icon: HeartHandshake, h: 'Care standards', p: 'Presence before procedure. We show up on time, notice what matters, and share it in warm, human words — never clinical jargon.' },
]

const STORY = [
  { h: 'Our story', p: 'Close Eye began on the day our founder’s daughter was born — a happy day made quiet by distance from the people he loved. It became a promise: when you can’t be there, someone you trust can.' },
  { h: 'Why Close Eye exists', p: 'Because distance shouldn’t mean absence. So many families live far from ageing parents; Close Eye is the trusted presence that stands beside them — never replacing family, always strengthening it.' },
  { h: 'How Close Eye works', p: 'You tell us about your family. We match a verified Guardian or Companion nearby, coordinate every visit through a Presence Manager, and keep you close with warm reports after each one.' },
  { h: 'Our human-presence philosophy', p: 'Technology can inform you, but only a person can reassure you. We lead with warmth — presence before procedure — and let software quietly handle the rest: coordination, records, and keeping you close.' },
  { h: 'Our promise', p: 'We treat your parents as we would our own — with punctuality, dignity and honesty. If we ever fall short, your Presence Manager will make it right, personally.' },
]

const JOIN = [
  { href: '/become-a-guardian', h: 'Become a Guardian', sub: 'Join our verified care team' },
  { href: '/become-a-companion', h: 'Become a Companion', sub: 'Spend meaningful time with elders' },
  { href: '/founder', h: 'The founder’s story', sub: 'Why we started' },
]

export default function AboutPage() {
  return (
    <>
      <Container className="section-pad pt-32 sm:pt-36">
        <Button asChild variant="text"><Link href="/"><ArrowLeft className="h-4 w-4" strokeWidth={1.5} /> Back home</Link></Button>
        <h1 className="mt-8 max-w-3xl text-h1">A trusted human presence for the people you love</h1>
        <p className="mt-5 max-w-2xl text-lead text-muted">{SITE.legalName ?? 'Close Eye'} exists so distance never means absence. Here’s what we stand for.</p>

        <div className="mt-14 grid gap-4 sm:grid-cols-2">
          {PILLARS.map((p) => {
            const Icon = p.icon
            return (
              <div key={p.h} className="rounded-lg border border-line/70 bg-card p-6 shadow-sm">
                <span className="grid h-11 w-11 place-items-center rounded-full bg-accent-soft text-green"><Icon className="h-5 w-5" strokeWidth={1.5} /></span>
                <h2 className="mt-4 text-h3">{p.h}</h2>
                <p className="mt-2 text-body leading-relaxed text-muted">{p.p}</p>
              </div>
            )
          })}
        </div>

        <div className="mt-14 flex max-w-measure flex-col gap-10">
          {STORY.map((s) => (
            <section key={s.h}><h2 className="text-h3">{s.h}</h2><p className="mt-2 text-body leading-relaxed text-muted">{s.p}</p></section>
          ))}
        </div>
      </Container>

      {/* Trust & safety (Section 3) */}
      <TrustSafety />

      {/* Join / contact */}
      <Container className="section-pad">
        <h2 className="text-h2">Join us, or say hello</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {JOIN.map((j) => (
            <Link key={j.href} href={j.href} className="group flex items-center justify-between gap-3 rounded-lg border border-line/70 bg-card p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-accent hover:shadow-md">
              <span><span className="block text-h4 text-ink">{j.h}</span><span className="block text-caption text-muted">{j.sub}</span></span>
              <ArrowRight className="h-5 w-5 shrink-0 text-green transition-transform group-hover:translate-x-0.5" strokeWidth={1.5} />
            </Link>
          ))}
          <a href={whatsappLink('Hi Close Eye — I’d like to get in touch.')} target="_blank" rel="noopener noreferrer" className="group flex items-center justify-between gap-3 rounded-lg border border-line bg-ink p-5 text-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
            <span><span className="block text-h4 text-white">Contact us</span><span className="block text-caption text-white/60">We’d love to hear from you</span></span>
            <ArrowRight className="h-5 w-5 shrink-0 transition-transform group-hover:translate-x-0.5" strokeWidth={1.5} />
          </a>
        </div>
      </Container>
    </>
  )
}
