'use client'

import { useEffect, useState } from 'react'
import { ArrowLeft, Check, Headset, ShieldCheck, Loader2, Phone, MessageCircle, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useBooking } from '../state'
import { submitBooking } from '../api'
import {
  serviceById,
  PURPOSES,
  TIME_SLOTS,
  PAYMENT_METHODS,
} from '../schema'
import { whatsappLink, SITE } from '@/lib/site'
import { cn } from '@/lib/utils'

const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms))

const PM_PROMISES = [
  'Understand your family’s needs',
  'Assign the right Guardian',
  'Coordinate the visit end to end',
  'Keep you informed at every step',
  'Be available whenever you need support',
]

const LOADING_MESSAGES = [
  'Preparing your booking…',
  'Finding the right Guardian…',
  'Assigning your Presence Manager…',
]

export function ReviewStep() {
  const { data, patch, status, setStatus, submitted, goto, back } = useBooking()
  const [payment, setPayment] = useState(data.paymentMethod)
  const [payError, setPayError] = useState<string>()

  const service = serviceById(data.serviceId)
  const base = service?.priceValue ?? 0
  const taxes = Math.round(base * 0.18)
  const total = base + taxes
  const purposeLabel = PURPOSES.find((p) => p.id === data.purpose)?.label
  const slotLabel = TIME_SLOTS.find((s) => s.id === data.timeSlot)?.label

  async function confirm() {
    if (status === 'submitting') return // guard against double-tap / retry re-entry (server also dedups)
    if (!payment) {
      setPayError('Choose how you’d like to pay')
      return
    }
    patch({ paymentMethod: payment })
    setStatus('submitting')
    try {
      const [result] = await Promise.all([submitBooking({ ...data, paymentMethod: payment }), delay(2000)])
      submitted(result.ref)
    } catch {
      setStatus('error')
    }
  }

  if (status === 'submitting') return <SubmitLoading />
  if (status === 'error') return <SubmitError onRetry={confirm} onBack={() => setStatus('idle')} />

  return (
    <div className="flex flex-col">
      <span className="text-caption font-semibold uppercase tracking-widest text-green">Step 6 of 6</span>
      <h1 className="mt-3 text-h3">Review your booking</h1>
      <p className="mt-3 max-w-xl text-body text-muted">
        A quick look before you confirm. Nothing is charged until you tap confirm.
      </p>

      {/* Order summary */}
      <dl className="mt-8 overflow-hidden rounded-md border border-line bg-card shadow-sm">
        <Row label="Visit" value={service?.name} onEdit={() => goto(0)} />
        <Row
          label="Family member"
          value={`${data.name ?? '—'}${data.relationship ? ` · ${data.relationship}` : ''}${data.city ? ` · ${data.city}` : ''}`}
          onEdit={() => goto(1)}
        />
        <Row label="Reason" value={purposeLabel} onEdit={() => goto(2)} />
        <Row label="Date & time" value={[data.date, slotLabel].filter(Boolean).join(' · ')} onEdit={() => goto(3)} />
        <Row label="Address" value={data.address} onEdit={() => goto(1)} />
        <Row label="Contact" value={[data.yourName, data.phone].filter(Boolean).join(' · ')} onEdit={() => goto(4)} />
      </dl>

      {/* Price — transparent */}
      <div className="mt-6 overflow-hidden rounded-md border border-line bg-card shadow-sm">
        <div className="flex items-center justify-between px-6 py-3.5 text-body-sm">
          <span className="text-muted">{service?.name} (starting)</span>
          <span className="text-ink">{inr(base)}</span>
        </div>
        <div className="flex items-center justify-between border-t border-line px-6 py-3.5 text-body-sm">
          <span className="text-muted">Taxes (18% GST)</span>
          <span className="text-ink">{inr(taxes)}</span>
        </div>
        <div className="flex items-center justify-between border-t border-line bg-accent-soft/40 px-6 py-4">
          <span className="text-body font-semibold text-ink">Estimated total</span>
          <span className="text-h4 text-green">{inr(total)}</span>
        </div>
      </div>
      <p className="mt-2 text-caption text-muted">
        A starting estimate — no hidden charges. Your Presence Manager confirms the final amount before any work begins.
      </p>

      {/* Presence Manager — trust before payment */}
      <div className="mt-8 rounded-md border border-line bg-ink p-6 text-white sm:p-8">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-full bg-white/10 text-accent">
            <Headset className="h-5 w-5" strokeWidth={1.5} />
          </span>
          <div>
            <p className="text-h4 text-white">Your dedicated Presence Manager</p>
            <p className="text-caption text-white/60">One real person, with you the whole way</p>
          </div>
        </div>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {PM_PROMISES.map((p) => (
            <li key={p} className="flex items-start gap-2.5 text-body-sm text-white/85">
              <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-white/10 text-accent">
                <Check className="h-3 w-3" strokeWidth={2.5} />
              </span>
              {p}
            </li>
          ))}
        </ul>
      </div>

      {/* Payment */}
      <div className="mt-8">
        <p className="text-body-sm font-semibold text-ink">How would you like to pay?</p>
        <p className="text-caption text-muted">Simple and secure. No hidden charges.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {PAYMENT_METHODS.map((m) => {
            const selected = payment === m.id
            return (
              <button
                key={m.id}
                type="button"
                aria-pressed={selected}
                onClick={() => {
                  setPayment(m.id)
                  setPayError(undefined)
                }}
                className={cn(
                  'relative flex flex-col items-start gap-0.5 rounded-md border bg-card p-4 text-left transition-all duration-200 ease-premium',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green focus-visible:ring-offset-2 focus-visible:ring-offset-ivory',
                  selected ? 'border-green ring-1 ring-green' : 'border-line hover:border-ink/20',
                )}
              >
                {selected && (
                  <span className="absolute right-3 top-3 grid h-5 w-5 place-items-center rounded-full bg-green text-ivory">
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                )}
                <span className="text-body font-semibold text-ink">{m.label}</span>
                <span className="text-caption text-muted">{m.note}</span>
              </button>
            )
          })}
        </div>
        <p className="mt-3 flex items-center gap-2 text-caption text-muted">
          <ShieldCheck className="h-4 w-4 text-green" strokeWidth={1.5} />
          International cards coming soon. Payments are encrypted and secure.
        </p>
        {payError && <p className="mt-2 text-caption text-error">{payError}</p>}
      </div>

      {/* Actions */}
      <div className="mt-10 flex items-center justify-between gap-4">
        <Button variant="ghost" onClick={back}>
          <ArrowLeft className="h-5 w-5" strokeWidth={1.5} /> Back
        </Button>
        <Button size="lg" onClick={confirm}>
          Confirm booking
        </Button>
      </div>
      <p className="mt-3 text-right text-caption text-muted">
        By confirming, you agree to be contacted by {SITE.legalName}.
      </p>
    </div>
  )
}

