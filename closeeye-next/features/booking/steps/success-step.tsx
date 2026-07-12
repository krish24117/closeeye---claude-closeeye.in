'use client'

import Link from 'next/link'
import { Check, MessageCircle, MoveRight, Home as HomeIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useBooking } from '../state'
import { serviceById } from '../schema'
import { whatsappConfirmationLink } from '../api'

export function SuccessStep() {
  const { data, ref } = useBooking()
  const service = serviceById(data.serviceId)
  const waLink = whatsappConfirmationLink(data, ref ?? '')

  return (
    <div className="mx-auto flex max-w-xl flex-col items-center py-6 text-center">
      <span className="grid h-16 w-16 place-items-center rounded-full bg-success/12 text-success">
        <Check className="h-8 w-8" strokeWidth={2} />
      </span>

      <h1 className="mt-7 text-h2">You&apos;re not alone anymore.</h1>
      <p className="mt-4 text-lead text-muted">
        Your Presence Manager has received your request. We&apos;re matching the best
        Guardian for {data.name ? <span className="text-ink">{data.name}</span> : 'your family'}. Once we
        confirm, you&apos;ll get a secure payment link on WhatsApp to lock in the visit.
      </p>

      {ref && (
        <div className="mt-8 inline-flex items-center gap-3 rounded-md border border-line bg-card px-5 py-3 shadow-sm">
          <span className="text-caption uppercase tracking-widest text-muted">Reference</span>
          <span className="text-body font-semibold text-ink">{ref}</span>
        </div>
      )}

      {/* What happens next */}
      <ul className="mt-9 flex w-full flex-col gap-3 text-left">
        {[
          `Your Presence Manager reviews your ${service?.name ?? 'visit'} request`,
          'We confirm a verified Guardian is available near you',
          'You get a secure payment link on WhatsApp to confirm the visit',
        ].map((t, i) => (
          <li key={t} className="flex items-start gap-3 rounded-md border border-line bg-card px-5 py-4 shadow-sm">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-accent-soft text-caption font-semibold text-green">
              {i + 1}
            </span>
            <span className="text-body-sm text-ink">{t}</span>
          </li>
        ))}
      </ul>

      <div className="mt-9 flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
        <Button asChild size="lg">
          <a href={waLink} target="_blank" rel="noopener noreferrer">
            Track on WhatsApp <MoveRight className="h-5 w-5" strokeWidth={1.5} />
          </a>
        </Button>
        <Button asChild size="lg" variant="secondary">
          <a href={waLink} target="_blank" rel="noopener noreferrer">
            <MessageCircle className="h-5 w-5" strokeWidth={1.5} /> WhatsApp us
          </a>
        </Button>
      </div>

      <Button asChild variant="text" className="mt-6">
        <Link href="/">
          <HomeIcon className="h-4 w-4" strokeWidth={1.5} /> Back to home
        </Link>
      </Button>
    </div>
  )
}
