'use client'

/**
 * /admin/abuse — what the guards WOULD have turned away.
 *
 * This page exists to answer one question before RATE_LIMIT_ENFORCE is ever flipped on:
 * would these limits have turned away a real family? Every row is a request we ALLOWED
 * (while log-only). Read it before enforcing, not after.
 */
import * as React from 'react'
import { Loader2, Lock, ShieldCheck, Bot, Gauge, Wallet } from 'lucide-react'
import { EmptyState } from '@/components/ui/states'
import { useFamilyData } from '@/components/family/family-data-provider'
import { isSuperAdmin } from '@/lib/roles'
import { fetchAbuseEvents, summarise, type AbuseEvent } from '@/lib/db/rate-limits'

const when = (iso: string) => {
  try { return new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) } catch { return iso }
}

const REASON_META: Record<string, { label: string; cls: string }> = {
  rate_limited: { label: 'Rate limit', cls: 'bg-warning/15 text-warning' },
  bot: { label: 'Bot check', cls: 'bg-error/12 text-error' },
  ai_budget: { label: 'AI budget', cls: 'bg-accent-soft text-green' },
}

export default function AdminAbusePage() {
  const { profile, loading } = useFamilyData()
  const isAdmin = isSuperAdmin(profile)
  const [rows, setRows] = React.useState<AbuseEvent[] | null>(null)
  const [error, setError] = React.useState(false)

  const load = React.useCallback(() => {
    if (!isAdmin) return
    setError(false)
    fetchAbuseEvents()
      .then(setRows)
      .catch(() => { setRows(null); setError(true) })
  }, [isAdmin])
  React.useEffect(() => { load() }, [load])

  if (loading) return <div className="grid place-items-center py-24"><Loader2 className="h-6 w-6 animate-spin text-green" strokeWidth={2} /></div>
  if (!isAdmin) return <div className="flex flex-col gap-6"><h1 className="text-h2">Abuse guards</h1><EmptyState icon={Lock} title="Restricted" hint="Available to administrators only." /></div>

  const all = rows ?? []
  const groups = summarise(all)
  const enforcedCount = all.filter((e) => e.enforced).length
  const actors = new Set(all.map((e) => e.actor).filter(Boolean)).size

  return (
    <div className="flex flex-col gap-7">
      <div>
        <h1 className="text-h2">Abuse guards</h1>
        <p className="mt-1.5 text-body leading-relaxed text-muted">
          Requests the guards would have turned away, last 7 days. While the guards are in log-only mode these were all
          <strong className="font-semibold text-ink"> allowed anyway</strong> — this is the tuning signal. Few events across
          many different people means a limit is too tight; many events from one actor means it&rsquo;s working.
        </p>
      </div>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { icon: Gauge, label: 'Would-block events', value: all.length },
          { icon: ShieldCheck, label: 'Distinct actors', value: actors },
          { icon: Bot, label: 'Failed bot check', value: all.filter((e) => e.reason === 'bot').length },
          { icon: Wallet, label: 'Actually enforced', value: enforcedCount },
        ].map((m) => (
          <div key={m.label} className="rounded-lg border border-line bg-card p-4 shadow-sm">
            <m.icon className="h-4 w-4 text-green" strokeWidth={1.75} />
            <p className="mt-3 text-h3 tabular-nums text-ink">{m.value}</p>
            <p className="mt-0.5 text-caption leading-tight text-muted">{m.label}</p>
          </div>
        ))}
      </section>

      {groups.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-line bg-card shadow-sm">
          <table className="w-full min-w-[34rem] text-body-sm">
            <thead><tr className="border-b border-line text-caption uppercase tracking-wide text-muted">
              <th className="px-4 py-2.5 text-left font-medium">Endpoint</th>
              <th className="px-4 py-2.5 text-left font-medium">Reason</th>
              <th className="px-4 py-2.5 text-right font-medium">Events</th>
              <th className="px-4 py-2.5 text-right font-medium">Actors</th>
            </tr></thead>
            <tbody>{groups.map((g) => (
              <tr key={`${g.endpoint}-${g.reason}`} className="border-b border-line last:border-0">
                <td className="px-4 py-2.5 text-ink">{g.endpoint}</td>
                <td className="px-4 py-2.5 text-muted">{REASON_META[g.reason]?.label ?? g.reason}</td>
                <td className="px-4 py-2.5 text-right tabular-nums text-ink">{g.events}</td>
                <td className="px-4 py-2.5 text-right tabular-nums text-ink">{g.actors}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}

      {error ? (
        <EmptyState icon={Lock} title="Couldn’t load" hint="Apply the rate_limit_events migration, then reload." />
      ) : rows === null ? (
        <div className="grid place-items-center py-16"><Loader2 className="h-5 w-5 animate-spin text-green" strokeWidth={2} /></div>
      ) : all.length === 0 ? (
        <EmptyState icon={ShieldCheck} title="Nothing turned away" hint="No request has hit a limit in the last 7 days. That is the expected reading — real families don’t." />
      ) : (
        <ul className="flex flex-col gap-2">
          {all.map((e) => {
            const meta = REASON_META[e.reason]
            return (
              <li key={e.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-line bg-card px-4 py-3 shadow-sm">
                <span className={`rounded-full px-2 py-0.5 text-caption font-medium ${meta?.cls ?? 'bg-ink/[0.06] text-muted'}`}>{meta?.label ?? e.reason}</span>
                <span className="text-body-sm text-ink">{e.endpoint}</span>
                {e.tier && <span className="text-caption text-muted">{e.tier}</span>}
                {/* A hashed actor — enough to spot one repeat offender, never who they are. */}
                {e.actor && <span className="font-mono text-caption text-muted">{e.actor}</span>}
                {!e.enforced && <span className="text-caption text-muted">allowed (log-only)</span>}
                <span className="ml-auto text-caption tabular-nums text-muted">{when(e.created_at)}</span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
