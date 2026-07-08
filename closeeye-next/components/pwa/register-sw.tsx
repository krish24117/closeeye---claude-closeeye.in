'use client'

import { useEffect } from 'react'

/** Registers the service worker after load — production only, non-blocking. */
export function RegisterSW() {
  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      !('serviceWorker' in navigator) ||
      process.env.NODE_ENV !== 'production'
    ) {
      return
    }
    const onLoad = () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        /* registration is best-effort — the app works without it */
      })
    }
    window.addEventListener('load', onLoad)
    return () => window.removeEventListener('load', onLoad)
  }, [])

  return null
}
