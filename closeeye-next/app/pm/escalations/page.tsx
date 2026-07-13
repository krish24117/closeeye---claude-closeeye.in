'use client'

import * as React from 'react'
import Link from 'next/link'
import { Loader2, Lock, TriangleAlert, MessageCircle, CheckCircle2, ArrowRight, Siren, Check } from 'lucide-react'
import { EmptyState, ErrorState } from '@/components/ui/states'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { useFamilyData } from '@/components/family/family-data-provider'
import {
  fetchConsoleEscalations, fetchActiveIncidents, acknowledgeIncident, resolveIncident,
  type ConsoleTriageItem, type ActiveIncident,
} from '@/lib/db/console'
import { canUseConsole } from '@/lib/roles'
import { cn } from '@/lib/utils'

function ago(iso: string): string {
  const s = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000))
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60); if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export default function EscalationsPage() {
  const { profile, loading } = useFamilyData()
  const isStaff = canUseConsole(profile)
  const toast = useToast()
  const [items, setItems] = React.useState<ConsoleTriageItem[] | null>(null)
  const [incidents, setIncidents] = React.useState<ActiveIncident[]>([])
  const [error, setError] = React.useState(false)
  const [busy, setBusy] = React.useState<string | null>(null)

  const load = React.useCallback(() => {
    if (!isStaff) return
    setError(false)
    fetchConsoleEscalations()
      .then((r) => { setItems(r); setError(false) })
      .catch(() => { setItems(null); setError(true) })
    fetchActiveIncidents().then(setIncidents).catch(() => setIncidents([]))
  }, [isStaff])

  React.useEffect(() => { load() }, [load])

  async function ack(id: string) {
    setBusy(id)
    try { await acknowledgeIncident(id); toast('Acknowledged — you own this now', 'success'); load() }
    catch (e) { toast(e instanceof Error ? e.message : 'Could not acknowledge.', 'info') }
    finally { setBusy(null) }
  }
  async function resolve(id: string) {
    setBusy(id)
    try { await resolveIncident(id); toast('Incident resolved', 'success'); load() }
    catch (e) { toast(e instanceof Error ? e.message : 'Could not resolve.', 'info') }
    finally { setBusy(null) }
  }

  if (loading) {
    return <div className="grid place-items-center py-24"><Loader2 className="h-6 w-6 animate-spin text-green" strokeWidth={2} /></div>
  }
  if (!isStaff) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-h2">Escalations</h1>
        <EmptyState icon={Lock} title="Restricted" hint="This is only available to Close Eye team members." />
      </div>
    )
  }

  const reds = (items ?? []).filter((t) => t.tone === 'red').length
  const nothingOpen = items !== null && items.length === 0 && incidents.length === 0

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-h2">Escalations</h1>
        <p className="mt-1.5 text-body leading-relaxed text-muted">
          Anything that needs a human decision — an active emergency, an urgent health question, a visit that needs attention, or a family waiting for a reply.
          {incidents.length > 0 && <span className="font-semibold text-error"> {incidents.length} active emergency{incidents.length > 1 ? ' incidents' : ''}.</span>}
          {incidents.length === 0 && reds > 0 && <span className="font-semibold text-error"> {reds} urgent.</span>}
        </p>
      </div>

      {/* Active emergencies — owned incidents from the red-flag escalation path */}
      {incidents.length > 0 && (
        <section className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Siren className="h-5 w-5 text-error" strokeWidth={2} />
            <h2 className="text-body font-bold text-ink">Active emergencies</h2>
            <span className="rounded-full bg-error/12 px-2 py-0.5 text-[0.65rem] font-bold uppercase text-error">{incidents.length}</span>
          </div>
          <div className="flex flex-col gap-3">
            {incidents.map((inc) => (
              <div key={inc.id} className="rounded-lg border border-error/30 bg-error/[0.04] p-4 shadow-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded bg-error px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wide text-white">{(inc.category ?? 'emergency').replace(/_/g, ' ')}</span>
                  <p className="text-body-sm font-bold text-ink">{inc.memberName}</p>
                  {inc.acknowledgedAt ? (
                    <span className="inline-flex items-center gap-1 text-caption font-semibold text-green"><CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2} /> Owned · {ago(inc.acknowledgedAt)}</span>
                  ) : (
                    <span className="rounded px-1.5 py-0.5 text-[0.6rem] font-bold uppercase tracking-wide text-error ring-1 ring-error/40">Unowned</span>
                  )}
                </div>
                <p className="mt-2 text-body-sm text-ink">“{inc.question}”</p>
                <p className="mt-1.5 text-caption text-muted">
                  Escalated {ago(inc.escalatedAt)}
                  {inc.delivered === false && <span className="font-semibold text-error"> · ⚠ alert may not have reached the team — call now</span>}
                  {inc.delivered === true && <span> · care team alerted</span>}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2.5">
                  {!inc.acknowledgedAt && (
                    <Button size="sm" onClick={() => ack(inc.id)} disabled={busy === inc.id}>
                      {busy === inc.id ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} /> : <Check className="h-4 w-4" strokeWidth={2} />} Acknowledge
                    </Button>
                  )}
                  <Button variant="secondary" size="sm" onClick={() => resolve(inc.id)} disabled={busy === inc.id}>Resolve</Button>
                  {inc.lovedOneId && (
                    <Link href={`/pm/families/${inc.lovedOneId}`} className="inline-flex items-center gap-1 text-caption font-bold text-green hover:underline">Open the family <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} /></Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {error ? (
        <ErrorState title="Couldn’t load escalations" message="This is a connection error — NOT an all-clear. An urgent item could be waiting. Please retry." onRetry={load} />
      ) : items === null ? (
        <div className="grid place-items-center rounded-lg border border-line bg-card py-16 shadow-sm"><Loader2 className="h-6 w-6 animate-spin text-green" strokeWidth={2} /></div>
      ) : nothingOpen ? (
        <EmptyState icon={CheckCircle2} title="Nothing open" hint="Every family is accounted for. 💚" />
      ) : items.length > 0 ? (
        <div className="overflow-hidden rounded-lg border border-line bg-card shadow-sm">
          {items.map((t, i) => {
            const red = t.tone === 'red'
            const Icon = t.kind === 'message' ? MessageCircle : TriangleAlert
            return (
              <Link key={t.id} href={t.href} className={cn('flex gap-3.5 border-l-4 p-4 transition-colors hover:bg-accent-soft/20', red ? 'border-l-error bg-error/[0.03]' : 'border-l-warning', i > 0 && 'border-t border-t-line')}>
                <span className={cn('mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-md', red ? 'bg-error/10 text-error' : 'bg-warning/12 text-warning')}><Icon className="h-5 w-5" strokeWidth={1.75} /></span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-body-sm font-bold text-ink">{t.memberName}</p>
                    <span className={cn('rounded px-1.5 py-0.5 text-[0.6rem] font-bold uppercase tracking-wide', red ? 'bg-error/12 text-error' : 'bg-warning/15 text-warning')}>{t.tag}</span>
                  </div>
                  <p className="mt-1 text-body-sm text-ink">{t.text}</p>
                  <span className="mt-2 inline-flex items-center gap-1.5 text-caption font-bold text-green">Open the family <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} /></span>
                </div>
              </Link>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
