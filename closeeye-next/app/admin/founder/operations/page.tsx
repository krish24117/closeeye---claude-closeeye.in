'use client'

/**
 * OPERATIONS — company health. Live field numbers reuse the existing overview readers
 * (fetchGuardianOverview / fetchPresenceOverview / fetchAdminOperations); service-level metrics not
 * yet instrumented stay honest "Coming soon". Deep-links hand off to the real operational consoles —
 * the workspace summarizes, it never operates.
 */
import * as React from 'react'
import { Loader2 } from 'lucide-react'
import { ErrorState } from '@/components/ui/states'
import { fetchGuardianOverview, fetchPresenceOverview, fetchAdminOperations, type GuardianOverview, type PresenceOverview, type AdminOperations } from '@/lib/db/admin'
import { PageTitle, SectionLabel, Figure, FigureRow, DeepLink } from '@/components/admin/founder-workspace'

export default function FounderOperationsPage() {
  const [g, setG] = React.useState<GuardianOverview | null>(null)
  const [p, setP] = React.useState<PresenceOverview | null>(null)
  const [o, setO] = React.useState<AdminOperations | null>(null)
  const [error, setError] = React.useState(false)

  const load = React.useCallback(() => {
    setError(false); setG(null); setP(null); setO(null)
    Promise.all([fetchGuardianOverview(), fetchPresenceOverview(), fetchAdminOperations()])
      .then(([a, b, c]) => { setG(a); setP(b); setO(c) })
      .catch(() => setError(true))
  }, [])
  React.useEffect(() => { load() }, [load])

  if (error) return <ErrorState title="Couldn’t load Operations" message="Please try again in a moment." onRetry={load} retryLabel="Try again" />
  if (!g || !p || !o) return <div className="grid place-items-center py-24"><Loader2 className="h-6 w-6 animate-spin text-green" strokeWidth={2} /></div>

  return (
    <div className="flex flex-col gap-10">
      <PageTitle title="Operations" subtitle="Company health — the people and coverage that turn intelligence into real-world presence." />
      <section>
        <SectionLabel>Field operations</SectionLabel>
        <FigureRow>
          <Figure label="Guardians active" value={g.active} />
          <Figure label="Visits today" value={g.visitsToday} />
          <Figure label="Open cases" value={p.openCases} />
          <Figure label="Due today" value={p.dueToday} />
          <Figure label="Cities covered" value={o.coverage.length} />
          <Figure label="Pending applications" value={g.pendingApplications} />
        </FigureRow>
      </section>
      <section>
        <SectionLabel>Service levels</SectionLabel>
        <FigureRow>
          <Figure label="Emergency queue" soon="needs urgent-dispatch instrumentation" />
          <Figure label="SLA at risk" soon="needs response SLAs" />
          <Figure label="Response times" soon="needs first-response timestamps" />
          <Figure label="Care coordination" soon="needs coordination-workflow metrics" />
        </FigureRow>
      </section>
      <div className="flex flex-wrap gap-2.5">
        <DeepLink href="/admin/guardian" label="Guardian overview" />
        <DeepLink href="/admin/presence" label="Presence overview" />
        <DeepLink href="/pm" label="PM Console" />
        <DeepLink href="/admin/coverage" label="Coverage" />
      </div>
    </div>
  )
}
