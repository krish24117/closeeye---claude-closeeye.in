'use client'

/**
 * TODAY — the first thing the founder sees each morning: a Daily Founder Briefing (rule-based now,
 * Cloza-written later — same card), the day at a glance, critical alerts, and system status. Every
 * number is live; the briefing invents nothing. Reads like a morning executive brief, not a console.
 */
import * as React from 'react'
import { Loader2 } from 'lucide-react'
import { ErrorState } from '@/components/ui/states'
import { useFamilyData } from '@/components/family/family-data-provider'
import { fetchAdminOverview, type AdminOverview } from '@/lib/db/admin'
import { fetchFounderToday, type FounderToday } from '@/lib/db/founder-workspace'
import { composeFounderBriefing } from '@/lib/founder-briefing'
import { daysUntilLaunch } from '@/lib/launch'
import { FounderGreeting, Brief, SectionLabel, Figure, FigureRow, CriticalAlerts, SystemStatus } from '@/components/admin/founder-workspace'

const firstName = (full: string | null | undefined) => (full || '').trim().split(/\s+/)[0] || ''
const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`

export default function FounderTodayPage() {
  const { identity } = useFamilyData()
  const [ov, setOv] = React.useState<AdminOverview | null>(null)
  const [today, setToday] = React.useState<FounderToday | null>(null)
  const [error, setError] = React.useState(false)

  const load = React.useCallback(() => {
    setError(false); setOv(null); setToday(null)
    Promise.all([fetchAdminOverview(), fetchFounderToday()])
      .then(([o, t]) => { setOv(o); setToday(t) })
      .catch(() => setError(true))
  }, [])
  React.useEffect(() => { load() }, [load])

  if (error) return <ErrorState title="Couldn’t load your briefing" message="Please try again in a moment." onRetry={load} retryLabel="Try again" />
  if (!ov || !today) return <div className="grid place-items-center py-24"><Loader2 className="h-6 w-6 animate-spin text-green" strokeWidth={2} /></div>

  const name = firstName(identity.fullName)
  const brief = composeFounderBriefing({
    name, today,
    foundingMembers: ov.foundingMembers,
    newFamiliesMonth: ov.newFamiliesMonth,
    revenueMonth: ov.revenueMonth,
    alerts: ov.alerts,
    presenceToday: ov.presenceToday,
    daysToLaunch: daysUntilLaunch(),
  })

  return (
    <div className="flex flex-col gap-9">
      <FounderGreeting name={name} />
      <Brief briefing={brief} footnote="Composed from today’s live data. Cloza will write this for you automatically — next phase." />
      <section>
        <SectionLabel>Today at a glance</SectionLabel>
        <FigureRow>
          <Figure label="Families protected" value={today.familiesProtected} hint={today.newFamiliesToday > 0 ? `+${today.newFamiliesToday} today` : 'under watch'} />
          <Figure label="People protected" value={today.peopleProtected} hint="under Close Eye’s watch" />
          <Figure label="Questions answered" value={today.questionsToday} hint="today" />
          <Figure label="Care requests" value={today.careRequestsToday} hint="today" />
          <Figure label="Revenue today" value={inr(today.revenueToday)} />
          <Figure label="Presence today" value={ov.presenceToday} hint="visits in the field" />
        </FigureRow>
      </section>
      <CriticalAlerts alerts={ov.alerts} />
      <SystemStatus alertCount={ov.alerts.length} />
    </div>
  )
}
