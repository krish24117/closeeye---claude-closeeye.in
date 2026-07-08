'use client'

import { useEffect, useState } from 'react'
import { CloudOff } from 'lucide-react'

/** A calm, global offline banner — your work is safe and will sync when you're back. */
export function OfflineBanner() {
  const [offline, setOffline] = useState(false)

  useEffect(() => {
    const sync = () => setOffline(typeof navigator !== 'undefined' && !navigator.onLine)
    sync()
    window.addEventListener('online', sync)
    window.addEventListener('offline', sync)
    return () => {
      window.removeEventListener('online', sync)
      window.removeEventListener('offline', sync)
    }
  }, [])

  if (!offline) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="ce-fade-in fixed inset-x-0 bottom-0 z-[200] flex items-center justify-center gap-2 border-t border-warning/30 bg-warning/[0.12] px-4 py-2.5 text-caption font-medium text-warning backdrop-blur"
      style={{ paddingBottom: 'calc(0.625rem + env(safe-area-inset-bottom))' }}
    >
      <CloudOff className="h-4 w-4 shrink-0" strokeWidth={1.75} />
      You’re offline — your changes are saved and will sync automatically.
    </div>
  )
}
