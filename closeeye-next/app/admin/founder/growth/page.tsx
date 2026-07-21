'use client'

/**
 * GROWTH — how CloseEye is growing. Live mission numbers (families, people protected, countries,
 * Founding-100) up top; the engagement/funnel figures that aren't instrumented yet are honest
 * "Coming soon" (never estimated). Deep-links to the existing Founding-100 pipeline for the CRM.
 */
import * as React from 'react'
import { Loader2 } from 'lucide-react'
import { ErrorState } from '@/components/ui/states'
import { fetchAdminOverview, type AdminOverview } from '@/lib/db/admin'
import { fetchFounderToday, type FounderToday } from '@/lib/db/founder-workspace'
import { PageTitle, SectionLabel, Figure, FigureRow, DeepLink } from '@/components/admin/founder-workspace'

export default function FounderGrowthPage() {
  const [ov, setOv] = React.useState<AdminOverview | null>(null)
  const [t, setT] = React.useState<FounderToday | null>(null)
  const [error, setError] = React.useState(false)

  const load = React.useCallback(() => {
    setError(false); setOv(null); setT(null)
    Promise.all([fetchAdminOverview(), fetchFounderToday()])
      .then(([o, x]) => { setOv(o); setT(x) })
      .catch(() => setError(true))
  }, [])
  React.useEffect(() => { load() }, [load])

  if (error) return <ErrorState title="Couldn’t load Growth" message="Please try again in a moment." onRetry={load} retryLabel="Try again" />
  if (!ov || !t) return <div className="grid place-items-center py-24"><Loader2 className="h-6 w-6 animate-spin text-green" strokeWidth={2} /></div>

  return (
    <div className="flex flex-col gap-10">
      <PageTitle title="Growth" subtitle="How Close Eye is growing — the families we protect, and the reach of the mission." />
      {/* The four that matter — families and people protected, reach, and weekly engagement. */}
      <section>
        <SectionLabel>Families &amp; reach</SectionLabel>
        <FigureRow>
          <Figure label="Families protected" value={ov.families} hint={ov.newFamiliesMonth > 0 ? `+${ov.newFamiliesMonth} this month` : 'under watch'} />
          <Figure label="People protected" value={t.peopleProtected} hint="under Close Eye’s watch" />
          <Figure label="Countries" value={t.countries} hint={t.countries === 1 ? 'India' : undefined} />
          <Figure label="Weekly active families" soon="needs family-activity tracking" />
        </FigureRow>
      </section>
      {/* Everything else is secondary — kept quiet, not a SaaS analytics wall. */}
      <section>
        <SectionLabel>Also tracking</SectionLabel>
        <FigureRow>
          <Figure label="Founding families" value={`${ov.foundingMembers} / 100`} hint="Founding 100" />
          <Figure label="Monthly active families" soon="needs family-activity tracking" />
          <Figure label="Referrals" soon="needs referral attribution" />
          <Figure label="Retention" soon="needs a churn definition" />
        </FigureRow>
      </section>
      <div><DeepLink href="/admin/pipeline" label="Open the Founding-100 pipeline" /></div>
    </div>
  )
}
