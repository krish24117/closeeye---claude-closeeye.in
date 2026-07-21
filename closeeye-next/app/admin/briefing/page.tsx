'use client'

import * as React from 'react'
import Link from 'next/link'
import { Loader2, Lock, Sunrise, MessageCircle, Phone, ArrowRight, AlertTriangle, Flame, Target } from 'lucide-react'
import { EmptyState } from '@/components/ui/states'
import { Avatar } from '@/components/family/avatar'
import { initialsOf } from '@/components/family/loved-one-card'
import { useFamilyData } from '@/components/family/family-data-provider'
import { isSuperAdmin } from '@/lib/roles'
import { fetchAdminOverview, type AdminOverview } from '@/lib/db/admin'
import { fetchFounderRegistrants, fetchReminders, type FounderRegistrant } from '@/lib/db/founder-ops'
import {
  topLeads, scoreReasons, effectiveStage, STAGE_LABEL, registrantStatus, dueReminders,
  type FounderReminder, type PipelineStage,
} from '@/lib/founder-ops-view'
import { daysUntilLaunch } from '@/lib/launch'
import { cn } from '@/lib/utils'

/** Today's cumulative target on the 34-day S-curve to 100 (Jul 12 → Aug 15). */
function targetToday(daysToLaunch: number | null): number {
  const total = 34
  const elapsed = Math.max(0, Math.min(total, total - (daysToLaunch ?? total)))
  const pts: [number, number][] = [[0, 0], [3, 3], [7, 12], [14, 32], [21, 55], [28, 83], [34, 100]]
  for (let i = 1; i < pts.length; i++) {
    const [d0, t0] = pts[i - 1]!
    const [d1, t1] = pts[i]!
    if (elapsed <= d1) return Math.round(t0 + (t1 - t0) * ((elapsed - d0) / (d1 - d0)))
  }
  return 100
}

function waHref(phone: string): string {
  const d = phone.replace(/[^\d]/g, '')
  return `https://wa.me/${d.length === 10 ? `91${d}` : d}?text=${encodeURIComponent('Hi, this is Krishna from Close Eye 🙏')}`
}
const telHref = (p: string) => `tel:${p.replace(/[^\d+]/g, '')}`

function scoreStyle(score: number): string {
  return score >= 60 ? 'bg-green text-ivory' : score >= 40 ? 'bg-accent-soft text-green' : 'bg-ink/[0.06] text-muted'
}

const STAGE_ORDER: PipelineStage[] = ['new', 'qualified', 'conversation', 'offer', 'won', 'referred']

