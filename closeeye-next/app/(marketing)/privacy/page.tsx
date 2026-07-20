import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Container } from '@/components/ui/container'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = {
  title: 'Privacy',
  description: 'How Close Eye protects your family’s information — in plain language.',
}

const GRIEVANCE_EMAIL = 'Hello@closeeye.in'
const LAST_UPDATED = '20 July 2026'

/** Plain-language privacy notice. Test for every line: would an ordinary family understand this? */
const SECTIONS: { h: string; body: React.ReactNode }[] = [
  {
    h: 'What we hold',
    body: (
      <>Only what you choose to share so Close Eye can help your family: who your loved ones are and your
        relationship to them, any wellbeing or health details you add, the questions you ask, and any photos,
        videos or documents you save as memories. Plus your own account details — your name and email.</>
    ),
  },
  {
    h: 'How we use it',
    body: (
      <>To remember what matters about your family and give you grounded answers over time. When you ask a
        question, it is sent to our AI provider (Anthropic) to compose an answer for you — they process it to
        respond and do not keep it or use it to train their models. We also look at anonymous, aggregated usage
        to improve the product. <span className="font-semibold text-ink">We never sell your data and never use
        it for advertising.</span></>
    ),
  },
  {
    h: 'Who can see it',
    body: (
      <>Only you. Your family’s information is private to your account. Our AI provider processes a question
        only to answer it. If you use Care (where available), a trusted person sees only what’s needed for that
        specific visit — never before and never after.</>
    ),
  },
  {
    h: 'Where it’s kept and how it’s protected',
    body: (
      <>Your information is stored securely with our infrastructure provider (Supabase), encrypted, and isolated
        so that only your account can reach your family’s data. Access is limited to what a request actually
        needs.</>
    ),
  },
  {
    h: 'Your choices and rights',
    body: (
      <>You are in control. You can <span className="font-semibold text-ink">see and correct</span> what Close
        Eye holds, <span className="font-semibold text-ink">withdraw your consent</span> at any time (Profile →
        Your data &amp; consent), and <span className="font-semibold text-ink">delete everything</span> by closing
        your account (Profile → Close account). When you delete, we erase your data and keep only a minimal record
        that an erasure happened, for accountability.</>
    ),
  },
  {
    h: 'How long we keep it',
    body: (
      <>We keep your information for as long as your account is open, so Close Eye can keep helping your family.
        When you withdraw consent, we stop processing new questions about your family. When you close your
        account, your data is deleted.</>
    ),
  },
  {
    h: 'Consent',
    body: (
      <>Before Close Eye first processes information about your family, we ask you to agree to this notice. That
        consent is yours to withdraw whenever you wish — it never traps you.</>
    ),
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
        Trust is the whole point. Here, in plain language, is how we treat your family’s information —
        and the control you keep over it.
      </p>

      <div className="mt-12 flex flex-col gap-10">
        {SECTIONS.map((s) => (
          <section key={s.h}>
            <h2 className="text-h3">{s.h}</h2>
            <p className="mt-2 text-body text-muted">{s.body}</p>
          </section>
        ))}

        {/* Grievance officer + contact (DPDP) */}
        <section className="rounded-lg border border-line/70 bg-card p-6">
          <h2 className="text-h3">Questions, requests, or complaints</h2>
          <p className="mt-2 text-body text-muted">
            To see, correct, or delete your data, or if something concerns you, contact our Grievance Officer.
            We aim to respond promptly.
          </p>
          <p className="mt-4 text-body text-ink">
            <span className="font-semibold">Grievance Officer</span><br />
            Close Eye (Founder)<br />
            <a href={`mailto:${GRIEVANCE_EMAIL}`} className="font-semibold text-green hover:underline">{GRIEVANCE_EMAIL}</a>
          </p>
        </section>

        <p className="text-caption text-muted">Last updated: {LAST_UPDATED}. If we make meaningful changes to this
          notice, we’ll let you know and, where the change affects what you consented to, ask again.</p>
      </div>
    </Container>
  )
}
