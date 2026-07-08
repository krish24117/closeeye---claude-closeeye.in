import { Clock, CalendarDays } from 'lucide-react'
import { ZONES, OPERATING_HOURS, HOLIDAYS } from '@/lib/admin-data'
import { cn } from '@/lib/utils'

const ZONE_TONE = { healthy: 'bg-success/12 text-success', tight: 'bg-warning/12 text-warning', gap: 'bg-error/10 text-error' } as const

export default function CoveragePage() {
  const cities = Array.from(new Set(ZONES.map((z) => z.city)))
  const pincodes = ZONES.reduce((s, z) => s + z.pincodes, 0)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-h2">Coverage</h1>
        <p className="mt-1.5 text-body leading-relaxed text-muted">Cities, zones and pincodes — with supply health at a glance.</p>
      </div>

      <div className="grid grid-cols-3 gap-3 sm:max-w-md">
        {[{ l: 'Cities', v: cities.length }, { l: 'Zones', v: ZONES.length }, { l: 'Pincodes', v: pincodes }].map((s) => (
          <div key={s.l} className="rounded-lg border border-line bg-card p-4 text-center shadow-sm"><p className="text-h3 text-ink">{s.v}</p><p className="text-caption text-muted">{s.l}</p></div>
        ))}
      </div>

      <section className="overflow-hidden rounded-lg border border-line bg-card shadow-sm">
        <div className="hidden grid-cols-[1.4fr_1fr_1fr_1fr_1fr] gap-3 border-b border-line px-5 py-3 text-caption font-semibold uppercase tracking-wide text-muted sm:grid">
          <span>City · Zone</span><span>Pincodes</span><span>Guardians</span><span>Companions</span><span className="text-right">Status</span>
        </div>
        <ul className="divide-y divide-line">
          {ZONES.map((z) => (
            <li key={`${z.city}-${z.zone}`} className="grid grid-cols-2 items-center gap-3 px-5 py-3.5 sm:grid-cols-[1.4fr_1fr_1fr_1fr_1fr]">
              <span className="text-body-sm font-semibold text-ink">{z.city} · {z.zone}</span>
              <span className="hidden text-body-sm text-muted sm:block">{z.pincodes}</span>
              <span className="hidden text-body-sm text-muted sm:block">{z.guardians}</span>
              <span className="hidden text-body-sm text-muted sm:block">{z.companions}</span>
              <span className="justify-self-end"><span className={cn('rounded-full px-2.5 py-0.5 text-caption font-semibold capitalize', ZONE_TONE[z.status])}>{z.status}</span></span>
            </li>
          ))}
        </ul>
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="rounded-lg border border-line bg-card p-5 shadow-sm">
          <h2 className="flex items-center gap-2 text-h4"><Clock className="h-5 w-5 text-green" strokeWidth={1.5} /> Operating hours</h2>
          <p className="mt-3 text-body text-ink">{OPERATING_HOURS}</p>
        </section>
        <section className="rounded-lg border border-line bg-card p-5 shadow-sm">
          <h2 className="flex items-center gap-2 text-h4"><CalendarDays className="h-5 w-5 text-green" strokeWidth={1.5} /> Holiday calendar</h2>
          <ul className="mt-3 flex flex-col gap-2">
            {HOLIDAYS.map((h) => (
              <li key={h.name} className="flex items-center justify-between text-body-sm"><span className="text-ink">{h.name}</span><span className="text-muted">{h.date}</span></li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}
