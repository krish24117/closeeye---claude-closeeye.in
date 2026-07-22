'use client'

import { useEffect } from 'react'
import { initAnalytics } from '@/lib/analytics'

/**
 * Mounts once at the app root and initialises analytics — but only if a PostHog key is configured
 * (initAnalytics is a no-op otherwise). Renders nothing.
 */
export function AnalyticsProvider() {
  useEffect(() => {
    initAnalytics()
  }, [])
  return null
}
