import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Container } from '@/components/ui/container'
import { Button } from '@/components/ui/button'
import { SITE } from '@/lib/site'

export const metadata: Metadata = {
  title: 'Privacy',
  description: 'How Close Eye protects your family’s information.',
}

const SECTIONS: { h: string; p: string }[] = [
  {
    h: 'What we collect',
    p: 'Only what we need to care for your family — contact details, the loved one’s location and preferences, and the notes a Guardian records during a visit.',
  },
  {
    h: 'Who can see it',
    p: 'Your details are shared only with your assigned Presence Manager and the Guardian for a given visit. We never sell your data or share it for advertising.',
  },
  {
    h: 'How we keep it safe',
    p: 'Information is stored securely and access is limited to the people directly involved in a visit. You can ask us to update or delete your data at any time.',
  },
  {
    h: 'Your control',
    p: `You decide what is shared and can withdraw it whenever you wish. Questions? Write to ${SITE.email}.`,
  },
]

export default function PrivacyPage() {
  return (
    <Container className="max-w-measure section-pad pt-32 sm:pt-36">
      <Button asChild variant="text">
        <Link href="/">
          <ArrowLeft className="h-4 w-4" strokeWidth={1.5} /> Back home
        </Link>
      </Button>
      <h1 className="mt-8 text-h2">Privacy</h1>
      <p className="mt-4 text-lead text-muted">
        Trust is the whole point. Here is the plain-language version of how we treat
        your family&apos;s information.
      </p>
      <div className="mt-12 flex flex-col gap-10">
        {SECTIONS.map((s) => (
          <section key={s.h}>
            <h2 className="text-h3">{s.h}</h2>
            <p className="mt-2 text-body text-muted">{s.p}</p>
          </section>
        ))}
      </div>
    </Container>
  )
}
