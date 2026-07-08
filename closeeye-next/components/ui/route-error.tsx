'use client'

import { ErrorState } from '@/components/ui/states'

/** Shared route error boundary UI — warm, never technical, always offers recovery. */
export function RouteError({ reset }: { reset: () => void }) {
  return (
    <ErrorState
      title="Something went wrong"
      message="That view didn’t load just now. Please try again — nothing was lost."
      onRetry={reset}
      className="min-h-[60vh]"
    />
  )
}
