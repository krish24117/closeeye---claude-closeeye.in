import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, MessageCircle, Phone, Siren, Ticket, HelpCircle } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Container } from '@/components/ui/container'
import { Button } from '@/components/ui/button'
import { SITE, whatsappLink } from '@/lib/site'

export const metadata: Metadata = { title: 'Help Center', description: 'Support, FAQs and ways to reach a real human at Close Eye.' }

const SUPPORT: { icon: LucideIcon; title: string; desc: string; href: string; tone?: 'urgent' }[] = [
  { icon: MessageCircle, title: 'Chat on WhatsApp', desc: 'The fastest way to reach your Presence Manager', href: whatsappLink('Hi Close Eye — I need a hand with something.') },
  { icon: Phone, title: 'Call us', desc: 'Speak to a real person, Mon–Sat 8am–8pm', href: 'tel:+919000221261' },
  { icon: Ticket, title: 'Raise a ticket', desc: 'For something that needs following up', href: `mailto:${SITE.email}?subject=Support%20request` },
  { icon: Siren, title: 'Emergency help', desc: 'In a medical emergency, call 108 first', href: 'tel:108', tone: 'urgent' },
  { icon: HelpCircle, title: 'Browse FAQs', desc: 'Answers to the most common questions', href: '#faq' },
]

const FAQ = [
  { q: 'Who is the Guardian who visits my parents?', a: 'A verified, trained, background-checked person who cares for elders professionally — the same trusted Guardian who spends time with your parents, whether it’s a wellbeing check-in, a hospital day, or simply warm company. A Presence Manager oversees and approves their visits.' },
  { q: 'Which cities do you cover?', a: 'Hyderabad today, with more cities opening soon. Tell us where your family lives and we’ll let you know the moment we reach them.' },
  { q: 'How quickly can a visit be arranged?', a: 'Usually within a day in the cities we serve. Your Presence Manager will confirm the earliest slot for your zone.' },
  { q: 'How do I see how my parent is doing?', a: 'After every visit you receive a warm report in Family Space — a human summary, photos, mood and any readings the family asked for.' },
  { q: 'What happens in an emergency?', a: 'Your Guardian is briefed on your family’s contacts and local emergency numbers, and escalates to your Presence Manager — and to you — immediately. In a medical emergency we support alongside 108 and your physician.' },
  { q: 'How do I pay from abroad?', a: 'Securely in your own currency (USD, GBP, AED). No Indian bank account is needed, and you can cancel anytime.' },
  { q: 'Can I reschedule or cancel?', a: 'Any time, free of charge, from Family Space or by messaging your Presence Manager. See our Cancellation Policy.' },
  { q: 'Is our information private?', a: 'Yes — private to your family, never sold. You can withdraw or delete it whenever you like. See our Privacy notice.' },
  { q: 'Is this a medical service?', a: 'No — Close Eye provides presence and support, not diagnosis or treatment. In emergencies we support alongside 108 and your physician. See our Medical Disclaimer.' },
]

export default function HelpPage() {
  return (
    <Container className="section-pad pt-32 sm:pt-36">
      <Button asChild variant="text"><Link href="/"><ArrowLeft className="h-4 w-4" strokeWidth={1.5} /> Back home</Link></Button>
      <h1 className="mt-8 text-h2">How can we help?</h1>
      <p className="mt-4 max-w-2xl text-lead text-muted">There’s always a real human at the other end. Reach us however feels easiest.</p>

      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SUPPORT.map((s) => {
          const Icon = s.icon
          return (
            <a key={s.title} href={s.href} className={`group flex items-start gap-4 rounded-lg border bg-card p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${s.tone === 'urgent' ? 'border-error/25' : 'border-line'}`}>
              <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-full ${s.tone === 'urgent' ? 'bg-error/10 text-error' : 'bg-accent-soft text-green'}`}><Icon className="h-5 w-5" strokeWidth={1.5} /></span>
              <span className="min-w-0"><span className="block text-h4 text-ink">{s.title}</span><span className="mt-1 block text-body-sm leading-relaxed text-muted">{s.desc}</span></span>
            </a>
          )
        })}
      </div>

      <section id="faq" className="mt-16 max-w-measure scroll-mt-28">
        <h2 className="text-h3">Frequently asked</h2>
        <div className="mt-6 flex flex-col gap-3">
          {FAQ.map((f) => (
            <details key={f.q} className="group rounded-lg border border-line/70 bg-card p-5 shadow-sm">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-h4 text-ink">
                {f.q}
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-line text-muted transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-body leading-relaxed text-muted">{f.a}</p>
            </details>
          ))}
        </div>
      </section>
    </Container>
  )
}
