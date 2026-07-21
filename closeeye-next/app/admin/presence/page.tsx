'use client'

/**
 * Presence Manager — a read-only executive overview of PM operations for the Operations Workspace.
 * It gives leadership visibility without touching the operational tool: the deep-link hands off to
 * the existing /pm console for the real work. Live numbers from fetchPresenceOverview; everything
 * not yet instrumented is an honest "Coming soon", never estimated.
 */
import * as React from 'react'
import { Loader2 } from 'lucide-react'
import { ErrorState } from '@/components/ui/states'
import { fetchPresenceOverview, type PresenceOverview } from '@/lib/db/admin'
import { OverviewCard, type Metric } from '@/components/admin/overview'

export default function AdminPresencePage() {
  const [d, setD] = React.useState<PresenceOverview | null>(null)
  const [error, setError] = React.useState(false)

  const load = React.useCallback(() => {
    setError(false); setD(null)
    fetchPresenceOverview().then(setD).catch(() => setError(true))
  }, [])
  React.useEffect(() => { load() }, [load])

  const metrics: Metric[] = d && [
    { label: 'Open cases', value: d.openCases, hint: 'visits needing attention' },
    { label: 'Due today', value: d.dueToday, hint: 'open visits scheduled today' },
    { label: 'Active PMs', comingSoon: 'Needs a Presence-Manager roster to count from.' },
    { label: 'SLA at risk', comingSoon: 'Populates once response SLAs are defined.' },
    { label: 'Avg resolution time', comingSoon: 'Needs case open/close timestamps.' },
  ] || []

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-h3 text-ink">Presence Manager</h1>
        <p className="mt-1 text-body-sm text-muted">A read-only view of Presence operations. Run cases and schedules from the PM Console.</p>
      </div>
      {error ? (
        <ErrorState title="Couldn’t load Presence overview" message="Please try again in a moment." onRetry={load} retryLabel="Try again" />
      ) : !d ? (
        <div className="grid place-items-center py-20"><Loader2 className="h-6 w-6 animate-spin text-green" strokeWidth={2} /></div>
      ) : (
        <OverviewCard
          title="Presence operations"
          subtitle="Live case load"
          metrics={metrics}
          action={{ href: '/pm', label: 'View PM Console' }}
        />
      )}
    </div>
  )
}
