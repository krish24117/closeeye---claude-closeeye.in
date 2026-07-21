'use client'

/**
 * INTELLIGENCE — Cloza's home, now live for the Founder. Cloza is a platform capability: this tab
 * just mounts the reusable engine + UI with a Founder snapshot. The first experience is the executive
 * one the founder asked for — Daily Briefing, Ask Cloza, recommended questions, executive insights,
 * action recommendations — every line grounded in live Close Eye data and tagged for what it is.
 */
import * as React from 'react'
import { Loader2 } from 'lucide-react'
import { ErrorState } from '@/components/ui/states'
import { useFamilyData } from '@/components/family/family-data-provider'
import { fetchAdminOverview, fetchGuardianOverview, fetchPresenceOverview, fetchAdminOperations } from '@/lib/db/admin'
import { fetchFounderToday } from '@/lib/db/founder-workspace'
import { composeFounderBriefing } from '@/lib/founder-briefing'
import { daysUntilLaunch } from '@/lib/launch'
import { clozaCapability, type ClozaContext, type FounderSnapshot } from '@/lib/cloza/engine'
import { ClozaPanel, ClozaAnswerCard } from '@/components/cloza/cloza-panel'
import { PageTitle, SectionLabel, Brief } from '@/components/admin/founder-workspace'

const firstName = (full: string | null | undefined) => (full || '').trim().split(/\s+/)[0] || ''

export default function FounderIntelligencePage() {
  const { identity } = useFamilyData()
  const [snap, setSnap] = React.useState<FounderSnapshot | null>(null)
  const [error, setError] = React.useState(false)

  const load = React.useCallback(() => {
    setError(false); setSnap(null)
    Promise.all([fetchAdminOverview(), fetchFounderToday(), fetchGuardianOverview(), fetchPresenceOverview(), fetchAdminOperations()])
      .then(([overview, today, guardian, presence, operations]) => {
        setSnap({ name: firstName(identity.fullName), today, overview, guardian, presence, operations, daysToLaunch: daysUntilLaunch() })
      })
      .catch(() => setError(true))
  }, [identity.fullName])
  React.useEffect(() => { load() }, [load])

  if (error) return <ErrorState title="Couldn’t reach Cloza" message="Please try again in a moment." onRetry={load} retryLabel="Try again" />
  if (!snap) return <div className="grid place-items-center py-24"><Loader2 className="h-6 w-6 animate-spin text-green" strokeWidth={2} /></div>

  const ctx: ClozaContext = {
    role: 'founder',
    scope: { role: 'founder', userName: snap.name, page: '/admin/founder/intelligence', region: 'IN', dateRange: { label: 'today' } },
    founder: snap,
  }
  const briefing = composeFounderBriefing({
    name: snap.name, today: snap.today,
    foundingMembers: snap.overview.foundingMembers,
    newFamiliesMonth: snap.overview.newFamiliesMonth,
    revenueMonth: snap.overview.revenueMonth,
    alerts: snap.overview.alerts,
    presenceToday: snap.overview.presenceToday,
    daysToLaunch: snap.daysToLaunch,
  })

  return (
    <div className="flex flex-col gap-10">
      <PageTitle title="Intelligence" subtitle="Cloza — your executive copilot. Ask about the business in plain language; every answer is grounded in Close Eye’s live data and labelled for what it is." />

      <section>
        <SectionLabel>Daily briefing</SectionLabel>
        <Brief briefing={briefing} footnote="Composed from today’s live data — the same brief you see on Today." />
      </section>

      <section>
        <SectionLabel>Ask Cloza</SectionLabel>
        <ClozaPanel ctx={ctx} />
      </section>

      <section>
        <SectionLabel>Executive insights</SectionLabel>
        <div className="grid gap-4 lg:grid-cols-3">
          <ClozaAnswerCard answer={clozaCapability(ctx, 'growth')} />
          <ClozaAnswerCard answer={clozaCapability(ctx, 'revenue')} />
          <ClozaAnswerCard answer={clozaCapability(ctx, 'operations')} />
        </div>
      </section>

      <section>
        <SectionLabel>Action recommendations</SectionLabel>
        <ClozaAnswerCard answer={clozaCapability(ctx, 'actions')} />
      </section>
    </div>
  )
}
