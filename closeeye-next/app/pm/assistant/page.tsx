'use client'

/**
 * Cloza for the Presence Manager — the same engine + UI as the Founder's, mounted with a PM snapshot.
 * It reads the PM's own live caseload (RLS-scoped) and answers about attention, today's schedule,
 * escalations and Guardians. Proof of the platform: a whole new role's copilot with no new engine and
 * no new UI — just a provider and this thin page.
 */
import * as React from 'react'
import { Loader2 } from 'lucide-react'
import { ErrorState } from '@/components/ui/states'
import { useFamilyData } from '@/components/family/family-data-provider'
import { fetchConsoleOverview, fetchActiveIncidents, fetchConsoleGuardians } from '@/lib/db/console'
import { clozaBriefing, type ClozaContext, type PresenceSnapshot } from '@/lib/cloza/engine'
import { ClozaPanel, ClozaAnswerCard } from '@/components/cloza/cloza-panel'

const firstName = (full: string | null | undefined) => (full || '').trim().split(/\s+/)[0] || ''

export default function PmAssistantPage() {
  const { identity } = useFamilyData()
  const [snap, setSnap] = React.useState<PresenceSnapshot | null>(null)
  const [error, setError] = React.useState(false)

  const load = React.useCallback(() => {
    setError(false); setSnap(null)
    Promise.all([fetchConsoleOverview(), fetchActiveIncidents(), fetchConsoleGuardians()])
      .then(([overview, incidents, guardians]) => setSnap({ name: firstName(identity.fullName), overview, incidents, guardians }))
      .catch(() => setError(true))
  }, [identity.fullName])
  React.useEffect(() => { load() }, [load])

  if (error) return <ErrorState title="Couldn’t reach Cloza" message="Please try again in a moment." onRetry={load} retryLabel="Try again" />
  if (!snap) return <div className="grid place-items-center py-24"><Loader2 className="h-6 w-6 animate-spin text-green" strokeWidth={2} /></div>

  const ctx: ClozaContext = {
    role: 'presence_manager',
    scope: { role: 'presence_manager', userName: snap.name, page: '/pm/assistant', dateRange: { label: 'today' } },
    presence: snap,
  }
  const briefing = clozaBriefing(ctx)

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-h2 text-ink">Cloza</h1>
        <p className="mt-1 text-body-sm text-muted">Your presence copilot — grounded in your live caseload.</p>
      </div>
      {briefing && (
        <section className="flex flex-col gap-4">
          <p className="text-caption font-semibold uppercase tracking-widest text-muted">Your day</p>
          <ClozaAnswerCard answer={briefing} />
        </section>
      )}
      <section className="flex flex-col gap-4">
        <p className="text-caption font-semibold uppercase tracking-widest text-muted">Ask Cloza</p>
        <ClozaPanel ctx={ctx} />
      </section>
    </div>
  )
}
