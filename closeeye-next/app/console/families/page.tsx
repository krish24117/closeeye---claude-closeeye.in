'use client'

import * as React from 'react'
import Link from 'next/link'
import { Loader2, Lock, Users, Search, MessageCircle, CalendarClock, ArrowRight } from 'lucide-react'
import { Avatar } from '@/components/family/avatar'
import { EmptyState } from '@/components/ui/states'
import { initialsOf } from '@/components/family/loved-one-card'
import { useFamilyData } from '@/components/family/family-data-provider'
import { fetchConsoleFamilies, type ConsoleFamilyLive, type CaseStatus } from '@/lib/db/console'
import { canUseConsole } from '@/lib/roles'
import { cn } from '@/lib/utils'

type Filter = 'all' | 'attention'

const STATUS: Record<CaseStatus, { label: string; chip: string; dot: string }> = {
  green: { label: 'Doing well', chip: 'bg-success/12 text-success', dot: 'bg-success' },
  yellow: { label: 'Needs attention', chip: 'bg-warning/15 text-warning', dot: 'bg-warning' },
}

export default function FamiliesPage() {
  const { profile, loading } = useFamilyData()
  const isStaff = canUseConsole(profile)
  const [families, setFamilies] = React.useState<ConsoleFamilyLive[] | null>(null)
  const [filter, setFilter] = React.useState<Filter>('all')
  const [q, setQ] = React.useState('')

  React.useEffect(() => {
    if (!isStaff) return
    fetchConsoleFamilies()
      .then(setFamilies)
      .catch(() => setFamilies([]))
  }, [isStaff])

  if (loading) {
    return <div className="grid place-items-center py-24"><Loader2 className="h-6 w-6 animate-spin text-green" strokeWidth={2} /></div>
  }

  if (!isStaff) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-h2">In your care</h1>
        <EmptyState icon={Lock} title="Restricted" hint="This is only available to Close Eye team members." />
      </div>
    )
  }

  const query = q.trim().toLowerCase()
  const list = (families ?? [])
    .filter((f) => (filter === 'attention' ? f.status === 'yellow' : true))
    .filter((f) => (query ? `${f.name} ${f.city ?? ''} ${f.relationship ?? ''}`.toLowerCase().includes(query) : true))
    .sort((a, b) => (a.status === b.status ? a.name.localeCompare(b.name) : a.status === 'yellow' ? -1 : 1))

  const needCount = (families ?? []).filter((f) => f.status === 'yellow').length

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-h2">In your care</h1>
        <p className="mt-1.5 text-body leading-relaxed text-muted">Every family you support — those who need you, first.</p>
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <div className="relative min-w-[12rem] max-w-md flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" strokeWidth={1.75} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search a family or a city…"
            className="w-full rounded-full border border-line bg-card py-2 pl-9 pr-4 text-body-sm text-ink placeholder:text-muted/70 focus:border-green focus:outline-none focus:ring-2 focus:ring-green/20"
          />
        </div>
        <div className="flex items-center gap-1.5">
          {([['all', 'All'], ['attention', needCount ? `Needs you · ${needCount}` : 'Needs you']] as [Filter, string][]).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={cn(
                'rounded-full border px-3 py-1.5 text-caption font-semibold transition-colors',
                filter === key ? 'border-green bg-green text-ivory' : 'border-line text-muted hover:border-ink/25 hover:text-ink',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {families === null ? (
        <div className="grid place-items-center rounded-lg border border-line bg-card py-16 shadow-sm"><Loader2 className="h-6 w-6 animate-spin text-green" strokeWidth={2} /></div>
      ) : list.length === 0 ? (
        <EmptyState
          icon={Users}
          title={(families ?? []).length === 0 ? 'No families yet' : 'Nothing here'}
          hint={(families ?? []).length === 0 ? 'Families assigned to you will appear here.' : 'No families match your search or filter.'}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((f) => {
            const st = STATUS[f.status]
            const meta = [f.relationship, f.age ? `${f.age}` : null, f.city].filter(Boolean).join(' · ')
            return (
              <Link
                key={f.lovedOneId}
                href={`/console/messages/${f.lovedOneId}`}
                className="group flex flex-col gap-3 rounded-lg border border-line bg-card p-4 shadow-sm transition-all duration-200 ease-premium hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex items-center gap-3">
                  <Avatar initials={initialsOf(f.name)} size="md" tone="solid" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-body-sm font-bold text-ink group-hover:text-green">{f.name}</p>
                    {meta && <p className="truncate text-caption text-muted">{meta}</p>}
                  </div>
                  {f.awaitingReply && <span className="h-2 w-2 shrink-0 rounded-full bg-warning" aria-label="Awaiting reply" />}
                </div>
                <span className={cn('inline-flex items-center gap-1.5 self-start rounded-full px-2.5 py-1 text-caption font-bold', st.chip)}>
                  <span className={cn('h-1.5 w-1.5 rounded-full', st.dot)} /> {st.label}
                </span>
                <p className="border-t border-line pt-2.5 text-caption text-muted">{f.reason}</p>
                <div className="flex items-center justify-between gap-2 text-caption">
                  <span className="inline-flex items-center gap-1.5 text-muted">
                    <CalendarClock className="h-3.5 w-3.5" strokeWidth={1.75} />
                    {f.nextVisitLabel ? <>Next Presence · <span className="font-semibold text-ink">{f.nextVisitLabel}</span></> : 'No visit scheduled'}
                  </span>
                  <span className="inline-flex items-center gap-1 font-semibold text-green opacity-0 transition-opacity group-hover:opacity-100">
                    <MessageCircle className="h-3.5 w-3.5" strokeWidth={1.75} /> Connect <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
