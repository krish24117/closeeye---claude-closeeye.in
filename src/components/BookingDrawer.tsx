import { useEffect, useId, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { type ServiceItem } from '@/lib/services-catalog'

interface Props {
  service:    ServiceItem | null
  onClose:    () => void
  onNavigate: (wizardId: string) => void
}

/**
 * Lightweight variant picker — only used for services that have duration/variant
 * choices (currently: hospital_assistance). All other services go straight to the
 * BookService step-by-step wizard. This drawer collects the variant, then navigates.
 */
export function BookingDrawer({ service, onClose, onNavigate }: Props) {
  const open     = !!service
  const panelRef = useRef<HTMLDivElement>(null)
  const titleId  = useId()
  const [variantId, setVariantId] = useState('')

  // Reset selection whenever a different service opens the drawer
  useEffect(() => { if (service) setVariantId('') }, [service?.id])

  // Escape key + body-scroll lock
  useEffect(() => {
    if (!open) return
    const panel = panelRef.current
    if (!panel) return
    const focusables = () =>
      Array.from(panel.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input, [tabindex]:not([tabindex="-1"])',
      ))
    const raf = requestAnimationFrame(() => focusables()[0]?.focus())
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); return }
      if (e.key !== 'Tab') return
      const f = focusables()
      if (!f.length) return
      const [first, last] = [f[0], f[f.length - 1]]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      cancelAnimationFrame(raf)
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!service?.variants) return null

  return (
    <div
      className="ce-drawer-overlay"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        ref={panelRef}
        className="ce-drawer-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        {/* Header */}
        <div className="ce-drawer-head">
          <div>
            <p className="ce-drawer-eyebrow">Choose duration</p>
            <h2 id={titleId} className="ce-drawer-title">{service.name}</h2>
          </div>
          <button
            type="button"
            className="ce-drawer-close"
            aria-label="Close"
            onClick={onClose}
          >
            <X size={22} />
          </button>
        </div>

        {/* Body — variants only */}
        <div className="ce-drawer-body" style={{ gap: 20 }}>
          <div className="ce-drawer-variants">
            {service.variants.map(v => (
              <label
                key={v.id}
                className={`ce-variant${variantId === v.id ? ' is-sel' : ''}`}
              >
                <input
                  type="radio"
                  name="variant"
                  value={v.id}
                  checked={variantId === v.id}
                  onChange={() => setVariantId(v.id)}
                />
                <span className="ce-variant-label">{v.label}</span>
                <span className="ce-variant-price">{v.priceLabel}</span>
              </label>
            ))}
          </div>

          <p style={{ fontSize: 12, color: 'var(--gray-mid)', textAlign: 'center', margin: 0 }}>
            No payment today — we confirm your companion first.
          </p>

          <button
            className="ce-drawer-submit"
            disabled={!variantId}
            onClick={() => { if (variantId) onNavigate(variantId) }}
          >
            Continue →
          </button>
        </div>
      </div>
    </div>
  )
}
