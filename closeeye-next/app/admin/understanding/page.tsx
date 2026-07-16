'use client'

/**
 * /admin/understanding — the Connect learning loop, for review.
 *
 * Weekly quality metrics + the raw event log, with one-tap triage: mark a failure
 * "for regression" and note what it should have understood. Those notes become
 * regression cases (npm run sync:understanding).
 */
import * as React from 'react'
import { Loader2, Lock, Brain, Flag, ArrowRightLeft, MessageCircleQuestion, Check } from 'lucide-react'
import { EmptyState } from '@/components/ui/states'
import { useFamilyData } from '@/components/family/family-data-provider'
import { isSuperAdmin } from '@/lib/roles'
import {
  fetchUnderstandingLog, fetchUnderstandingWeekly, reviewUnderstanding,
  type UnderstandingRow, type WeeklyMetric,
} from '@/lib/db/understanding'
import { cn } from '@/lib/utils'

type Filter = 'all' | 'flag' | 'handoff' | 'unreviewed'
const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'flag', label: 'Flagged wrong' },
  { key: 'handoff', label: 'Handoffs' },
  { key: 'unreviewed', label: 'Needs review' },
]

const pct = (n: number | null) => (n == null ? '—' : `${n}%`)
const when = (iso: string) => { try { return new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) } catch { return iso } }
const weekOf = (iso: string) => { try { return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) } catch { return iso } }

const EVENT_META: Record<UnderstandingRow['event'], { label: string; cls: string }> = {
  first: { label: 'First try', cls: 'bg-ink/[0.06] text-muted' },
  clarify: { label: 'Clarify', cls: 'bg-accent-soft text-green' },
  handoff: { label: 'Handoff', cls: 'bg-warning/15 text-warning' },
  flag: { label: 'Flagged', cls: 'bg-error/12 text-error' },
}

function understoodSummary(u: UnderstandingRow['understood']): string {
  if (!u || Object.keys(u).length === 0) return '—'
  const bits = [
    u.subjectKind ? `subject: ${u.subjectKind}` : (u.subjectKnown ? 'subject: known' : 'subject: none'),
    u.need ? `need: ${u.need}` : null,
    u.city ? `city: ${u.city}` : null,
  ].filter(Boolean)
  return bits.join(' · ')
}

