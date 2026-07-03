import { useState, useEffect } from 'react'
import { WifiOff } from 'lucide-react'

export function OfflineBanner() {
  const [offline, setOffline] = useState(!navigator.onLine)

  useEffect(() => {
    const onOnline  = () => setOffline(false)
    const onOffline = () => setOffline(true)
    window.addEventListener('online',  onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('online',  onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  if (!offline) return null

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed', top: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 480, zIndex: 9999,
        background: '#1C1C1E', color: '#fff',
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '10px 16px', fontSize: 13, fontWeight: 500,
        paddingTop: 'calc(10px + env(safe-area-inset-top))',
      }}
    >
      <WifiOff size={14} style={{ flexShrink: 0 }} />
      No internet connection — changes will not be saved.
    </div>
  )
}
