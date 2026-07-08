import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, Check } from 'lucide-react'
import { Container } from '@/components/ui/container'
import { Button } from '@/components/ui/button'
import { Quote } from '@/components/ui/quote'
import { MEMBERSHIP } from '@/lib/content'

export const metadata: Metadata = {
  title: 'Choose Your Membership',
  description:
    'Choose the level of care that best fits your family. Every Close Eye membership includes trusted human support, thoughtful technology, and peace of mind.',
}

export default function MembershipPage() {
  return (
    <>
      <header className="bg-ivory pt-32 sm:pt-36">
        <Container className="pb-4">
          <Button asChild variant="text" className="mb-8">
            <Link href="/">
              <ArrowLeft className="h-4 w-4" strokeWidth={1.5} /> Back home
            </Link>
          </Button>
          <span className="eyebrow">{MEMBERSHIP.eyebrow}</span>
          <h1 className="mt-5 max-w-3xl text-h1">{MEMBERSHIP.title}</h1>
        </Container>
      </header>

      <Container className="section-pad">
        <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
          <div>
            <p className="text-lead text-muted">{MEMBERSHIP.body}</p>
            <div className="my-10 border-y border-line py-8">
              <Quote>
                Every membership is a simple promise: that no family should face
                life&apos;s important moments alone.
              </Quote>
            </div>
            <Button asChild size="lg">
              <Link href="/#contact">Choose This Membership</Link>
            </Button>
            <p className="mt-3 text-body-sm text-muted">
              Trusted human care, from your very first visit.
            </p>
          </div>

          <aside className="rounded-xl border border-line bg-card p-8 shadow-sm">
            <p className="text-caption uppercase tracking-widest text-green">
              What every membership includes
            </p>
            <ul className="mt-6 flex flex-col gap-5">
              {MEMBERSHIP.perks.map((perk) => (
                <li key={perk} className="flex items-start gap-3">
                  <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-success/12 text-success">
                    <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                  </span>
                  <span className="text-body text-ink">{perk}</span>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </Container>
    </>
  )
}
