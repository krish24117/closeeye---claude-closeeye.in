import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, UserCheck, GraduationCap, HeartHandshake, ShieldCheck, MessageCircle } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Container } from '@/components/ui/container'
import { Button } from '@/components/ui/button'
import { TrustSafety } from '@/components/marketing/trust-safety'
import { whatsappLink } from '@/lib/site'

export const metadata: Metadata = {
  title: 'Trust & Safety',
  description:
    'How Close Eye earns your trust — background-verified Guardians, a dedicated Presence Manager, and the standards behind every single visit.',
}

const STANDARD: { icon: LucideIcon; h: string; p: string }[] = [
  {
    icon: UserCheck,
    h: 'Verified before they ever visit',
    p: 'Every Guardian is background-checked and identity-verified before they join — never anonymous, never a random stranger. A real, named person, accountable for the time they spend with your parent.',
  },
  {
    icon: GraduationCap,
    h: 'Trained, and always reviewed',
    p: 'Guardians are trained in respectful, patient elder care and held to continuous quality audits. Presence before procedure; warmth before jargon.',
  },
  {
    icon: HeartHandshake,
    h: 'A dedicated Presence Manager',
    p: 'One human coordinates every visit and knows your family by name — no call centres, no ticket numbers. If we ever fall short, they make it right, personally.',
  },
  {
    icon: ShieldCheck,
    h: 'Every visit, on the record',
    p: 'GPS-verified check-ins, a same-day photo-and-note report, and a clear escalation path when it matters — so you don’t just hope someone was there, you see it.',
  },
]

export default function TrustSafetyPage() {
  return (
    <>
      <Container className="section-pad pt-32 sm:pt-36">
        <Button asChild variant="text"><Link href="/"><ArrowLeft className="h-4 w-4" strokeWidth={1.5} /> Back home</Link></Button>
        <span className="eyebrow mt-8 block">Trust &amp; Safety</span>
        <h1 className="mt-4 max-w-3xl text-h1">The people who will be there</h1>
        <p className="mt-5 max-w-2xl text-lead text-muted">
          In elder care, trust isn’t a feature — it’s the whole thing. You’re inviting someone into your parent’s life.
          Here is exactly how we earn that, before and after every visit.
        </p>

        <div className="mt-14 grid gap-4 sm:grid-cols-2">
          {STANDARD.map((s) => {
            const Icon = s.icon
            return (
              <div key={s.h} className="rounded-lg border border-line/70 bg-card p-6 shadow-sm">
                <span className="grid h-11 w-11 place-items-center rounded-full bg-accent-soft text-green"><Icon className="h-5 w-5" strokeWidth={1.5} /></span>
                <h2 className="mt-4 text-h3">{s.h}</h2>
                <p className="mt-2 text-body leading-relaxed text-muted">{s.p}</p>
              </div>
            )
          })}
        </div>
      </Container>

      {/* The verified-care-team grid (real safeguards) */}
      <TrustSafety />

      <Container className="section-pad">
        <div className="max-w-measure">
          <h2 className="text-h2">Who actually visits my parent?</h2>
          <p className="mt-4 text-body leading-relaxed text-muted">
            A verified, trained Guardian who lives near your family — matched to them and coordinated by your dedicated
            Presence Manager. The same familiar face wherever we can, so your parent is met by someone they know and
            trust. Real people, accountable to a real person, every single visit.
          </p>
        </div>
        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Button asChild size="lg"><Link href="/auth?intent=join">Start with your family <ArrowRight className="h-5 w-5" strokeWidth={1.5} /></Link></Button>
          <Button asChild size="lg" variant="secondary"><a href={whatsappLink('Hi Close Eye — I’d like to understand how your Guardians are verified.')} target="_blank" rel="noopener noreferrer"><MessageCircle className="h-5 w-5" strokeWidth={1.5} /> Talk to us</a></Button>
        </div>
      </Container>
    </>
  )
}
