import { Lightbulb, Star } from 'lucide-react'
import { Avatar } from '@/components/family/avatar'
import { careQuality } from '@/lib/cloza-engine'

/** Care Quality Intelligence — consistency, punctuality and coaching per team member. */
export function CareQuality() {
  const rows = careQuality()
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {rows.map((c) => (
        <article key={c.name} className="rounded-lg border border-line bg-card p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <Avatar initials={c.name.split(' ').map((w) => w[0]).join('')} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-body-sm font-semibold text-ink">{c.name}</p>
              <p className="text-caption text-muted">{c.role}</p>
            </div>
            <span className="inline-flex items-center gap-1 text-caption font-semibold text-green"><Star className="h-3.5 w-3.5 fill-warning text-warning" strokeWidth={0} /> {c.feedback}</span>
          </div>
          <dl className="mt-3 grid grid-cols-2 gap-2 border-t border-line pt-3 text-caption">
            <div><dt className="text-muted">Consistency</dt><dd className="font-medium text-ink">{c.consistency}</dd></div>
            <div><dt className="text-muted">Punctuality</dt><dd className="font-medium text-ink">{c.punctuality}</dd></div>
          </dl>
          <p className="mt-3 flex items-start gap-1.5 rounded-md bg-accent-soft/40 p-2.5 text-caption text-ink">
            <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-green" strokeWidth={1.75} /> {c.coaching}
          </p>
        </article>
      ))}
    </div>
  )
}
