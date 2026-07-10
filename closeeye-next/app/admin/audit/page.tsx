'use client'

import * as React from 'react'
import { Loader2, Lock, ScrollText, Search } from 'lucide-react'
import { EmptyState } from '@/components/ui/states'
import { useFamilyData } from '@/components/family/family-data-provider'
import { fetchAdminAudit, type AdminAuditEntry } from '@/lib/db/admin'
import { isSuperAdmin } from '@/lib/roles'
import { cn } from '@/lib/utils'

function statusTone(status: string): string {
  if (status === 'cancelled') return 'bg-error/12 text-error'
  if (status === 'completed') return 'bg-success/12 text-success'
  if (status === 'delayed' || status === 'rescheduled') return 'bg-warning/12 text-warning'
  return 'bg-accent-soft text-green'
}

export default function AuditPage() {
  const { profile, loading } = useFamilyData()
  const isAdmin = isSuperAdmin(profile)
  const [rows, setRows] = React.useState<AdminAuditEntry[] | null>(null)
  const [q, setQ] = React.useState('')

  React.useEffect(() => {
    if (!isAdmin) return
    fetchAdminAudit().then(setRows).catch(() => setRows([]))
  }, [isAdmin])

  if (loading) return <div className="grid place-items-center py-24"><Loader2 className="h-6 w-6 animate-spin text-green" strokeWidth={2} /></div>
  if (!isAdmin) return <div className="flex flex-col gap-6"><h1 className="text-h2">Audit log</h1><EmptyState icon={Lock} title="Restricted" hint="Available to administrators only." /></div>

  const query = q.trim().toLowerCase()
  const list = (rows ?? []).filter((r) =>
    query ? `${r.actor} ${r.memberName} ${r.familyName} ${r.statusLabel} ${r.note ?? ''}`.toLowerCase().includes(query) : true,
  )

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-h2">Audit log</h1>
        <p className="mt-1.5 text-body leading-relaxed text-muted">Every booking status change — who did it and when. Newest first.</p>
      </div>

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" strokeWidth={1.75} />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by person, family or status…"
          className="w-full rounded-full border border-line bg-card py-2 pl-9 pr-4 text-body-sm text-ink placeholder:text-muted/70 focus:border-green focus:outline-none focus:ring-2 focus:ring-green/20"
        />
      </div>

      {rows === null ? (
        <div className="grid place-items-center rounded-lg border border-line bg-card py-16 shadow-sm"><Loader2 className="h-6 w-6 animate-spin text-green" strokeWidth={2} /></div>
      ) : list.length === 0 ? (
        <EmptyState
          icon={ScrollText}
          title={(rows.length === 0) ? 'No activity yet' : 'Nothing matches'}
          hint={rows.length === 0 ? 'Booking status changes will appear here as the team works.' : 'Try a different search.'}
        />
      ) : (
        <section className="overflow-hidden rounded-lg border border-line bg-card shadow-sm">
          <ul>
            {list.map((r) => (
              <li key={r.id} className="flex items-start gap-3 border-b border-line px-5 py-3.5 last:border-b-0">
                <span className={cn('mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full', statusTone(r.status))}>
                  <ScrollText className="h-4 w-4" strokeWidth={1.75} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-body-sm leading-relaxed text-ink">
                    <span className="font-semibold">{r.actor}</span> set <span className="font-semibold">{r.memberName}</span>&rsquo;s visit to <span className="font-semibold">{r.statusLabel}</span>
                  </p>
                  {r.note && <p className="mt-0.5 text-caption italic text-muted">&ldquo;{r.note}&rdquo;</p>}
                  <p className="mt-1 text-caption text-muted">{r.familyName} · {r.at}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
