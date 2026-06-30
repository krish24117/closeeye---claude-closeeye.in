import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'

const DISMISSED_KEY = 'ce_install_dismissed'
const COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000 // re-show after 7 days

function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as any).standalone === true
  )
}

function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

function wasDismissedRecently() {
  const ts = localStorage.getItem(DISMISSED_KEY)
  return !!ts && Date.now() - Number(ts) < COOLDOWN_MS
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [show, setShow] = useState(false)
  const [ios, setIos] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (isStandalone() || wasDismissedRecently()) return

    if (isIOS()) {
      timerRef.current = setTimeout(() => { setIos(true); setShow(true) }, 4000)
      return () => { if (timerRef.current) clearTimeout(timerRef.current) }
    }

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      timerRef.current = setTimeout(() => setShow(true), 4000)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, String(Date.now()))
    setShow(false)
  }

  async function install() {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') setShow(false)
    else dismiss()
  }

  if (!show) return null

  return (
    <div
      role="dialog"
      aria-label="Install Close Eye"
      style={{
        position: 'fixed',
        bottom: 'calc(76px + env(safe-area-inset-bottom) + 12px)',
        left: 16,
        right: 16,
        background: '#fff',
        borderRadius: 20,
        boxShadow: '0 8px 40px rgba(14,42,31,0.18)',
        padding: '18px 18px 16px',
        zIndex: 400,
        border: '1px solid var(--gray-light)',
        animation: 'ce-slide-up 0.35s cubic-bezier(0.34,1.56,0.64,1) both',
      }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <img
          src="/icons/icon-192.png"
          alt=""
          width={48}
          height={48}
          style={{ borderRadius: 12, flexShrink: 0, boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--forest)', margin: '0 0 3px', lineHeight: 1.3 }}>
            Add Close Eye to your home screen
          </p>
          <p style={{ fontSize: 13, color: 'var(--gray-mid)', margin: 0, lineHeight: 1.4 }}>
            Book visits, read reports and ask us anything — one tap away.
          </p>
        </div>
        <button
          onClick={dismiss}
          aria-label="Dismiss"
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            padding: '2px 2px', color: 'var(--gray-mid)', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            minWidth: 32, minHeight: 32, marginTop: -2,
          }}
        >
          <X size={18} />
        </button>
      </div>

      {/* iOS manual instructions */}
      {ios && (
        <div style={{
          marginTop: 12,
          background: 'var(--cream)',
          borderRadius: 12,
          padding: '11px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}>
          <span style={{ fontSize: 20, flexShrink: 0 }}>⬆️</span>
          <p style={{ fontSize: 13, color: 'var(--forest)', margin: 0, lineHeight: 1.4 }}>
            Tap <strong>Share</strong> at the bottom of Safari, then tap{' '}
            <strong>"Add to Home Screen"</strong>
          </p>
        </div>
      )}

      {/* Buttons */}
      <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
        <button
          onClick={dismiss}
          style={{
            flex: ios ? 1 : undefined,
            minWidth: ios ? 0 : 'auto',
            padding: ios ? '10px 0' : '10px 18px',
            background: 'var(--cream)', color: 'var(--gray-mid)',
            border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}
        >
          {ios ? 'Got it' : 'Not now'}
        </button>
        {!ios && (
          <button
            onClick={install}
            style={{
              flex: 1, padding: '10px 0',
              background: 'var(--forest)', color: '#fff',
              border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer',
            }}
          >
            Install app
          </button>
        )}
      </div>
    </div>
  )
}
