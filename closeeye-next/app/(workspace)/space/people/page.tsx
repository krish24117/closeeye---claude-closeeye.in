'use client'

/**
 * People (Owner: People, /space/people). The roster of everyone you love; each opens their
 * Person Space. Every card now shows PROFILE COMPLETENESS — a quiet bar, a plain reason, and a
 * one-tap door into the profile form — because the more Close Eye knows a person, the better it
 * understands them and the faster Care can act. A finished profile reads "Fully known".
 */
import * as React from 'react'
import Link from 'next/link'
import { UserPlus, ChevronRight, Check, Network } from 'lucide-react'
import { useLovedOnes } from '@/components/family/family-data-provider'
import { titleCase } from '@/lib/family/relationship-words'
import { computeCompleteness, fetchHealthLiteMap, EMPTY_HEALTH, type HealthLite } from '@/lib/db/profile'

const initial = (s: string) => (s || '?').trim().charAt(0).toUpperCase()

/** Relationship-only people are stored as "your mother" — show the relationship as the name
 *  ("Mother") and drop the subline that would just repeat it. A real name shows name + role. */
function nameFor(fullName: string, relationship: string | null, city: string | null) {
  const relOnly = /^your\s/i.test(fullName)
  if (relOnly) {
    const rel = titleCase(fullName.replace(/^your\s+/i, ''))
    return { name: rel, sub: city || 'Family' }
  }
  // Never repeat the name as its own relationship line ("Mother · Mother").
  const relLabel = titleCase(relationship ?? '')
  const rel = relLabel.toLowerCase() === fullName.toLowerCase() ? '' : relLabel
  return { name: fullName, sub: [rel, city].filter(Boolean).join(' · ') || 'Family' }
}

export default function PeoplePage() {
  const { lovedOnes, loading, error } = useLovedOnes()
  const [health, setHealth] = React.useState<Record<string, HealthLite>>({})

  const ids = lovedOnes.map((l) => l.id).join(',')
  React.useEffect(() => {
    if (!lovedOnes.length) return
    let active = true
    void fetchHealthLiteMap(lovedOnes.map((l) => l.id)).then((m) => { if (active) setHealth(m) })
    return () => { active = false }
  }, [ids]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-h2 text-ink">People</h1>
        <div className="flex items-center gap-2">
          <Link href="/space/network" className="inline-flex items-center gap-1.5 rounded-full border border-line bg-card px-3.5 py-2 text-caption font-semibold text-ink transition-colors hover:border-green/40 hover:text-green">
            <Network className="h-4 w-4" strokeWidth={1.75} /> Trusted Network
          </Link>
          <Link href="/space/people/add" className="inline-flex items-center gap-1.5 rounded-full border border-line bg-card px-3.5 py-2 text-caption font-semibold text-ink transition-colors hover:border-green/40 hover:text-green">
            <UserPlus className="h-4 w-4" strokeWidth={1.75} /> Add someone
          </Link>
        </div>
      </div>

      {!loading && !error && lovedOnes.length > 0 && (
        <p className="-mt-1 text-body-sm leading-relaxed text-muted">
          The more Close Eye knows each person, the better it understands them — and the faster it can help when it matters.
        </p>
      )}

      {loading && <p className="py-12 text-center text-caption text-muted">Loading your family…</p>}
      {error && <p className="py-12 text-center text-body-sm text-error">We couldn’t load your family just now.</p>}

      {!loading && !error && lovedOnes.length === 0 && (
        <div className="rounded-lg border border-line/70 bg-card p-8 text-center shadow-sm">
          <p className="text-body-sm font-semibold text-ink">No one here yet</p>
          <p className="mx-auto mt-1 max-w-xs text-caption text-muted">Add someone you love, and Close Eye starts holding everything that matters about them.</p>
          <Link href="/space/people/add" className="mt-4 inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-body-sm font-semibold text-ivory"><UserPlus className="h-4 w-4" strokeWidth={2} /> Add someone</Link>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {lovedOnes.map((lo) => {
          const { name, sub } = nameFor(lo.full_name, lo.relationship, lo.city)
          const c = computeCompleteness(lo, health[lo.id] ?? EMPTY_HEALTH)
          const complete = c.pct >= 100
          return (
            <Link key={lo.id} href={`/space/people/${lo.id}`} className="flex flex-col gap-3 rounded-lg border border-line/70 bg-card p-4 shadow-sm transition-colors hover:border-green/40">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent-soft text-body-sm font-semibold text-green">{initial(name)}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-body-sm font-semibold text-ink">{name}</p>
                  <p className="truncate text-caption text-muted">{sub}</p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted" strokeWidth={1.75} />
              </div>

              {complete ? (
                <p className="inline-flex items-center gap-1.5 text-caption font-semibold text-green">
                  <Check className="h-3.5 w-3.5" strokeWidth={2.6} /> Fully known
                </p>
              ) : (
                <div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-accent-soft">
                    <span className="block h-full rounded-full bg-green transition-[width] duration-500" style={{ width: `${Math.max(c.pct, 6)}%` }} />
                  </div>
                  <div className="mt-1.5 flex items-center justify-between">
                    <span className="text-caption font-semibold text-muted">{c.pct}% complete</span>
                    <span className="text-caption font-semibold text-green">Add details →</span>
                  </div>
                </div>
              )}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
