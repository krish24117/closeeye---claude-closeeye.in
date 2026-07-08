import Link from 'next/link'
import { Clock, MapPin, Camera, Phone, ArrowRight, Sparkles, XCircle, RefreshCw } from 'lucide-react'
import { Avatar } from '@/components/family/avatar'
import { VisitStatusBadge, VISIT_TYPE } from '@/components/console/visit-status-badge'
import { guardianById, familyById, type ConsoleVisit } from '@/lib/console-data'
import { cn } from '@/lib/utils'

/** LiveVisitCard — one visit on the live monitor: who, where, progress, AI status, media.
 *  `actions` lets a client parent inject Reschedule / Cancel controls. */
export function LiveVisitCard({ visit, actions }: { visit: ConsoleVisit; actions?: React.ReactNode }) {
  const guardian = guardianById(visit.guardianId)
  const family = familyById(visit.familyId)
  const type = VISIT_TYPE[visit.visitType]
  const TypeIcon = type.icon
  const live = visit.status === 'on-site'
  const cancelled = visit.status === 'cancelled'
  const rescheduled = visit.status === 'rescheduled'
  const settled = cancelled || rescheduled || visit.status === 'completed'

  return (
    <article className={cn('rounded-lg border bg-card p-4 shadow-sm', cancelled ? 'border-error/25 opacity-90' : visit.status === 'delayed' ? 'border-warning/40' : live ? 'border-green/30' : 'border-line')}>
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-body-sm font-bold text-ink">
          <Clock className="h-4 w-4 text-green" strokeWidth={2} /> {visit.timeLabel}
        </span>
        <div className="flex items-center gap-1.5">
          {visit.priority === 'high' && !settled && <span className="rounded-full bg-error/10 px-2 py-0.5 text-[0.6rem] font-bold uppercase text-error">Priority</span>}
          {live && <span className="h-2 w-2 animate-pulse rounded-full bg-green" aria-label="Live" />}
          <VisitStatusBadge status={visit.status} />
        </div>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <Avatar initials={family?.memberInitials ?? '··'} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-body-sm font-semibold text-ink">{visit.memberName}</p>
          <p className="truncate text-caption text-muted">{guardian?.name} · {family?.area}</p>
        </div>
        <span className={cn('inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[0.65rem] font-semibold', type.chip)}>
          <TypeIcon className="h-3 w-3" strokeWidth={1.75} /> {type.label}
        </span>
      </div>

      {cancelled ? (
        <p className="mt-3 flex items-start gap-1.5 rounded-md bg-error/[0.06] p-2.5 text-caption text-error">
          <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={1.75} /> Cancelled{visit.cancelReason ? ` · ${visit.cancelReason}` : ''}
        </p>
      ) : rescheduled ? (
        <p className="mt-3 flex items-start gap-1.5 rounded-md bg-warning/[0.06] p-2.5 text-caption text-warning">
          <RefreshCw className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={1.75} /> Moved to {visit.rescheduledTo ?? 'a new time'}
        </p>
      ) : (
        <>
          <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-caption">
            {visit.checkinLabel ? <div><dt className="text-muted">Checked in</dt><dd className="font-medium text-ink">{visit.checkinLabel}</dd></div> : <div><dt className="text-muted">ETA</dt><dd className="font-medium text-ink">{visit.etaLabel}</dd></div>}
            {visit.gpsLabel && <div><dt className="inline-flex items-center gap-1 text-muted"><MapPin className="h-3 w-3" strokeWidth={1.75} /> GPS</dt><dd className="font-medium text-ink">{visit.gpsLabel}</dd></div>}
            {visit.durationLabel && <div><dt className="text-muted">Duration</dt><dd className="font-medium text-ink">{visit.durationLabel}</dd></div>}
            {visit.mediaCount > 0 && <div><dt className="inline-flex items-center gap-1 text-muted"><Camera className="h-3 w-3" strokeWidth={1.75} /> Media</dt><dd className="font-medium text-ink">{visit.mediaCount} uploaded</dd></div>}
          </dl>
          <p className="mt-3 flex items-start gap-1.5 rounded-md bg-accent-soft/40 p-2.5 text-caption text-ink">
            <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-green" strokeWidth={1.75} /> {visit.aiStatus}
          </p>
          {visit.delayLabel && <p className="mt-2 text-caption font-semibold text-warning">⚠ {visit.delayLabel}</p>}
        </>
      )}

      {actions ?? (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <a href={`tel:${guardian?.phone.replace(/\s/g, '')}`} className="flex min-h-[2.5rem] items-center justify-center gap-1.5 rounded-sm border border-ink/15 text-caption font-semibold text-ink transition-colors hover:border-ink/30 hover:bg-ink/[0.03]"><Phone className="h-3.5 w-3.5 text-green" strokeWidth={1.75} /> Guardian</a>
          <Link href={`/console/families/${visit.familyId}`} className="flex min-h-[2.5rem] items-center justify-center gap-1.5 rounded-sm border border-ink/15 text-caption font-semibold text-ink transition-colors hover:border-ink/30 hover:bg-ink/[0.03]">Open <ArrowRight className="h-3.5 w-3.5 text-green" strokeWidth={1.75} /></Link>
        </div>
      )}
    </article>
  )
}
