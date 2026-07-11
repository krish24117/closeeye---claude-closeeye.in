'use client'

import * as React from 'react'
import { Loader2, Lock } from 'lucide-react'
import { EmptyState } from '@/components/ui/states'
import { useFamilyData } from '@/components/family/family-data-provider'
import { fetchFounderMetrics, type FounderMetrics } from '@/lib/db/founder-dashboard'
import { FOUNDER_LAUNCH_LABEL, launchMode } from '@/lib/launch'
import { isSuperAdmin } from '@/lib/roles'
import { cn } from '@/lib/utils'

function Tile({ label, value, hint, tone = 'ink' }: { label: string; value: string; hint?: string; tone?: 'ink' | 'green' | 'warning' }) {
  const color = tone === 'green' ? 'text-green' : tone === 'warning' ? 'text-warning' : 'text-ink'
  return (
    <div className="rounded-lg border border-line bg-card p-4 shadow-sm">
      <p className={cn('text-h3 leading-none', color)}>{value}</p>
      <p className="mt-2 text-caption font-medium text-muted">{label}</p>
      {hint && <p className="mt-0.5 text-caption text-muted/70">{hint}</p>}
    </div>
  )
}

function DailyBars({ rows }: { rows: { label: string; value: number }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.value))
  const any = rows.some((r) => r.value > 0)
  return (
    <div className="rounded-lg border border-line bg-card p-5 shadow-sm">
      <div className="flex items-end justify-between gap-2" style={{ height: 120 }}>
        {rows.map((r) => (
          <div key={r.label} className="flex flex-1 flex-col items-center justify-end gap-2">
            <span className="text-caption font-semibold text-ink">{r.value || ''}</span>
            <div
              className={cn('w-full max-w-[2.5rem] rounded-t-sm', r.value > 0 ? 'bg-green' : 'bg-accent-soft')}
              style={{ height: `${Math.max(2, (r.value / max) * 88)}%` }}
            />
            <span className="text-caption text-muted">{r.label}</span>
          </div>
        ))}
      </div>
      {!any && <p className="mt-3 text-center text-caption text-muted">No registrations in the last 7 days yet.</p>}
    </div>
  )
}

const section = 'mb-3 text-caption font-semibold uppercase tracking-widest text-muted'
const pct = (n: number | null) => (n === null ? '—' : `${n}%`)

export default function FounderDashboardPage() {
  const { profile, loading } = useFamilyData()
  const isAdmin = isSuperAdmin(profile)
  const [d, setD] = React.useState<FounderMetrics | null>(null)
  const [live, setLive] = React.useState(false)

  React.useEffect(() => { setLive(launchMode() === 'live') }, [])
  React.useEffect(() => {
    if (!isAdmin) return
    fetchFounderMetrics().then(setD).catch(() => setD(null))
  }, [isAdmin])

  if (loading) {
    return <div className="grid place-items-center py-24"><Loader2 className="h-6 w-6 animate-spin text-green" strokeWidth={2} /></div>
  }
  if (!isAdmin) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-h2">Founder Activation</h1>
        <EmptyState icon={Lock} title="Restricted" hint="The Founder Activation dashboard is only available to administrators." />
      </div>
    )
  }
  if (d === null) {
    return (
      <div className="flex flex-col gap-8">
        <h1 className="text-h2">Founder Activation</h1>
        <div className="grid place-items-center rounded-lg border border-line bg-card py-20 shadow-sm"><Loader2 className="h-6 w-6 animate-spin text-green" strokeWidth={2} /></div>
      </div>
    )
  }

  const registrations = [
    { label: 'Total registrations', value: String(d.totalRegistrations), tone: 'green' as const },
    { label: 'Hyderabad families', value: String(d.hyderabadFamilies) },
    { label: live ? 'Awaiting activation' : 'Activation queue', value: String(d.activationQueue), hint: live ? undefined : `Ready for ${FOUNDER_LAUNCH_LABEL}` },
    { label: 'Registered today', value: String(d.registrationsToday) },
  ]
  const membership = [
    { label: 'Care selected', value: String(d.careSelected), tone: 'green' as const, hint: d.careSharePct === null ? undefined : `${d.careSharePct}% of choices` },
    { label: 'Connect selected', value: String(d.connectSelected) },
  ]
  const funnel = [
    { label: 'Landing views', value: String(d.landingViews) },
    { label: 'WhatsApp clicks', value: String(d.whatsappClicks) },
    { label: 'Conversion', value: pct(d.conversionPct), hint: 'Registrations ÷ views' },
    { label: 'Waitlist (other cities)', value: String(d.waitlist) },
  ]

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-h2">Founder Activation</h1>
        <p className="mt-1.5 text-body leading-relaxed text-muted">
          <span className="font-semibold text-ink">{d.totalRegistrations} famil{d.totalRegistrations === 1 ? 'y' : 'ies'}</span>
          {live ? ' registered' : <> reserved for launch on <span className="font-semibold text-ink">{FOUNDER_LAUNCH_LABEL}</span></>}
          {d.registrationsToday > 0 && <> · <span className="font-semibold text-success">{d.registrationsToday} today</span></>}.
        </p>
      </div>

      <section>
        <p className={section}>Registrations</p>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{registrations.map((k) => <Tile key={k.label} {...k} />)}</div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <section>
          <p className={section}>Membership choice</p>
          <div className="grid grid-cols-2 gap-3">{membership.map((k) => <Tile key={k.label} {...k} />)}</div>
          {d.careSharePct !== null && (
            <div className="mt-3 rounded-lg border border-line bg-card p-4 shadow-sm">
              <div className="flex items-center justify-between text-caption font-medium text-muted">
                <span className="text-green">Care {d.careSharePct}%</span>
                <span>Connect {100 - d.careSharePct}%</span>
              </div>
              <div className="mt-2 flex h-2.5 overflow-hidden rounded-full bg-accent-soft">
                <div className="h-full bg-green" style={{ width: `${d.careSharePct}%` }} />
              </div>
            </div>
          )}
        </section>
        <section>
          <p className={section}>Funnel</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-2">{funnel.map((k) => <Tile key={k.label} {...k} />)}</div>
        </section>
      </div>

      <section>
        <p className={section}>Daily registrations · last 7 days</p>
        <DailyBars rows={d.daily} />
      </section>

      <p className="text-caption text-muted">
        A launch dashboard, not a CRM — every number is a real registration or event. Individual families live under{' '}
        <span className="font-medium text-ink">Families</span> and <span className="font-medium text-ink">Leads</span>.
      </p>
    </div>
  )
}
