import { useEffect, useId, useRef, useState } from 'react'
import { X, Loader2, Check } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { paiseToUsdApprox, type ServiceItem } from '@/lib/services-catalog'

interface Props {
  service: ServiceItem | null
  onClose: () => void
  onSubmitted: (service: ServiceItem) => void
}

// Current IST wall-clock as a datetime-local value (yyyy-MM-ddTHH:mm)
function nowIstLocalValue(): string {
  const p = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(new Date())
  const g = (t: string) => p.find(x => x.type === t)?.value ?? '00'
  return `${g('year')}-${g('month')}-${g('day')}T${g('hour') === '24' ? '00' : g('hour')}:${g('minute')}`
}

// Friendly read-back of the entered IST wall-clock (no tz conversion — entry IS IST)
function formatIst(value: string): string {
  if (!value) return ''
  const [d, t] = value.split('T')
  const [y, m, day] = d.split('-').map(Number)
  const [hh, mm] = t.split(':').map(Number)
  const date = new Date(y, m - 1, day, hh, mm)
  const ds = date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
  const ts = date.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true })
  return `${ds}, ${ts} IST`
}

export function BookingDrawer({ service, onClose, onSubmitted }: Props) {
  const open = !!service
  const panelRef = useRef<HTMLDivElement>(null)
  const restoreFocusRef = useRef<HTMLElement | null>(null)
  const titleId = useId()

  const [variantId, setVariantId] = useState('')
  const [when, setWhen] = useState('')
  const [recipientName, setRecipientName] = useState('')
  const [recipientAddress, setRecipientAddress] = useState('')
  const [requesterWhatsapp, setRequesterWhatsapp] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Reset fields whenever a new service opens the drawer
  useEffect(() => {
    if (service) {
      setVariantId(service.variants ? '' : '')
      setWhen(''); setRecipientName(''); setRecipientAddress('')
      setRequesterWhatsapp(''); setNotes(''); setError('')
    }
  }, [service])

  // Focus trap, Escape, restore focus to the trigger on close
  useEffect(() => {
    if (!open) return
    restoreFocusRef.current = document.activeElement as HTMLElement
    const panel = panelRef.current
    if (!panel) return
    const focusables = () => Array.from(panel.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    ))
    const raf = requestAnimationFrame(() => focusables()[0]?.focus())
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); return }
      if (e.key !== 'Tab') return
      const f = focusables()
      if (!f.length) return
      const first = f[0], last = f[f.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      cancelAnimationFrame(raf)
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
      restoreFocusRef.current?.focus()
    }
  }, [open, onClose])

  if (!service) return null

  // Resolve the chargeable amount: a range MUST be narrowed to a variant first.
  const selectedVariant = service.variants?.find(v => v.id === variantId)
  const priceLabel = service.variants ? (selectedVariant?.priceLabel ?? service.priceLabel) : service.priceLabel
  const amountPaise = service.variants ? selectedVariant?.amountPaise ?? null : service.amountPaise
  const needsVariant = !!service.variants && !selectedVariant

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!service) return
    if (needsVariant) { setError('Please choose an option for this service.'); return }
    setSubmitting(true); setError('')
    try {
      // REQUEST flow: no payment here. We save an unpaid request; ops confirm a
      // companion, then send a payment link. Persisted server-side.
      const { error: fnErr } = await supabase.functions.invoke('submit-booking-request', {
        body: {
          service_id: service.id,
          service_name: service.name,
          variant_id: selectedVariant?.id ?? null,
          amount_paise: amountPaise,
          scheduled_at_ist: when ? `${when}:00+05:30` : null,
          recipient_name: recipientName.trim(),
          recipient_address: recipientAddress.trim(),
          requester_whatsapp: requesterWhatsapp.trim(),
          notes: notes.trim() || null,
        },
      })
      if (fnErr) throw fnErr
      onSubmitted(service)
      onClose()
    } catch {
      setError("Couldn't send your request. Please try again or WhatsApp us.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="ce-drawer-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div
        ref={panelRef}
        className="ce-drawer-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="ce-drawer-head">
          <div>
            <p className="ce-drawer-eyebrow">Request a visit</p>
            <h2 id={titleId} className="ce-drawer-title">{service.name}</h2>
          </div>
          <button type="button" className="ce-drawer-close" aria-label="Close" onClick={onClose}>
            <X size={22} />
          </button>
        </div>

        <form className="ce-drawer-body" onSubmit={handleSubmit}>
          {/* Read-only service + price (price fixed before any payment) */}
          <div className="ce-drawer-price">
            <span>Service</span>
            <strong>{service.name}{selectedVariant ? ` · ${selectedVariant.label}` : ''}</strong>
            <span>Price</span>
            <strong>
              {priceLabel}
              {amountPaise != null && <em className="ce-drawer-usd"> ({paiseToUsdApprox(amountPaise)}, billed in INR)</em>}
            </strong>
          </div>

          {service.variants && (
            <fieldset className="ce-drawer-field">
              <legend>Choose an option <span className="ce-req">*</span></legend>
              <div className="ce-drawer-variants">
                {service.variants.map(v => (
                  <label key={v.id} className={`ce-variant${variantId === v.id ? ' is-sel' : ''}`}>
                    <input
                      type="radio" name="variant" value={v.id}
                      checked={variantId === v.id}
                      onChange={() => setVariantId(v.id)}
                    />
                    <span className="ce-variant-label">{v.label}</span>
                    <span className="ce-variant-price">{v.priceLabel}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          <label className="ce-drawer-field">
            <span>Preferred date &amp; time <span className="ce-req">*</span> <em>(IST — India time)</em></span>
            <input
              type="datetime-local" required value={when} min={nowIstLocalValue()}
              onChange={e => setWhen(e.target.value)}
            />
            {when && <p className="ce-drawer-hint">You selected: {formatIst(when)}</p>}
          </label>

          <label className="ce-drawer-field">
            <span>Parent's name <span className="ce-req">*</span></span>
            <input type="text" required value={recipientName} onChange={e => setRecipientName(e.target.value)} placeholder="e.g. Mrs. Lakshmi Devi" />
          </label>

          <label className="ce-drawer-field">
            <span>Parent's address <span className="ce-req">*</span></span>
            <textarea required rows={2} value={recipientAddress} onChange={e => setRecipientAddress(e.target.value)} placeholder="Flat / house, society, area, city" />
          </label>

          <label className="ce-drawer-field">
            <span>Your WhatsApp number <span className="ce-req">*</span></span>
            <input type="tel" required value={requesterWhatsapp} onChange={e => setRequesterWhatsapp(e.target.value)} placeholder="+1 / +91 …" />
          </label>

          <label className="ce-drawer-field">
            <span>Notes <em>(optional)</em></span>
            <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Anything we should know — mobility, language, medicines…" />
          </label>

          {error && <p className="ce-drawer-error">{error}</p>}

          <p className="ce-drawer-note">
            <Check size={14} /> We'll confirm a companion is available, then send a secure payment link. You're not charged yet.
          </p>

          <button type="submit" className="ce-drawer-submit" disabled={submitting}>
            {submitting ? <><Loader2 size={16} className="ce-spin" /> Sending…</> : 'Send request'}
          </button>
        </form>
      </div>
    </div>
  )
}
