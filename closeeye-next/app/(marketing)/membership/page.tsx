import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, Check } from 'lucide-react'
import { Container } from '@/components/ui/container'
import { Button } from '@/components/ui/button'
import { FunnelSteps } from '@/components/funnel/funnel-steps'
import { MembershipPlans } from '@/components/marketing/membership-plans'
import { MEMBERSHIP } from '@/lib/content'

export const metadata: Metadata = {
  title: MEMBERSHIP.title,
  description:
    'Two simple CloseEye memberships — Connect and Care. Trusted human presence, a dedicated Presence Manager, and clear pricing you can trust.',
}

export default function MembershipPage() {
  return (
    <>
      <header className="bg-ivory pt-32 sm:pt-36">
        <Container className="pb-2">
          <Button asChild variant="text" className="mb-6">
            <Link href="/">
              <ArrowLeft className="h-4 w-4" strokeWidth={1.5} /> Back home
            </Link>
          </Button>
          <FunnelSteps step={1} />
          <span className="eyebrow mt-8 block">{MEMBERSHIP.eyebrow}</span>
          <h1 className="mt-4 max-w-3xl text-h1">{MEMBERSHIP.title}</h1>
          <p className="mt-5 max-w-2xl text-lead text-muted">{MEMBERSHIP.body}</p>
        </Container>
      </header>

      <Container className="section-pad pt-10">
        <MembershipPlans />

        <div className="mx-auto mt-14 max-w-3xl rounded-xl border border-line/70 bg-card p-8 shadow-sm">
          <p className="text-caption uppercase tracking-widest text-green">What every membership includes</p>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2">
            {MEMBERSHIP.perks.map((perk) => (
              <li key={perk} className="flex items-start gap-3">
                <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-success/12 text-success">
                  <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                </span>
                <span className="text-body text-ink">{perk}</span>
              </li>
            ))}
          </ul>
        </div>
      </Container>
    </>
  )
}