function Row({ label, value, onEdit }: { label: string; value?: string; onEdit: () => void }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-4 last:border-b-0">
      <div className="min-w-0">
        <dt className="text-caption uppercase tracking-wide text-muted">{label}</dt>
        <dd className="mt-0.5 break-words text-body text-ink">{value || '—'}</dd>
      </div>
      <button
        type="button"
        onClick={onEdit}
        className="inline-flex shrink-0 items-center gap-1 rounded-sm px-2 py-1 text-caption font-medium text-green transition-colors hover:bg-accent-soft"
      >
        <Pencil className="h-3.5 w-3.5" strokeWidth={1.5} /> Edit
      </button>
    </div>
  )
}

function SubmitLoading() {
  const [i, setI] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setI((v) => (v + 1) % LOADING_MESSAGES.length), 900)
    return () => clearInterval(t)
  }, [])
  return (
    <div className="flex min-h-[24rem] flex-col items-center justify-center gap-6 text-center">
      <span className="grid h-16 w-16 place-items-center rounded-full bg-accent-soft text-green">
        <Loader2 className="h-7 w-7 animate-spin" strokeWidth={1.75} />
      </span>
      <div>
        <p className="text-h4 text-ink" aria-live="polite">{LOADING_MESSAGES[i]}</p>
        <p className="mt-2 text-body-sm text-muted">This takes just a moment. Please don’t close this page.</p>
      </div>
      <div className="flex gap-1.5" aria-hidden>
        {LOADING_MESSAGES.map((_, k) => (
          <span key={k} className={cn('h-1.5 w-1.5 rounded-full transition-colors', k === i ? 'bg-green' : 'bg-line')} />
        ))}
      </div>
    </div>
  )
}

function SubmitError({ onRetry, onBack }: { onRetry: () => void; onBack: () => void }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-5 py-10 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-full bg-error/10 text-error">
        <MessageCircle className="h-6 w-6" strokeWidth={1.5} />
      </span>
      <div>
        <h1 className="text-h3">We couldn’t complete your booking</h1>
        <p className="mt-3 text-body text-muted">
          Please try again — or reach us directly and we’ll take care of it personally.
        </p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button onClick={onRetry}>Try again</Button>
        <Button variant="secondary" onClick={onBack}>Back to review</Button>
      </div>
      <div className="mt-2 flex flex-col gap-2 text-body-sm">
        <p className="font-semibold text-ink">Need immediate help?</p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <a href={`tel:${SITE.whatsappNumber}`} className="inline-flex items-center gap-2 text-green hover:underline">
            <Phone className="h-4 w-4" strokeWidth={1.5} /> Call us
          </a>
          <a href={whatsappLink('Hi Close Eye — I had trouble completing a booking. Can you help?')} className="inline-flex items-center gap-2 text-green hover:underline">
            <MessageCircle className="h-4 w-4" strokeWidth={1.5} /> WhatsApp us
          </a>
        </div>
      </div>
    </div>
  )
}
