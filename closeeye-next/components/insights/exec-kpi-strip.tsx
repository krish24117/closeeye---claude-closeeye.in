import { EXEC_KPIS } from '@/lib/exec-intel'

/** Executive KPI strip — a compact, horizontally scrollable read of the whole business. */
export function ExecKpiStrip() {
  return (
    <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1">
      {EXEC_KPIS.map((k) => (
        <div key={k.label} className="min-w-[8.5rem] shrink-0 rounded-lg border border-line bg-card p-4 shadow-sm">
          <p className="text-caption font-medium text-muted">{k.label}</p>
          <p className="mt-1.5 text-h3 leading-none text-ink">{k.value}</p>
        </div>
      ))}
    </div>
  )
}
