import Link from 'next/link'
import { TriangleAlert, ArrowRight, Phone, CheckCircle2, Clock, Smile, ShieldCheck } from 'lucide-react'
import { ConsoleGreeting } from '@/components/console/console-greeting'
import { VisitStatusBadge } from '@/components/console/visit-status-badge'
import {
  FAMILIES, ESCALATIONS, TODAY_VISITS, KPIS,
  familyById, guardianById,
  type HealthStatus, type EscalationPriority,
} from '@/lib/console-data'
import { cn } from '@/lib/utils'

const PRIO_ORDER: Record<EscalationPriority, number> = { critical: 0, high: 1, medium: 2, low: 3 }
const STATUS_ORDER: Record<HealthStatus, number> = { red: 0, yellow: 1, green: 2 }

const SEV: Record<EscalationPriority, { tone: 'red' | 'amber'; tag: string }> = {
  critical: { tone: 'red', tag: 'Critical' },
  high: { tone: 'red', tag: 'Urgent' },
  medium: { tone: 'amber', tag: 'Needs action' },
  low: { tone: 'amber', tag: 'Follow-up' },
}

const FAM_STATUS: Record<HealthStatus, { label: string; chip: string; dot: string }> = {
  green: { label: 'Doing well', chip: 'bg-success/12 text-success', dot: 'bg-success' },
  yellow: { label: 'Keep an eye', chip: 'bg-warning/15 text-warning', dot: 'bg-warning' },
  red: { label: 'Needs attention', chip: 'bg-error/10 text-error', dot: 'bg-error' },
}