export default function AdminUnderstandingPage() {
  const { profile, loading } = useFamilyData()
  const isAdmin = isSuperAdmin(profile)
  const [rows, setRows] = React.useState<UnderstandingRow[] | null>(null)
  const [weekly, setWeekly] = React.useState<WeeklyMetric[]>([])
  const [error, setError] = React.useState(false)
  const [filter, setFilter] = React.useState<Filter>('flag')
  const [draft, setDraft] = React.useState<Record<string, string>>({})
  const [saving, setSaving] = React.useState<string | null>(null)

  const load = React.useCallback(() => {
    if (!isAdmin) return
    setError(false)
    Promise.all([fetchUnderstandingLog(), fetchUnderstandingWeekly()])
      .then(([r, w]) => { setRows(r); setWeekly(w) })
      .catch(() => { setRows(null); setError(true) })
  }, [isAdmin])
  React.useEffect(() => { load() }, [load])

  async function save(id: string) {
    setSaving(id)
    const { error: err } = await reviewUnderstanding(id, draft[id] ?? '')
    setSaving(null)
    if (!err) setRows((prev) => prev?.map((r) => (r.id === id ? { ...r, reviewed: true, expected: draft[id]?.trim() || null } : r)) ?? prev)
  }

  if (loading) return <div className="grid place-items-center py-24"><Loader2 className="h-6 w-6 animate-spin text-green" strokeWidth={2} /></div>
  if (!isAdmin) return <div className="flex flex-col gap-6"><h1 className="text-h2">Understanding</h1><EmptyState icon={Lock} title="Restricted" hint="Available to administrators only." /></div>

  const latest = weekly[0]
  const all = rows ?? []
  const list = all.filter((r) => (filter === 'all' ? true : filter === 'unreviewed' ? !r.reviewed : r.event === filter))

  return (
    <div className="flex flex-col gap-7">
      <div>
        <h1 className="text-h2">Understanding</h1>
        <p className="mt-1.5 text-body leading-relaxed text-muted">How well Connect understands real families — every clarification, handoff and &ldquo;not quite&rdquo; flag. Mark a failure for regression and it joins the test suite.</p>
      </div>

      {/* Weekly metrics — this week */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { icon: Brain, label: 'Understood first try', value: pct(latest?.first_try_pct ?? null) },
          { icon: ArrowRightLeft, label: 'Resolved after clarify', value: pct(latest?.resolved_after_clarify_pct ?? null) },
          { icon: MessageCircleQuestion, label: 'Handed to a person', value: pct(latest?.handoff_pct ?? null) },
          { icon: Flag, label: 'Flagged wrong', value: latest?.flagged_wrong ?? 0 },
        ].map((m) => (
          <div key={m.label} className="rounded-lg border border-line bg-card p-4 shadow-sm">
            <m.icon className="h-4 w-4 text-green" strokeWidth={1.75} />
            <p className="mt-3 text-h3 tabular-nums text-ink">{m.value}</p>
            <p className="mt-0.5 text-caption leading-tight text-muted">{m.label}</p>
          </div>
        ))}
      </section>
      {weekly.length > 1 && (
        <div className="overflow-x-auto rounded-lg border border-line bg-card shadow-sm">
          <table className="w-full min-w-[34rem] text-body-sm">
            <thead><tr className="border-b border-line text-caption uppercase tracking-wide text-muted">
              <th className="px-4 py-2.5 text-left font-medium">Week of</th><th className="px-4 py-2.5 text-right font-medium">Sessions</th>
              <th className="px-4 py-2.5 text-right font-medium">First try</th><th className="px-4 py-2.5 text-right font-medium">After clarify</th>
              <th className="px-4 py-2.5 text-right font-medium">Handoff</th><th className="px-4 py-2.5 text-right font-medium">Flags</th>
            </tr></thead>
            <tbody>{weekly.map((w) => (
              <tr key={w.week} className="border-b border-line last:border-0">
                <td className="px-4 py-2.5 text-ink">{weekOf(w.week)}</td><td className="px-4 py-2.5 text-right tabular-nums text-muted">{w.sessions}</td>
                <td className="px-4 py-2.5 text-right tabular-nums text-ink">{pct(w.first_try_pct)}</td><td className="px-4 py-2.5 text-right tabular-nums text-ink">{pct(w.resolved_after_clarify_pct)}</td>
                <td className="px-4 py-2.5 text-right tabular-nums text-ink">{pct(w.handoff_pct)}</td><td className="px-4 py-2.5 text-right tabular-nums text-ink">{w.flagged_wrong ?? 0}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button key={f.key} onClick={() => setFilter(f.key)} className={cn('rounded-full border px-3.5 py-1.5 text-caption font-medium transition-colors', filter === f.key ? 'border-green bg-accent-soft text-green' : 'border-line text-muted hover:border-ink/20')}>
            {f.label} <span className="tabular-nums opacity-60">{all.filter((r) => (f.key === 'all' ? true : f.key === 'unreviewed' ? !r.reviewed : r.event === f.key)).length}</span>
          </button>
        ))}
      </div>

      {/* Log */}
      {error ? (
        <EmptyState icon={Brain} title="Couldn’t load the log" hint="If the understanding_log table isn’t applied yet, run the migration and refresh." />
      ) : !rows ? (
        <div className="grid place-items-center py-16"><Loader2 className="h-6 w-6 animate-spin text-green" strokeWidth={2} /></div>
      ) : list.length === 0 ? (
        <EmptyState icon={Check} title="Nothing here" hint="No events match this filter yet." />
      ) : (
        <div className="flex flex-col gap-3">
          {list.map((r) => {
            const em = EVENT_META[r.event]
            return (
              <div key={r.id} className="rounded-lg border border-line bg-card p-4 shadow-sm">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className={cn('rounded-full px-2.5 py-1 text-caption font-semibold', em.cls)}>{em.label}</span>
                  {r.again_count > 0 && <span className="text-caption text-muted">round {r.again_count}</span>}
                  {r.reviewed && <span className="inline-flex items-center gap-1 text-caption font-medium text-green"><Check className="h-3 w-3" strokeWidth={3} /> reviewed</span>}
                  <span className="ml-auto text-caption text-muted">{when(r.created_at)}</span>
                </div>
                <p className="mt-2.5 text-body text-ink">&ldquo;{r.raw_text}&rdquo;</p>
                <p className="mt-1 text-caption text-muted">Understood — {understoodSummary(r.understood)}</p>
                {r.reviewed ? (
                  r.expected && <p className="mt-2 text-caption text-green">Should be → {r.expected}</p>
                ) : (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <input
                      value={draft[r.id] ?? ''} onChange={(e) => setDraft((d) => ({ ...d, [r.id]: e.target.value }))}
                      placeholder="What should it have understood? (e.g. subject: family, need: errand)"
                      className="min-w-[14rem] flex-1 rounded-md border border-line bg-ivory px-3 py-2 text-body-sm text-ink outline-none focus:border-green"
                    />
                    <button onClick={() => save(r.id)} disabled={saving === r.id} className="inline-flex items-center gap-1.5 rounded-md bg-ink px-3.5 py-2 text-body-sm font-semibold text-white disabled:opacity-60">
                      {saving === r.id ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} /> : <Flag className="h-4 w-4" strokeWidth={2} />} Mark for regression
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
