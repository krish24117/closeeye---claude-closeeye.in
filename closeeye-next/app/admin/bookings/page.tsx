import { InsightBars } from '@/components/admin/insight-bars'
import { BOOKING_STATS, BOOKING_SOURCES } from '@/lib/admin-data'

export default function BookingsPage() {
  const b = BOOKING_STATS
  const tiles = [
    { label: 'Completed', value: b.completed, tone: 'text-success' },
    { label: 'Cancelled', value: b.cancelled, tone: 'text-error' },
    { label: 'Rescheduled', value: b.rescheduled, tone: 'text-warning' },
    { label: 'No-show', value: b.noShow, tone: 'text-error' },
    { label: 'Completion rate', value: b.completionRate, tone: 'text-ink' },
    { label: 'Avg duration', value: b.avgDuration, tone: 'text-ink' },
    { label: 'Conversion rate', value: b.conversionRate, tone: 'text-ink' },
  ]
  const totalOutcomes = b.completed + b.cancelled + b.rescheduled + b.noShow
  const seg = (n: number) => `${(n / totalOutcomes) * 100}%`

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-h2">Booking analytics</h1>
        <p className="mt-1.5 text-body leading-relaxed text-muted">How visits are booked and how they end — this month.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-lg border border-line bg-card p-4 shadow-sm">
            <p className={`text-h3 leading-none ${t.tone}`}>{t.value}</p>
            <p className="mt-1.5 text-caption text-muted">{t.label}</p>
          </div>
        ))}
      </div>

      <section className="rounded-lg border border-line bg-card p-5 shadow-sm">
        <h2 className="text-h4">Visit outcomes</h2>
        <p className="mt-1 text-caption text-muted">{totalOutcomes} visits · {b.completionRate} completed</p>
        <div className="mt-4 flex h-4 overflow-hidden rounded-full">
          <span className="bg-success" style={{ width: seg(b.completed) }} title={`Completed ${b.completed}`} />
          <span className="bg-warning" style={{ width: seg(b.rescheduled) }} title={`Rescheduled ${b.rescheduled}`} />
          <span className="bg-error/70" style={{ width: seg(b.cancelled) }} title={`Cancelled ${b.cancelled}`} />
          <span className="bg-error" style={{ width: seg(b.noShow) }} title={`No-show ${b.noShow}`} />
        </div>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-caption text-muted">
          <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-success" /> Completed</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-warning" /> Rescheduled</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-error/70" /> Cancelled</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-error" /> No-show</span>
        </div>
      </section>

      <section className="rounded-lg border border-line bg-card p-5 shadow-sm md:max-w-xl">
        <h2 className="mb-4 text-h4">Booking sources</h2>
        <InsightBars rows={BOOKING_SOURCES} format={(n) => `${n}%`} />
      </section>
    </div>
  )
}
