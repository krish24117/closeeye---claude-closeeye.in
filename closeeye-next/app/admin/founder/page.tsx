'use client'

import * as React from 'react'
import { Loader2, Lock, MessageCircle, Phone, Mail, Users } from 'lucide-react'
import { EmptyState } from '@/components/ui/states'
import { Avatar } from '@/components/family/avatar'
import { initialsOf } from '@/components/family/loved-one-card'
import { useFamilyData } from '@/components/family/family-data-provider'
import { fetchFounderMetrics, type FounderMetrics } from '@/lib/db/founder-dashboard'
import { fetchFounderRegistrants, type FounderRegistrant } from '@/lib/db/founder-ops'
import { FOUNDER_LAUNCH_LABEL, daysUntilLaunch, launchMode } from '@/lib/launch'
import { planById } from '@/lib/plans'
import { isSuperAdmin } from '@/lib/roles'
import { cn } from '@/lib/utils'

const FOUNDER_GOAL = 100
const section = 'mb-3 text-caption font-semibold uppercase tracking-widest text-muted'
const pct = (n: number | null) => (n === null ? '—' : `${n}%`)

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

/** Registration funnel — each stage's bar is relative to the top of the funnel;
 *  the % is the step conversion from the stage above. */
function Funnel({ stages }: { stages: { label: string; value: number }[] }) {
  const max = Math.max(1, ...stages.map((s) => s.value))
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-line bg-card p-5 shadow-sm">
      {stages.map((s, i) => {
        const prev = i > 0 ? stages[i - 1]!.value : null
        const step = prev && prev > 0 ? Math.round((s.value / prev) * 100) : null
        return (
          <div key={s.label}>
            <div className="flex items-center justify-between text-body-sm">
              <span className="font-medium text-ink">{s.label}</span>
              <span className="flex items-center gap-2.5">
                {step !== null && <span className="text-caption text-muted">{step}%</span>}
                <span className="font-bold tabular-nums text-ink">{s.value}</span>
              </span>
            </div>
            <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-accent-soft">
              <div className="h-full rounded-full bg-green" style={{ width: `${Math.max(2, (s.value / max) * 100)}%` }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function fmtDateTime(iso: string | null): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  } catch {
    return '—'
  }
}

function statusOf(r: FounderRegistrant): { label: string; tone: 'green' | 'amber' | 'ink' } {
  if (r.subStatus === 'active') return { label: 'Activated', tone: 'green' }
  if (r.followedUp) return { label: 'Followed up', tone: 'ink' }
  return { label: 'Follow-up pending', tone: 'amber' }
}

const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, '')}`
const mailHref = (email: string) => `mailto:${email}`
function waHref(phone: string): string {
  const digits = phone.replace(/[^\d]/g, '')
  const withCc = digits.length === 10 ? `91${digits}` : digits
  return `https://wa.me/${withCc}?text=${encodeURIComponent('Hi, this is Krishna from Close Eye 🙏')}`
}

export default function FounderDashboardPage() {
  const { profile, loading } = useFamilyData()
  const isAdmin = isSuperAdmin(profile)
  const [d, setD] = React.useState<FounderMetrics | null>(null)
  const [rows, setRows] = React.useState<FounderRegistrant[] | null>(null)
  const [days, setDays] = React.useState<number | null>(null)
  const [live, setLive] = React.useState(false)

  React.useEffect(() => { setDays(daysUntilLaunch()); setLive(launchMode() === 'live') }, [])
  React.useEffect(() => {
    if (!isAdmin) return
    fetchFounderMetrics().then(setD).catch(() => setD(null))
    fetchFounderRegistrants().then(setRows).catch(() => setRows([]))
  }, [isAdmin])

  if (loading) {
    return <div className="grid place-items-center py-24"><Loader2 className="h-6 w-6 animate-spin text-green" strokeWidth={2} /></div>
  }
  if (!isAdmin) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-h2">Founder Activation</h1>
        <EmptyState icon={Lock} title="Restricted" hint="The Founder Activation workspace is only available to administrators." />
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

  const goalPct = Math.min(100, Math.round((d.totalRegistrations / FOUNDER_GOAL) * 100))
  const activated = Math.max(0, d.totalRegistrations - d.activationQueue)
  const funnel = [
    { label: 'Landing views', value: d.landingViews },
    { label: 'WhatsApp clicks', value: d.whatsappClicks },
    { label: 'Registrations', value: d.totalRegistrations },
    { label: 'Connect selected', value: d.connectSelected },
    { label: 'Care selected', value: d.careSelected },
    { label: 'Activated', value: activated },
  ]

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-h2">Founder Activation</h1>
        <p className="mt-1.5 text-body leading-relaxed text-muted">Who’s registered — and what to do next — for the first Hyderabad families.</p>
      </div>

      {/* Launch overview */}
      <section className="flex flex-col gap-3">
        <div className="rounded-lg border border-line bg-card p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-caption font-semibold uppercase tracking-widest text-muted">Registered</p>
              <p className="mt-1 text-ink"><span className="text-[2.5rem] font-extrabold leading-none">{d.totalRegistrations}</span> <span className="text-h4 text-muted">/ {FOUNDER_GOAL} families</span></p>
            </div>
            <div className="sm:text-right">
              <p className="text-caption font-semibold uppercase tracking-widest text-muted">{live ? 'Launched' : 'Launch'}</p>
              <p className="mt-1 text-h4 text-ink">{FOUNDER_LAUNCH_LABEL}</p>
              {!live && days !== null && <p className="mt-0.5 text-body-sm font-semibold text-green">{days} {days === 1 ? 'day' : 'days'} to go</p>}
            </div>
          </div>
          <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-accent-soft">
            <div className="h-full rounded-full bg-green transition-all" style={{ width: `${goalPct}%` }} />
          </div>
          <p className="mt-2 text-caption text-muted">{goalPct}% of goal · {Math.max(0, FOUNDER_GOAL - d.totalRegistrations)} to go</p>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <Tile label="Registered today" value={String(d.registrationsToday)} tone="green" />
          <Tile label="Hyderabad families" value={String(d.hyderabadFamilies)} />
          <Tile label="Waitlist (other cities)" value={String(d.waitlist)} />
          <Tile label="Landing conversion" value={pct(d.conversionPct)} hint="Registrations ÷ views" />
          <Tile label="WhatsApp clicks" value={String(d.whatsappClicks)} />
        </div>
      </section>

      {/* Registration funnel */}
      <section>
        <p className={section}>Registration funnel</p>
        <Funnel stages={funnel} />
      </section>

      {/* Registered families */}
      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <p className={cn(section, 'mb-0')}>Registered families{rows ? ` · ${rows.length}` : ''}</p>
        </div>
        {rows === null ? (
          <div className="grid place-items-center rounded-lg border border-line bg-card py-16 shadow-sm"><Loader2 className="h-6 w-6 animate-spin text-green" strokeWidth={2} /></div>
        ) : rows.length === 0 ? (
          <EmptyState icon={Users} title="No registrations yet" hint="Families will appear here as they complete registration." />
        ) : (
          <div className="overflow-hidden rounded-lg border border-line bg-card shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[920px] text-left text-body-sm">
                <thead>
                  <tr className="border-b border-line text-caption font-semibold uppercase tracking-wide text-muted">
                    <th className="px-4 py-3 font-semibold">Name</th>
                    <th className="px-4 py-3 font-semibold">Mobile</th>
                    <th className="px-4 py-3 font-semibold">Email</th>
                    <th className="px-4 py-3 font-semibold">City</th>
                    <th className="px-4 py-3 font-semibold">Plan</th>
                    <th className="px-4 py-3 font-semibold">For</th>
                    <th className="px-4 py-3 font-semibold">Registered</th>
                    <th className="px-4 py-3 font-semibold">Referral</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {rows.map((r) => {
                    const plan = planById(r.planId)
                    const st = statusOf(r)
                    return (
                      <tr key={r.id} className="align-middle transition-colors hover:bg-accent-soft/20">
                        <td className="px-4 py-3">
                          <span className="flex items-center gap-2.5">
                            <Avatar initials={initialsOf(r.fullName ?? 'Family')} size="sm" tone="solid" />
                            <span className="font-semibold text-ink">{r.fullName ?? '—'}</span>
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-ink">{r.phone ?? '—'}</td>
                        <td className="px-4 py-3 text-ink">{r.email ?? '—'}</td>
                        <td className="px-4 py-3 text-muted">{r.serviceArea ?? '—'}</td>
                        <td className="px-4 py-3">{plan ? <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[0.65rem] font-bold uppercase text-green">{plan.short}</span> : <span className="text-muted">—</span>}</td>
                        <td className="px-4 py-3 text-muted">{r.relationship ?? '—'}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-muted">{fmtDateTime(r.registeredAt)}</td>
                        <td className="px-4 py-3 text-muted">{r.ref || 'direct'}</td>
                        <td className="px-4 py-3">
                          <span className={cn('whitespace-nowrap rounded-full px-2 py-0.5 text-[0.65rem] font-bold uppercase', st.tone === 'green' ? 'bg-success/12 text-success' : st.tone === 'amber' ? 'bg-warning/12 text-warning' : 'bg-ink/[0.06] text-muted')}>{st.label}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="flex items-center justify-end gap-1">
                            {r.phone && <a href={waHref(r.phone)} target="_blank" rel="noopener noreferrer" title="WhatsApp" className="grid h-8 w-8 place-items-center rounded-full text-green transition-colors hover:bg-accent-soft"><MessageCircle className="h-4 w-4" strokeWidth={1.75} /></a>}
                            {r.phone && <a href={telHref(r.phone)} title="Call" className="grid h-8 w-8 place-items-center rounded-full text-ink transition-colors hover:bg-ink/[0.05]"><Phone className="h-4 w-4" strokeWidth={1.75} /></a>}
                            {r.email && <a href={mailHref(r.email)} title="Email" className="grid h-8 w-8 place-items-center rounded-full text-ink transition-colors hover:bg-ink/[0.05]"><Mail className="h-4 w-4" strokeWidth={1.75} /></a>}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      <p className="text-caption text-muted">Every number is a real registration or event. Filters, per-family details and export come next.</p>
    </div>
  )
}
