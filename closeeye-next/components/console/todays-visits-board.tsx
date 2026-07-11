'use client'

import * as React from 'react'
import Link from 'next/link'
import { RefreshCw, XCircle, Undo2, ArrowRight, Check, CalendarClock } from 'lucide-react'
import { Overlay } from '@/components/family/overlay'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { LiveVisitCard } from '@/components/console/live-visit-card'
import { DashboardMetrics } from '@/components/console/dashboard-metrics'
import { TODAY_VISITS, GUARDIANS, guardianById, type ConsoleVisit, type VisitStatus } from '@/lib/console-data'
import { effectiveVisits } from '@/lib/visit-ops'
import { useVisitOps } from '@/features/console/use-visit-ops'
import { cn } from '@/lib/utils'

const CANCEL_REASONS = ['Family unavailable', 'Guardian unavailable', 'Medical emergency', 'Hospital admitted', 'Weather', 'Duplicate booking', 'Other']
const ACTIVE_GROUPS: { status: VisitStatus; label: string }[] = [
  { status: 'on-site', label: 'On site' },
  { status: 'delayed', label: 'Delayed' },
  { status: 'en-route', label: 'En route' },
  { status: 'upcoming', label: 'Upcoming' },
  { status: 'scheduled', label: 'Scheduled' },
  { status: 'completed', label: 'Completed' },
]
const SCHEDULABLE = new Set<VisitStatus>(['scheduled', 'upcoming', 'en-route', 'delayed'])