export default function ConsoleDashboard() {
  const openEsc = [...ESCALATIONS]
    .filter((e) => e.status !== 'resolved')
    .sort((a, b) => PRIO_ORDER[a.priority] - PRIO_ORDER[b.priority])
  const doingWell = FAMILIES.filter((f) => f.status === 'green').length
  const presenceToday = TODAY_VISITS.filter((v) => v.status !== 'cancelled' && v.status !== 'rescheduled' && v.status !== 'missed').length
  const completeToday = TODAY_VISITS.filter((v) => v.status === 'completed').length
  const roster = [...FAMILIES].sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status])
  const schedule = TODAY_VISITS.filter((v) => v.status !== 'cancelled' && v.status !== 'rescheduled')

  const strip: { label: string; dot: string }[] = [
    { label: `${doingWell} doing well`, dot: 'bg-success' },
    { label: `${openEsc.length} need you`, dot: 'bg-warning' },
    { label: `${presenceToday} Presence today`, dot: 'bg-green' },
    { label: `${completeToday} complete`, dot: 'bg-green' },
  ]

  return (
    <div className="flex flex-col gap-8">
      {/* Greeting + a calm status strip (not KPI tiles) */}
      <section>
        <ConsoleGreeting />
        <div className="mt-5 flex flex-wrap gap-2.5">
          {strip.map((s) => (
            <span key={s.label} className="inline-flex items-center gap-2 rounded-full border border-line bg-card px-3.5 py-2 text-caption font-bold text-ink shadow-sm">
              <span className={cn('h-2 w-2 rounded-full', s.dot)} /> {s.label}
            </span>
          ))}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Needs you now — the hero (triage, severity-first) */}
        <section className="lg:col-span-2">
          <div className="mb-3 flex items-end justify-between">
            <h2 className="flex items-center gap-2 text-h4"><span className="text-error">●</span> Needs you now</h2>
            <span className="text-caption font-semibold text-muted">{openEsc.length} {openEsc.length === 1 ? 'item' : 'items'}</span>
          </div>

          {openEsc.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-lg border border-line bg-card py-14 text-center shadow-sm">
              <span className="grid h-12 w-12 place-items-center rounded-full bg-success/12 text-success"><CheckCircle2 className="h-6 w-6" strokeWidth={1.75} /></span>
              <p className="text-body font-semibold text-ink">Everyone is doing well</p>
              <p className="text-body-sm text-muted">No families need your attention right now.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-line bg-card shadow-sm">
              {openEsc.map((e, i) => {
                const f = familyById(e.familyId)
                const sev = SEV[e.priority]
                const red = sev.tone === 'red'
                return (
                  <div
                    key={e.id}
                    className={cn(
                      'flex gap-3.5 border-l-4 p-4',
                      i > 0 && 'border-t border-t-line',
                      red ? 'border-l-error bg-error/[0.03]' : 'border-l-warning',
                    )}
                  >
                    <span className={cn('mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-md', red ? 'bg-error/10 text-error' : 'bg-warning/12 text-warning')}>
                      <TriangleAlert className="h-5 w-5" strokeWidth={1.75} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-body-sm font-bold text-ink">{f ? `${f.memberName} · ${f.familyName}` : e.familyId}</p>
                        <span className={cn('rounded px-1.5 py-0.5 text-[0.6rem] font-bold uppercase tracking-wide', red ? 'bg-error/12 text-error' : 'bg-warning/15 text-warning')}>{sev.tag}</span>
                        <span className="text-caption text-muted">{e.createdLabel}</span>
                      </div>
                      <p className="mt-1 text-body-sm text-ink">{e.issue}</p>
                      <p className="mt-1 text-caption text-muted"><span className="font-semibold text-green">Suggested:</span> {e.recommendedAction}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {f && (
                          <Link href={`/console/families/${f.id}`} className="inline-flex items-center gap-1.5 rounded-sm bg-ink px-3 py-1.5 text-caption font-bold text-ivory transition-opacity hover:opacity-90">
                            Open family <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
                          </Link>
                        )}
                        {red && f && (
                          <a href={`tel:${f.phone.replace(/\s/g, '')}`} className="inline-flex items-center gap-1.5 rounded-sm border border-line px-3 py-1.5 text-caption font-bold text-ink transition-colors hover:border-green/50 hover:text-green">
                            <Phone className="h-3.5 w-3.5" strokeWidth={1.75} /> Call family
                          </a>
                        )}
                        <Link href="/console/escalations" className="inline-flex items-center gap-1.5 rounded-sm border border-line px-3 py-1.5 text-caption font-bold text-ink transition-colors hover:border-green/50 hover:text-green">
                          Escalation
                        </Link>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* Rail — Today's Presence + a quiet week summary */}
        <div className="flex flex-col gap-6">
          <section>
            <div className="mb-3 flex items-end justify-between">
              <h2 className="text-h4">Today&apos;s Presence</h2>
              <Link href="/console/visits" className="inline-flex items-center gap-1 text-caption font-semibold text-green hover:underline">Live monitor <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} /></Link>
            </div>
            <div className="overflow-hidden rounded-lg border border-line bg-card shadow-sm">
              <ul className="divide-y divide-line">
                {schedule.map((v) => {
                  const g = guardianById(v.guardianId)
                  return (
                    <li key={v.id}>
                      <Link href={`/console/families/${v.familyId}`} className="flex flex-col gap-1.5 px-4 py-3 transition-colors hover:bg-accent-soft/30">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-body-sm font-semibold text-ink">{v.memberName}</span>
                          <VisitStatusBadge status={v.status} />
                        </div>
                        <span className="text-caption text-muted">{v.timeLabel} · {g?.name ?? 'Guardian'}</span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-h4">Your week</h2>
            <div className="flex flex-col gap-3 rounded-lg border border-line bg-card p-5 shadow-sm">
              {[
                { icon: Smile, label: 'Family satisfaction', value: KPIS.satisfaction },
                { icon: CheckCircle2, label: 'On-time completion', value: KPIS.completionRate },
                { icon: Clock, label: 'Avg reply to a family', value: KPIS.avgResponse },
                { icon: ShieldCheck, label: 'Guardians on shift', value: KPIS.guardianAvailability },
              ].map((k) => {
                const Icon = k.icon
                return (
                  <div key={k.label} className="flex items-center gap-3">
                    <Icon className="h-4 w-4 shrink-0 text-green" strokeWidth={1.75} />
                    <span className="flex-1 text-caption text-muted">{k.label}</span>
                    <span className="text-body-sm font-bold text-ink">{k.value}</span>
                  </div>
                )
              })}
            </div>
          </section>
        </div>
      </div>

      {/* In your care — families needing attention first, human states */}
      <section>
        <div className="mb-3 flex items-end justify-between">
          <h2 className="text-h4">In your care</h2>
          <Link href="/console/families" className="inline-flex items-center gap-1 text-caption font-semibold text-green hover:underline">All {FAMILIES.length} families <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} /></Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {roster.map((f) => {
            const st = FAM_STATUS[f.status]
            return (
              <Link key={f.id} href={`/console/families/${f.id}`} className="group flex flex-col gap-3 rounded-lg border border-line bg-card p-4 shadow-sm transition-all duration-200 ease-premium hover:-translate-y-0.5 hover:shadow-md">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-green text-body-sm font-bold text-ivory">{f.memberInitials}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-body-sm font-bold text-ink group-hover:text-green">{f.memberName}</p>
                    <p className="truncate text-caption text-muted">{f.age} · {f.area}</p>
                  </div>
                </div>
                <span className={cn('inline-flex items-center gap-1.5 self-start rounded-full px-2.5 py-1 text-caption font-bold', st.chip)}>
                  <span className={cn('h-1.5 w-1.5 rounded-full', st.dot)} /> {st.label}
                </span>
                <p className="border-t border-line pt-2.5 text-caption text-muted">{f.reason}</p>
                <p className="text-caption text-muted">Next Presence · <span className="font-semibold text-ink">{f.nextVisitLabel}</span></p>
              </Link>
            )
          })}
        </div>
      </section>
    </div>
  )
}
