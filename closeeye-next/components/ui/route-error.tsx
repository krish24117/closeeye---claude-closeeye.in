'use client'

import { useEffect } from 'react'
import { ErrorState } from '@/components/ui/states'
import { reportError } from '@/lib/observability/report'

/** Shared route error boundary UI — warm, never technical, always offers recovery. Reports to Sentry. */
export function RouteError({ error, reset }: { error?: unknown; reset: () => void }) {
  useEffect(() => { if (error !== undefined) reportError(error) }, [error])
  return (
    <ErrorState
      title="Something went wrong"
      message="That view didn’t load just now. Please try again — nothing was lost."
      onRetry={reset}
      className="min-h-[60vh]"
    />
  )
}
