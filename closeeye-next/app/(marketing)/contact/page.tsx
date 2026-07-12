import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, Mail, Phone, MessageCircle, MapPin, Clock, Siren, ExternalLink } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Container } from '@/components/ui/container'
import { Button } from '@/components/ui/button'
import { ContactForm } from '@/components/marketing/contact-form'
import { SITE, whatsappLink } from '@/lib/site'

export const metadata: Metadata = {
  title: 'Contact',
  description: 'Talk to a real human at Close Eye — phone, email, WhatsApp, working hours and emergency support.',
}

type Method = { icon: LucideIcon; label: string; value: string; href: string; external?: boolean }

const METHODS: Method[] = [
  { icon: Mail, label: 'Email', value: SITE.email, href: `mailto:${SITE.email}` },
  { icon: Phone, label: 'Phone', value: SITE.phoneDisplay, href: SITE.phoneHref },
  { icon: MessageCircle, label: 'WhatsApp', value: 'Chat with support', href: whatsappLink(), external: true },
]

export default function ContactPage() {
  return (
    <Container className="section-pad pt-32 sm:pt-36">
      <Button asChild variant="text"><Link href="/"><ArrowLeft className="h-4 w-4" strokeWidth={1.5} /> Back home</Link></Button>
      <p className="eyebrow mt-8">Contact</p>
      <h1 className="mt-3 max-w-3xl text-h1">Talk to a real human</h1>
      <p className="mt-5 max-w-2xl text-lead text-muted">
        However you reach us, a real person from the Close Eye team will answer — no bots, no queues.
      </p>

      <div className="mt-14 grid gap-10 lg:grid-cols-2 lg:items-start">
        {/* Contact methods */}
        <div className="flex flex-col gap-4">
          {METHODS.map((m) => {
            const Icon = m.icon
            return (
              <a
                key={m.label}
                href={m.href}
                {...(m.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                className="group flex items-center gap-4 rounded-lg border border-line/70 bg-card p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-accent hover:shadow-md"
              >
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-accent-soft text-green"><Icon className="h-5 w-5" strokeWidth={1.5} /></span>
                <span>
                  <span className="block text-caption uppercase tracking-widest text-muted">{m.label}</span>
                  <span className="block text-body font-medium text-ink">{m.value}</span>
                </span>
              </a>
            )
          })}

          {/* Address + hours */}
          <div className="rounded-lg border border-line/70 bg-card p-5 shadow-sm">
            {SITE.address ? (
              <div className="flex items-start gap-4">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-accent-soft text-green"><MapPin className="h-5 w-5" strokeWidth={1.5} /></span>
                <div>
                  <span className="block text-caption uppercase tracking-widest text-muted">Office</span>
                  <p className="mt-0.5 text-body text-ink">{SITE.address}</p>
                  <p className="text-caption text-muted">Registered as {SITE.legalEntity}</p>
                  {SITE.mapsUrl && (
                    <a href={SITE.mapsUrl} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-body-sm font-medium text-green underline-offset-2 hover:underline">
                      Get directions <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.75} />
                    </a>
                  )}
                </div>
              </div>
            ) : null}
            <div className={`flex items-start gap-4 ${SITE.address ? 'mt-4 border-t border-line pt-4' : ''}`}>
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-accent-soft text-green"><Clock className="h-5 w-5" strokeWidth={1.5} /></span>
              <div>
                <span className="block text-caption uppercase tracking-widest text-muted">Working hours</span>
                <p className="mt-0.5 text-body text-ink">{SITE.hours}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Support form */}
        <ContactForm />
      </div>

      {/* Emergency */}
      <section id="emergency" className="mt-14 scroll-mt-28 rounded-xl border border-line bg-ink p-8 text-white shadow-sm">
        <div className="flex items-start gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white/10 text-accent"><Siren className="h-6 w-6" strokeWidth={1.5} /></span>
          <div className="min-w-0 flex-1">
            <h2 className="text-h3 text-white">Need us urgently?</h2>
            <p className="mt-2 max-w-xl text-body leading-relaxed text-white/70">
              For any medical emergency, call 108 first — always. Then reach us right away: your
              Presence Manager coordinates on the ground and keeps you updated, alongside emergency services.
            </p>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <Button asChild onDark>
                <a href="tel:108"><Phone className="h-4 w-4" strokeWidth={1.5} /> Call 108 (emergency)</a>
              </Button>
              <Button asChild variant="secondary" onDark>
                <a href={whatsappLink('Hi Close Eye — this is urgent. I need help now.')} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="h-4 w-4" strokeWidth={1.5} /> WhatsApp us
                </a>
              </Button>
              <Button asChild variant="secondary" onDark>
                <a href={SITE.phoneHref}><Phone className="h-4 w-4" strokeWidth={1.5} /> Call {SITE.phoneDisplay}</a>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </Container>
  )
}
