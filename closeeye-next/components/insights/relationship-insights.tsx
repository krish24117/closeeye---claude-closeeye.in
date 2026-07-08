import Link from 'next/link'
import { Lightbulb, ArrowRight } from 'lucide-react'
import { Avatar } from '@/components/family/avatar'
import { StatusPill } from '@/components/insights/status-pill'
import { relationshipInsights } from '@/lib/cloza-engine'

/** Relationship Intelligence — how connected each family feels, and who to reach. */
export function RelationshipInsights() {
  const rows = relationshipInsights()
  return (
    <section className="overflow-hidden rounded-lg border border-line bg-card shadow-sm">
      <h2 className="border-b border-line px-5 py-4 text-h4">Relationship insights</h2>
      <ul className="divide-y divide-line">
        {rows.map((r) => (
          <li key={r.family.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
            <Avatar initials={r.family.memberInitials} size="sm" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-body-sm font-semibold text-ink">{r.family.familyName}</span>
              <span className="block truncate text-caption text-muted">{r.signal}</span>
            </span>
            <StatusPill level={r.engagement} />
            {r.recommendation && (
              <Link href="/console/messages" className="flex w-full items-center justify-between gap-2 rounded-md bg-accent-soft/40 px-3 py-2 sm:w-auto sm:flex-1">
                <span className="inline-flex items-start gap-1.5 text-caption text-ink"><Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-green" strokeWidth={1.75} /> {r.recommendation}</span>
                <ArrowRight className="h-3.5 w-3.5 shrink-0 text-green" strokeWidth={2} />
              </Link>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}
