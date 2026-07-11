'use client'

import * as React from 'react'
import Link from 'next/link'
import { Search, Phone, ShieldCheck, ArrowRight, ClipboardCheck, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { Avatar } from '@/components/family/avatar'
import { HealthBadge, HEALTH } from '@/components/console/health-badge'
import { useToast } from '@/components/ui/toast'
import { guardianById, type HealthStatus } from '@/lib/console-data'
import { useLiveFamilies, type LiveFamily } from '@/features/console/use-live'
import { cn } from '@/lib/utils'

type Filter = 'all' | HealthStatus
type Sort = 'priority' | 'name' | 'recent'
const ORDER: Record<HealthStatus, number> = { red: 0, yellow: 1, green: 2 }
const TREND = { up: TrendingUp, flat: Minus, down: TrendingDown }

function FamilyCard({ family }: { family: LiveFamily }) {
  const toast = useToast()
  const guardian = guardianById(family.guardianId)
  const Trend = TREND[family.wellnessTrend]
  const phone = family.phone.replace(/\s/g, '')

  return (
    <article className={cn('flex flex-col rounded-lg border bg-card p-4 shadow-sm transition-shadow hover:shadow-md', family.liveStatus === 'red' ? 'border-error/30' : 'border-line')}>
      <div className="flex items-start gap-3">
        <Avatar initials={family.memberInitials} size="md" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-body font-semibold text-ink">{family.memberName}</p>
            <Trend className={cn('h-4 w-4 shrink-0', family.wellnessTrend === 'down' ? 'text-warning' : family.wellnessTrend === 'up' ? 'text-success' : 'text-muted')} strokeWidth={1.75} />
          </div>
          <p className="truncate text-caption text-muted">{family.relationship} · {family.age} · {family.area}</p>
        </div>
        <HealthBadge status={family.liveStatus} />
      </div>

      <p className="mt-3 text-caption leading-relaxed text-muted">{family.liveReason}</p>
      {family.pendingRequests > 0 && (
        <p className="mt-1.5 inline-flex items-center gap-1 self-start rounded-full bg-warning/12 px-2 py-0.5 text-[0.65rem] font-semibold text-warning">
          {family.pendingRequests} pending request{family.pendingRequests > 1 ? 's' : ''}
        </p>
      )}

      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 border-t border-line pt-3 text-caption">
        <div><dt className="text-muted">Guardian</dt><dd className="font-medium text-ink">{guardian?.name.split(' ')[0]}</dd></div>
        <div><dt className="text-muted">Satisfaction</dt><dd className="font-medium text-ink">{family.satisfaction}%</dd></div>
        <div><dt className="text-muted">Last visit</dt><dd className="font-medium text-ink">{family.liveLastVisit}</dd></div>
        <div><dt className="text-muted">Next visit</dt><dd className="font-medium text-ink">{family.nextVisitLabel}</dd></div>
      </dl>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <a href={`tel:${phone}`} className="flex min-h-[2.5rem] items-center justify-center gap-1.5 rounded-sm border border-ink/15 text-caption font-semibold text-ink transition-colors hover:border-ink/30 hover:bg-ink/[0.03]"><Phone className="h-3.5 w-3.5 text-green" strokeWidth={1.75} /> Family</a>
        <a href={`tel:${guardian?.phone.replace(/\s/g, '')}`} className="flex min-h-[2.5rem] items-center justify-center gap-1.5 rounded-sm border border-ink/15 text-caption font-semibold text-ink transition-colors hover:border-ink/30 hover:bg-ink/[0.03]"><ShieldCheck className="h-3.5 w-3.5 text-green" strokeWidth={1.75} /> Guardian</a>
        <Link href={`/pm/families/${family.id}`} className="flex min-h-[2.5rem] items-center justify-center gap-1.5 rounded-sm border border-ink/15 text-caption font-semibold text-ink transition-colors hover:border-ink/30 hover:bg-ink/[0.03]"><ArrowRight className="h-3.5 w-3.5 text-green" strokeWidth={1.75} /> Timeline</Link>
        <button type="button" onClick={() => toast(`Follow-up assigned for ${family.memberName.split(' ')[0]}.`)} className="flex min-h-[2.5rem] items-center justify-center gap-1.5 rounded-sm border border-ink/15 text-caption font-semibold text-ink transition-colors hover:border-ink/30 hover:bg-ink/[0.03]"><ClipboardCheck className="h-3.5 w-3.5 text-green" strokeWidth={1.75} /> Follow-up</button>
      </div>
    </article>
  )
}

/**
 * FamilyHealthWidget — the operational heartbeat. Within five seconds, which families
 * need attention. Three categories, live status (reads the shared stores), search,
 * filter and sort. Never a medical score.
 */
export function FamilyHealthWidget() {
  const families = useLiveFamilies()
  const [q, setQ] = React.useState('')
  const [filter, setFilter] = React.useState<Filter>('all')
  const [sort, setSort] = React.useState<Sort>('priority')

  const counts = React.useMemo(() => ({
    green: families.filter((f) => f.liveStatus === 'green').length,
    yellow: families.filter((f) => f.liveStatus === 'yellow').length,
    red: families.filter((f) => f.liveStatus === 'red').length,
  }), [families])

  const query = q.trim().toLowerCase()
  const filtered = families
    .filter((f) => (filter === 'all' ? true : f.liveStatus === filter))
    .filter((f) => (query ? `${f.familyName} ${f.memberName} ${f.area}`.toLowerCase().includes(query) : true))
    .sort((a, b) => {
      if (sort === 'name') return a.memberName.localeCompare(b.memberName)
      if (sort === 'recent') return a.liveLastVisit.localeCompare(b.liveLastVisit)
      return ORDER[a.liveStatus] - ORDER[b.liveStatus] || a.satisfaction - b.satisfaction
    })

  const groups: HealthStatus[] = ['red', 'yellow', 'green']

  return (
    <section className="rounded-lg border border-line bg-card/60 p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-h4">Family health</h2>
          <p className="text-caption text-muted">Relationship &amp; service health — who needs you today</p>
        </div>
        <div className="flex items-center gap-2 text-caption font-semibold">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-error/10 px-2.5 py-1 text-error"><span className="h-1.5 w-1.5 rounded-full bg-error" /> {counts.red}</span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-warning/12 px-2.5 py-1 text-warning"><span className="h-1.5 w-1.5 rounded-full bg-warning" /> {counts.yellow}</span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-success/12 px-2.5 py-1 text-success"><span className="h-1.5 w-1.5 rounded-full bg-success" /> {counts.green}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="mt-4 flex flex-wrap items-center gap-2.5">
        <div className="relative min-w-[12rem] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" strokeWidth={1.75} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search families…" className="w-full rounded-full border border-line bg-card py-2 pl-9 pr-3 text-body-sm text-ink placeholder:text-muted/70 focus:border-green focus:outline-none focus:ring-2 focus:ring-green/20" />
        </div>
        <div className="flex items-center gap-1.5">
          {(['all', 'green', 'yellow', 'red'] as Filter[]).map((f) => (
            <button key={f} type="button" onClick={() => setFilter(f)} className={cn('rounded-full border px-3 py-1.5 text-caption font-semibold capitalize transition-colors', filter === f ? 'border-green bg-green text-ivory' : 'border-line text-muted hover:border-ink/25 hover:text-ink')}>
              {f === 'all' ? 'All' : HEALTH[f as HealthStatus].label}
            </button>
          ))}
        </div>
        <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="rounded-full border border-line bg-card px-3 py-1.5 text-caption font-semibold text-ink focus:border-green focus:outline-none">
          <option value="priority">Sort · Priority</option>
          <option value="name">Sort · Name</option>
          <option value="recent">Sort · Last visit</option>
        </select>
      </div>

      {/* Categories */}
      <div className="mt-5 flex flex-col gap-6">
        {groups.map((g) => {
          const items = filtered.filter((f) => f.liveStatus === g)
          if (items.length === 0) return null
          return (
            <div key={g}>
              <p className="mb-2.5 flex items-center gap-2 text-caption font-semibold uppercase tracking-widest text-muted">
                <span aria-hidden>{HEALTH[g].emoji}</span> {HEALTH[g].heading} <span className="text-muted/70">· {items.length}</span>
              </p>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {items.map((f) => <FamilyCard key={f.id} family={f} />)}
              </div>
            </div>
          )
        })}
        {filtered.length === 0 && <p className="py-8 text-center text-body-sm text-muted">No families match — every family is accounted for. 💚</p>}
      </div>
    </section>
  )
}
