'use client'

import { useEffect } from 'react'
import { RotateCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { reportError } from '@/lib/observability/report'

/**
 * Workspace error boundary (Launch Readiness Phase 2). Warm, human, never technical, and Connect-honest
 * (no Care/Guardian language). Reports to Sentry when configured (no-op otherwise).
 */
export default function WorkspaceError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => reportError(error), [error])
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-5 px-6 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-full bg-surface-accent text-brand">
        <RotateCw className="h-6 w-6" strokeWidth={1.5} />
      </span>
      <div>
        <h1 className="text-h3 text-content">Something didn’t load</h1>
        <p className="mt-3 text-body text-content-muted">
          That’s on us, not you — nothing you’ve shared is lost. Please try again.
        </p>
      </div>
      <Button onClick={reset}>Try again</Button>
    </div>
  )
}