export function TodaysVisitsBoard() {
  const toast = useToast()
  const { ops, cancel, reschedule, reset } = useVisitOps()
  const [dialog, setDialog] = React.useState<{ visit: ConsoleVisit; mode: 'cancel' | 'reschedule' } | null>(null)

  const visits = effectiveVisits(TODAY_VISITS, ops)
  const live = visits.filter((v) => v.status === 'on-site' || v.status === 'en-route' || v.status === 'delayed').length
  const cancelled = visits.filter((v) => v.status === 'cancelled')
  const rescheduled = visits.filter((v) => v.status === 'rescheduled')

  // Cancel form
  const [reason, setReason] = React.useState(CANCEL_REASONS[0]!)
  // Reschedule form
  const [date, setDate] = React.useState('')
  const [time, setTime] = React.useState('')
  const [assignee, setAssignee] = React.useState('')

  function openCancel(visit: ConsoleVisit) { setReason(CANCEL_REASONS[0]!); setDialog({ visit, mode: 'cancel' }) }
  function openReschedule(visit: ConsoleVisit) { setDate(''); setTime(''); setAssignee(''); setDialog({ visit, mode: 'reschedule' }) }

  function confirmCancel() {
    if (!dialog) return
    cancel(dialog.visit.id, reason)
    toast('Visit cancelled · family and Guardian notified.')
    if (dialog.visit.priority === 'high') setTimeout(() => toast('Escalation raised to Operations — a high-priority visit was cancelled.', 'info'), 400)
    setDialog(null)
  }
  function confirmReschedule() {
    if (!dialog) return
    const when = date && time ? `${new Date(date + 'T00:00').toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' })} · ${time}` : 'a new time'
    reschedule(dialog.visit.id, { rescheduledTo: when, assigneeId: assignee || undefined })
    toast('Visit rescheduled · everyone notified.')
    setDialog(null)
  }

  const availableTeam = GUARDIANS.filter((g) => g.status === 'available')
  const chosen = assignee ? guardianById(assignee) : undefined

  const opsActions = (v: ConsoleVisit) => (
    <div className="mt-3 grid grid-cols-2 gap-2">
      <button type="button" onClick={() => openReschedule(v)} className="flex min-h-[2.5rem] items-center justify-center gap-1.5 rounded-sm border border-ink/15 text-caption font-semibold text-ink transition-colors hover:border-ink/30 hover:bg-ink/[0.03]"><RefreshCw className="h-3.5 w-3.5 text-green" strokeWidth={1.75} /> Reschedule</button>
      <button type="button" onClick={() => openCancel(v)} className="flex min-h-[2.5rem] items-center justify-center gap-1.5 rounded-sm border border-error/25 text-caption font-semibold text-error transition-colors hover:bg-error/[0.05]"><XCircle className="h-3.5 w-3.5" strokeWidth={1.75} /> Cancel</button>
    </div>
  )
  const undoAction = (v: ConsoleVisit, withReschedule?: boolean) => (
    <div className={cn('mt-3 grid gap-2', withReschedule ? 'grid-cols-2' : 'grid-cols-1')}>
      <button type="button" onClick={() => { reset(v.id); toast('Restored to the schedule.') }} className="flex min-h-[2.5rem] items-center justify-center gap-1.5 rounded-sm border border-ink/15 text-caption font-semibold text-ink transition-colors hover:border-ink/30 hover:bg-ink/[0.03]"><Undo2 className="h-3.5 w-3.5 text-green" strokeWidth={1.75} /> Undo</button>
      {withReschedule && <button type="button" onClick={() => openReschedule(v)} className="flex min-h-[2.5rem] items-center justify-center gap-1.5 rounded-sm border border-ink/15 text-caption font-semibold text-ink transition-colors hover:border-ink/30 hover:bg-ink/[0.03]"><RefreshCw className="h-3.5 w-3.5 text-green" strokeWidth={1.75} /> Reschedule</button>}
    </div>
  )

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-h2">Today&apos;s visits</h1>
          <p className="mt-1.5 text-body leading-relaxed text-muted">The live monitor — check-ins, GPS, progress and AI status. Reschedule or cancel any scheduled visit.</p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full bg-accent-soft px-3.5 py-1.5 text-caption font-semibold text-green">
          <span className="h-2 w-2 animate-pulse rounded-full bg-green" /> {live} live now
        </span>
      </div>

      <DashboardMetrics />

      {ACTIVE_GROUPS.map((g) => {
        const items = visits.filter((v) => v.status === g.status)
        if (items.length === 0) return null
        return (
          <section key={g.status}>
            <p className="mb-3 text-caption font-semibold uppercase tracking-widest text-muted">{g.label} · {items.length}</p>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {items.map((v) => <LiveVisitCard key={v.id} visit={v} actions={SCHEDULABLE.has(v.status) ? opsActions(v) : undefined} />)}
            </div>
          </section>
        )
      })}

      {/* Operational disruptions — first-class, never hidden */}
      {cancelled.length > 0 && (
        <section>
          <p className="mb-3 text-caption font-semibold uppercase tracking-widest text-error">❌ Cancelled today · {cancelled.length}</p>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {cancelled.map((v) => <LiveVisitCard key={v.id} visit={v} actions={undoAction(v, true)} />)}
          </div>
        </section>
      )}
      {rescheduled.length > 0 && (
        <section>
          <p className="mb-3 text-caption font-semibold uppercase tracking-widest text-warning">🔄 Rescheduled today · {rescheduled.length}</p>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {rescheduled.map((v) => (
              <LiveVisitCard key={v.id} visit={v} actions={
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => { reset(v.id); toast('Restored to the schedule.') }} className="flex min-h-[2.5rem] items-center justify-center gap-1.5 rounded-sm border border-ink/15 text-caption font-semibold text-ink transition-colors hover:border-ink/30 hover:bg-ink/[0.03]"><Undo2 className="h-3.5 w-3.5 text-green" strokeWidth={1.75} /> Undo</button>
                  <Link href={`/pm/families/${v.familyId}`} className="flex min-h-[2.5rem] items-center justify-center gap-1.5 rounded-sm border border-ink/15 text-caption font-semibold text-ink transition-colors hover:border-ink/30 hover:bg-ink/[0.03]">Open <ArrowRight className="h-3.5 w-3.5 text-green" strokeWidth={1.75} /></Link>
                </div>
              } />
            ))}
          </div>
        </section>
      )}

      {/* Cancel / Reschedule dialog */}
      <Overlay open={Boolean(dialog)} onClose={() => setDialog(null)}>
        {dialog?.mode === 'cancel' && (
          <>
            <div className="flex items-center gap-2.5 border-b border-line px-6 py-4">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-error/10 text-error"><XCircle className="h-5 w-5" strokeWidth={1.5} /></span>
              <div><h2 className="text-h4">Cancel visit</h2><p className="text-caption text-muted">{dialog.visit.memberName} · {dialog.visit.timeLabel}</p></div>
            </div>
            <div className="flex flex-col gap-4 px-6 py-5">
              <div>
                <label className="text-caption font-semibold uppercase tracking-widest text-muted">Reason (required)</label>
                <div className="mt-2 flex flex-col gap-1.5">
                  {CANCEL_REASONS.map((r) => (
                    <button key={r} type="button" onClick={() => setReason(r)} className={cn('flex items-center gap-2.5 rounded-md border px-3.5 py-2.5 text-left text-body-sm transition-colors', reason === r ? 'border-green bg-accent-soft/50 text-ink' : 'border-line text-muted hover:border-ink/25')}>
                      <span className={cn('grid h-4 w-4 place-items-center rounded-full border', reason === r ? 'border-green bg-green text-ivory' : 'border-line')}>{reason === r && <Check className="h-2.5 w-2.5" strokeWidth={3} />}</span>
                      {r}
                    </button>
                  ))}
                </div>
              </div>
              <p className="text-caption text-muted">The family and Guardian are notified, the calendar and metrics update, and the visit stays in history — cancelled visits never disappear.</p>
              <div className="flex gap-2.5">
                <Button variant="secondary" size="sm" className="flex-1" onClick={() => setDialog(null)}>Keep visit</Button>
                <Button size="sm" className="flex-1" onClick={confirmCancel}>Confirm cancellation</Button>
              </div>
            </div>
          </>
        )}

        {dialog?.mode === 'reschedule' && (
          <>
            <div className="flex items-center gap-2.5 border-b border-line px-6 py-4">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-accent-soft text-green"><CalendarClock className="h-5 w-5" strokeWidth={1.5} /></span>
              <div><h2 className="text-h4">Reschedule visit</h2><p className="text-caption text-muted">{dialog.visit.memberName} · currently {dialog.visit.timeLabel}</p></div>
            </div>
            <div className="flex flex-col gap-4 px-6 py-5">
              <div className="grid grid-cols-2 gap-3">
                <label className="text-body-sm"><span className="mb-1 block text-caption font-semibold text-muted">New date</span><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full rounded-sm border border-line bg-ivory px-3 py-2.5 text-body-sm text-ink focus:border-green focus:outline-none" /></label>
                <label className="text-body-sm"><span className="mb-1 block text-caption font-semibold text-muted">New time</span><input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="w-full rounded-sm border border-line bg-ivory px-3 py-2.5 text-body-sm text-ink focus:border-green focus:outline-none" /></label>
              </div>
              <label className="text-body-sm">
                <span className="mb-1 block text-caption font-semibold text-muted">Assign to</span>
                <select value={assignee} onChange={(e) => setAssignee(e.target.value)} className="w-full rounded-sm border border-line bg-ivory px-3 py-2.5 text-body-sm text-ink focus:border-green focus:outline-none">
                  <option value="">Same care team member ({guardianById(dialog.visit.guardianId)?.name})</option>
                  <optgroup label="Available now">
                    {availableTeam.map((g) => <option key={g.id} value={g.id}>{g.name} · {g.role === 'companion' ? 'Companion' : 'Guardian'}</option>)}
                  </optgroup>
                </select>
              </label>
              {chosen && <p className="inline-flex items-center gap-1.5 text-caption font-medium text-success"><Check className="h-3.5 w-3.5" strokeWidth={2.5} /> {chosen.name.split(' ')[0]} is available — no conflicts</p>}
              {!chosen && <p className="text-caption text-muted">Availability is checked automatically. Everyone is notified after you confirm.</p>}
              <div className="flex gap-2.5">
                <Button variant="secondary" size="sm" className="flex-1" onClick={() => setDialog(null)}>Cancel</Button>
                <Button size="sm" className="flex-1" onClick={confirmReschedule}>Confirm reschedule</Button>
              </div>
            </div>
          </>
        )}
      </Overlay>
    </div>
  )
}