export default function BriefingPage() {
  const { profile, loading } = useFamilyData()
  const isAdmin = isSuperAdmin(profile)
  const [overview, setOverview] = React.useState<AdminOverview | null>(null)
  const [rows, setRows] = React.useState<FounderRegistrant[] | null>(null)
  const [reminders, setReminders] = React.useState<FounderReminder[]>([])
  const [nowIso, setNowIso] = React.useState<string | null>(null)
  const [days, setDays] = React.useState<number | null>(null)
  const [error, setError] = React.useState(false)

  React.useEffect(() => { setNowIso(new Date().toISOString()); setDays(daysUntilLaunch()) }, [])
  React.useEffect(() => {
    if (!isAdmin) return
    fetchAdminOverview().then(setOverview).catch(() => setError(true))
    fetchFounderRegistrants().then(setRows).catch(() => setError(true))
    fetchReminders().then(setReminders).catch(() => setReminders([]))
  }, [isAdmin])

  if (loading) return <div className="grid place-items-center py-24"><Loader2 className="h-6 w-6 animate-spin text-green" strokeWidth={2} /></div>
  if (!isAdmin) return <div className="flex flex-col gap-6"><h1 className="text-h2">Daily briefing</h1><EmptyState icon={Lock} title="Restricted" hint="Only administrators can open the briefing." /></div>
  if (nowIso === null || overview === null || rows === null) {
    return <div className="flex flex-col gap-8"><h1 className="text-h2">Daily briefing</h1><div className="grid place-items-center rounded-lg border border-line bg-card py-20 shadow-sm"><Loader2 className="h-6 w-6 animate-spin text-green" strokeWidth={2} /></div></div>
  }

  const paying = overview.activeSubs
  const target = targetToday(days)
  const behind = Math.max(0, target - paying)
  const onTrack = paying >= target
  const top = topLeads(rows, nowIso, 10)
  const due = dueReminders(reminders, nowIso)
  const nameById = new Map(rows.map((r) => [r.id, r.fullName ?? 'Family']))
  const phoneById = new Map(rows.map((r) => [r.id, r.phone]))
  const needFirstContact = rows.filter((r) => registrantStatus(r, nowIso) === 'follow_up').length
  const stageCounts = STAGE_ORDER.reduce((acc, s) => { acc[s] = 0; return acc }, {} as Record<PipelineStage, number>)
  for (const r of rows) stageCounts[effectiveStage(r)]++
  const offers = stageCounts.offer

  const nudge =
    offers > 0 ? `${offers} lead${offers > 1 ? 's' : ''} sitting at "Offer made" — a nudge closes these fastest. Do those first, then work the hot list.`
    : behind > 0 ? `You're ${behind} behind today's target — work the ${Math.min(top.length, 10)} hottest leads below, and ask every closed family for 2 referrals.`
    : `On track. Protect it: deliver today's visits flawlessly and turn each Presence Story into a referral + a review.`

  const dateLabel = new Date(nowIso).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="flex flex-col gap-8">
      <div>
        <div className="flex items-center gap-2 text-green"><Sunrise className="h-5 w-5" strokeWidth={1.75} /><span className="text-caption font-semibold uppercase tracking-widest">Daily briefing</span></div>
        <h1 className="mt-1 text-h2">Good morning, Krishna.</h1>
        <p className="mt-1.5 text-body text-muted">{dateLabel}{days !== null && days > 0 ? ` · ${days} ${days === 1 ? 'day' : 'days'} to launch` : ''}. Here’s where the 100 stands, and who to call first.</p>
      </div>
      {error && <p className="text-caption text-warning">Some data couldn’t load — showing what we have.</p>}

      {/* 1 · The number */}
      <section className="rounded-lg border border-line bg-card p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-caption font-semibold uppercase tracking-widest text-muted">Paying families · on a plan</p>
            <p className="mt-1 flex items-baseline gap-2">
              <span className="text-[2.6rem] font-extrabold leading-none tracking-tight text-green">{paying}</span>
              <span className="text-h4 text-muted">/ 100</span>
            </p>
            <p className="mt-1.5 text-body-sm">
              <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-caption font-bold', onTrack ? 'bg-success/12 text-success' : 'bg-warning/12 text-warning')}>
                <Target className="h-3.5 w-3.5" strokeWidth={2.5} /> {onTrack ? `On track — target today is ${target}` : `${behind} behind — target today is ${target}`}
              </span>
            </p>
          </div>
          <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-right">
            <div><p className="text-caption text-muted">MRR</p><p className="text-h4 text-ink">₹{overview.mrr.toLocaleString('en-IN')}</p></div>
            <div><p className="text-caption text-muted">Revenue</p><p className="text-h4 text-ink">₹{overview.revenueTotal.toLocaleString('en-IN')}</p></div>
          </div>
        </div>
        <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-accent-soft">
          <div className="h-full rounded-full bg-green transition-all" style={{ width: `${Math.min(100, paying)}%` }} />
          <div className="relative -mt-2.5 h-2.5" title={`Today's target: ${target}`}><span className="absolute top-0 h-2.5 w-0.5 bg-ink/50" style={{ left: `${Math.min(100, target)}%` }} /></div>
        </div>
        <p className="mt-2 text-caption text-muted">Green = families on an active plan. The tick is today’s S-curve target. One-off-only paying families count in Revenue, not yet in this bar.</p>
      </section>

      {/* 2 · One nudge */}
      <section className="flex items-start gap-3 rounded-lg border border-green/30 bg-accent-soft/30 p-4 shadow-sm">
        <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-green text-ivory"><Flame className="h-4 w-4" strokeWidth={2} /></span>
        <p className="text-body-sm text-ink"><strong>Today’s focus.</strong> {nudge}</p>
      </section>

      {/* 3 · Today's top 10 */}
      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-caption font-semibold uppercase tracking-widest text-muted">Today’s top {top.length} — work these first</p>
          <Link href="/admin/pipeline" className="inline-flex items-center gap-1 text-caption font-semibold text-green hover:underline">Open pipeline <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} /></Link>
        </div>
        {top.length === 0 ? (
          <EmptyState icon={Target} title="No leads to work yet" hint="Scored leads appear here as families register." />
        ) : (
          <div className="overflow-hidden rounded-lg border border-line bg-card shadow-sm">
            <ul className="divide-y divide-line">
              {top.map((r) => {
                const reasons = scoreReasons(r, nowIso).slice(0, 3).join(' · ')
                return (
                  <li key={r.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                    <span className={cn('inline-grid h-9 w-9 shrink-0 place-items-center rounded-full text-body-sm font-bold tabular-nums', scoreStyle(r.score))} title="Lead score">{r.score}</span>
                    <Avatar initials={initialsOf(r.fullName ?? 'Family')} size="sm" tone="solid" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-ink">{r.fullName ?? '—'}</p>
                      <p className="truncate text-caption text-muted">{[STAGE_LABEL[effectiveStage(r)], reasons].filter(Boolean).join(' · ') || 'New lead'}</p>
                    </div>
                    {r.phone ? (
                      <span className="flex shrink-0 items-center gap-1">
                        <a href={waHref(r.phone)} target="_blank" rel="noopener noreferrer" title="WhatsApp" className="grid h-9 w-9 place-items-center rounded-full text-green hover:bg-accent-soft"><MessageCircle className="h-4 w-4" strokeWidth={1.75} /></a>
                        <a href={telHref(r.phone)} title="Call" className="grid h-9 w-9 place-items-center rounded-full text-ink hover:bg-ink/[0.05]"><Phone className="h-4 w-4" strokeWidth={1.75} /></a>
                      </span>
                    ) : <span className="shrink-0 text-caption text-muted/60">email only</span>}
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </section>

      {/* 4 · Needs attention */}
      <section>
        <p className="mb-3 text-caption font-semibold uppercase tracking-widest text-muted">Needs attention</p>
        <div className="flex flex-col gap-2 rounded-lg border border-line bg-card p-4 shadow-sm">
          {needFirstContact > 0 && (
            <div className="flex items-center justify-between gap-3 rounded-md bg-warning/[0.06] px-4 py-3">
              <span className="flex items-center gap-2.5 text-body-sm text-ink"><AlertTriangle className="h-4 w-4 shrink-0 text-warning" strokeWidth={2} /><span><strong>{needFirstContact}</strong> famil{needFirstContact === 1 ? 'y' : 'ies'} still without a first contact</span></span>
              <Link href="/admin/pipeline" className="shrink-0 text-caption font-semibold text-green hover:underline">Reach out</Link>
            </div>
          )}
          {due.map((rem) => {
            const phone = phoneById.get(rem.registrantId)
            return (
              <div key={rem.id} className="flex items-center justify-between gap-3 rounded-md bg-accent-soft/20 px-4 py-3">
                <span className="min-w-0 text-body-sm text-ink"><strong>{nameById.get(rem.registrantId) ?? 'Family'}</strong>{rem.note ? ` — ${rem.note}` : ''} <span className="text-caption text-warning">· reminder due</span></span>
                {phone && <a href={waHref(phone)} target="_blank" rel="noopener noreferrer" className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-green hover:bg-accent-soft"><MessageCircle className="h-4 w-4" strokeWidth={1.75} /></a>}
              </div>
            )
          })}
          {needFirstContact === 0 && due.length === 0 && <p className="px-1 py-1 text-body-sm text-muted">Nothing overdue — you’re on top of it. 🎉</p>}
        </div>
      </section>

      {/* 5 · Pipeline snapshot */}
      <section>
        <p className="mb-3 text-caption font-semibold uppercase tracking-widest text-muted">Pipeline snapshot</p>
        <div className="flex flex-wrap gap-2.5">
          {STAGE_ORDER.map((s) => (
            <div key={s} className={cn('flex min-w-[8rem] flex-1 flex-col rounded-lg border bg-card px-4 py-3 shadow-sm', s === 'won' ? 'border-success/30' : 'border-line')}>
              <span className="text-h4 leading-none text-ink tabular-nums">{stageCounts[s]}</span>
              <span className="mt-1 text-caption text-muted">{STAGE_LABEL[s]}</span>
            </div>
          ))}
        </div>
      </section>

      <p className="text-caption text-muted">Composed from live data (memberships, the founder pipeline, reminders). Open the <Link href="/admin/pipeline" className="font-semibold text-green hover:underline">pipeline</Link> to set stages, sources and reminders. A 7am WhatsApp/email push of this briefing is the next step.</p>
    </div>
  )
}
