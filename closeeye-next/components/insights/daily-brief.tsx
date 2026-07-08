import { Briefcase, Activity, Users, IndianRupee, ShieldAlert, Sparkles } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { dailyBrief } from '@/lib/cloza-engine'

const ICON: Record<string, LucideIcon> = { business: Briefcase, operations: Activity, family: Users, revenue: IndianRupee, risk: ShieldAlert }

/** Founder Daily Brief — the morning read. Human-readable, action-oriented. */
export function DailyBrief() {
  const brief = dailyBrief()
  return (
    <section className="overflow-hidden rounded-lg border border-line bg-card shadow-sm">
      <div className="flex items-center gap-2.5 border-b border-line bg-accent-soft/40 px-6 py-4">
        <span className="grid h-9 w-9 place-items-center rounded-full bg-green text-ivory"><Sparkles className="h-5 w-5" strokeWidth={1.75} /></span>
        <div>
          <h2 className="text-h4">Daily brief</h2>
          <p className="text-caption text-muted">{brief.greeting}</p>
        </div>
      </div>

      <div className="grid gap-px bg-line sm:grid-cols-2 lg:grid-cols-3">
        {brief.sections.map((s) => {
          const Icon = ICON[s.key] ?? Briefcase
          return (
            <div key={s.key} className="bg-card p-5">
              <p className="flex items-center gap-1.5 text-caption font-semibold uppercase tracking-widest text-green">
                <Icon className="h-4 w-4" strokeWidth={1.75} /> {s.label}
              </p>
              <p className="mt-2 text-body-sm leading-relaxed text-ink">{s.text}</p>
            </div>
          )
        })}
        <div className="bg-ink p-5 text-white">
          <p className="text-caption font-semibold uppercase tracking-widest text-accent">Top recommendations</p>
          <ol className="mt-2 flex flex-col gap-2">
            {brief.recommendations.map((r, i) => (
              <li key={r} className="flex gap-2 text-body-sm leading-relaxed text-white/90">
                <span className="font-bold text-accent">{i + 1}.</span> {r}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  )
}
