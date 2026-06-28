import { useEffect, useState } from 'react'
import { X, Share, Download } from 'lucide-react'

const IOS_KEY     = 'closeeye-ios-a2hs-dismissed'
const ANDROID_KEY = 'closeeye-android-a2hs-dismissed'

// beforeinstallprompt is captured early in index.html before React loads.
// We read it from the global and listen for the custom event that fires when
// it becomes available (race-safe for slow-loading React).
declare global {
  interface Window {
    __ceInstallPrompt?: BeforeInstallPromptEvent | null
  }
}
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function IOSInstallBanner() {
  const [showIOS, setShowIOS]         = useState(false)
  const [androidPrompt, setAndroid]   = useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    const isStandalone =
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true ||
      window.matchMedia('(display-mode: standalone)').matches

    if (isStandalone) return // already installed — show nothing

    // iOS: show "Add to Home Screen" instruction banner
    const isIOS = /iphone|ipad|ipod/i.test(window.navigator.userAgent)
    if (isIOS && localStorage.getItem(IOS_KEY) !== '1') {
      setShowIOS(true)
    }

    // Android / Chrome: use the beforeinstallprompt event captured in index.html
    const syncAndroid = () => {
      const p = window.__ceInstallPrompt
      if (p && localStorage.getItem(ANDROID_KEY) !== '1') setAndroid(p)
    }
    syncAndroid()
    window.addEventListener('ce-install-ready', syncAndroid)

    // Hide when the user installs from outside our banner
    window.addEventListener('appinstalled', () => {
      window.__ceInstallPrompt = null
      setAndroid(null)
    })

    return () => window.removeEventListener('ce-install-ready', syncAndroid)
  }, [])

  function dismissIOS() {
    localStorage.setItem(IOS_KEY, '1')
    setShowIOS(false)
  }

  async function installAndroid() {
    if (!androidPrompt) return
    await androidPrompt.prompt()
    const { outcome } = await androidPrompt.userChoice
    if (outcome === 'accepted') {
      window.__ceInstallPrompt = null
      setAndroid(null)
    }
  }

  function dismissAndroid() {
    localStorage.setItem(ANDROID_KEY, '1')
    setAndroid(null)
  }

  // Android install banner
  if (androidPrompt) {
    return (
      <div style={{ background: 'var(--forest)', color: '#fff', padding: '10px 48px 10px 16px', display: 'flex', alignItems: 'center', gap: 12, position: 'relative' }}>
        <Download size={18} style={{ flexShrink: 0, color: 'var(--sage)' }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 600, lineHeight: 1.4 }}>Add Close Eye to your Home Screen</p>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 1.3 }}>Works offline · instant access · no browser bar</p>
        </div>
        <button
          onClick={installAndroid}
          style={{ background: 'var(--sage)', color: 'var(--forest)', fontWeight: 700, fontSize: 12, padding: '7px 14px', borderRadius: 100, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}
        >
          Install
        </button>
        <button
          onClick={dismissAndroid}
          aria-label="Dismiss"
          style={{ position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', padding: 8, display: 'flex' }}
        >
          <X size={14} />
        </button>
      </div>
    )
  }

  // iOS "Add to Home Screen" instruction banner
  if (showIOS) {
    return (
      <div style={{ background: 'var(--forest)', color: '#fff', padding: '10px 48px 10px 16px', display: 'flex', alignItems: 'center', gap: 10, position: 'relative', textAlign: 'center', justifyContent: 'center' }}>
        <p style={{ margin: 0, fontSize: 13, lineHeight: 1.4 }}>
          Add Close Eye to your Home Screen: tap <Share size={13} style={{ display: 'inline', verticalAlign: 'middle', marginBottom: 2 }} /> Share, then <strong>"Add to Home Screen"</strong>.
        </p>
        <button
          onClick={dismissIOS}
          aria-label="Dismiss"
          style={{ position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', padding: 8, display: 'flex' }}
        >
          <X size={14} />
        </button>
      </div>
    )
  }

  return null
}
