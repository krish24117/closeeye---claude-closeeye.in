'use client'

/**
 * Guardian — a read-only overview of the Care network for the Operations Workspace. It summarizes;
 * it never operates. Live numbers come from fetchGuardianOverview; anything not yet instrumented is
 * an honest "Coming soon". The deep-link hands off to the existing Care Team console for any action.
 */
import * as React from 'react'
import { Loader2 } from 'lucide-react'
import { ErrorState } from '@/components/ui/states'
import { fetchGuardianOverview, type GuardianOverview } from '@/lib/db/admin'
import { OverviewCard, type Metric } from '@/components/admin/overview'

export default function AdminGuardianPage() {
  const [d, setD] = React.useState<GuardianOverview | null>(null)
  const [error, setError] = React.useState(false)

  const load = React.useCallback(() => {
    setError(false); setD(null)
    fetchGuardianOverview().then(setD).catch(() => setError(true))
  }, [])
  React.useEffect(() => { load() }, [load])

  const metrics: Metric[] = d && [
    { label: 'Guardians active', value: d.active, hint: 'approved & ready' },
    { label: 'Today’s visits', value: d.visitsToday, hint: 'scheduled today' },
    { label: 'Pending applications', value: d.pendingApplications, hint: 'awaiting review' },
    { label: 'Guardians online', comingSoon: 'Lights up once the Guardian app reports live presence.' },
    { label: 'Emergency assignments', comingSoon: 'Populates when urgent dispatch is instrumented.' },
    { label: 'Avg response time', comingSoon: 'Needs first-response timestamps on assignments.' },
  ] || []

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-h3 text-ink">Guardian</h1>
        <p className="mt-1 text-body-sm text-muted">A read-only view of the Care network. Manage people and applications in the Care Team console.</p>
      </div>
      {error ? (
        <ErrorState title="Couldn’t load Guardian overview" message="Please try again in a moment." onRetry={load} retryLabel="Try again" />
      ) : !d ? (
        <div className="grid place-items-center py-20"><Loader2 className="h-6 w-6 animate-spin text-green" strokeWidth={2} /></div>
      ) : (
        <OverviewCard
          title="Guardian operations"
          subtitle="Live from the Care network"
          metrics={metrics}
          action={{ href: '/admin/care-team', label: 'Manage Care Team' }}
        />
      )}
    </div>
  )
}
