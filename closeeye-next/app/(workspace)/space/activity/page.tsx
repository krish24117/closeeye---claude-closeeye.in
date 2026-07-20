'use client'

/**
 * Sprint 4 — Activity (Owner: Activity, /space/activity). The family's timeline: what changed
 * across everyone you love. Reuses fetchHome's cross-family feed; each item links into the
 * person it's about (cross-linking — surfacing, not owning; People owns the person).
 */
import * as React from 'react'
import Link from 'next/link'
import { fetchHome, type HomeData } from '@/lib/db/home'

export default function ActivityPage() {
  const [home, setHome] = React.useState<HomeData | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState(false)

  const load = React.useCallback(async () => {
    setLoading(true); setError(false)
    try { setHome(await fetchHome()) } catch { setError(true) } finally { setLoading(false) }
  }, [])
  React.useEffect(() => { void load() }, [load])

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-h2 text-ink">Activity</h1>

      {loading && <p className="py-12 text-center text-caption text-muted">Loading…</p>}
      {error && <p className="py-12 text-center text-body-sm text-error">We couldn’t load activity just now.</p>}

      {!loading && !error && home && home.activity.length === 0 && (
        <div className="rounded-lg border border-line/70 bg-card p-8 text-center shadow-sm">
          <p className="text-body-sm font-semibold text-ink">Nothing yet</p>
          <p className="mx-auto mt-1 max-w-xs text-caption text-muted">As Close Eye learns about your family, everything worth noticing shows up here.</p>
        </div>
      )}

      {home && home.activity.length > 0 && (
        <div className="flex flex-col gap-3">
          {home.activity.map((a) => (
            <Link key={a.id} href={`/space/people/${a.personId}`} className="rounded-lg border border-line/70 bg-card p-4 shadow-sm transition-colors hover:border-green/40">
              <div className="flex items-center justify-between gap-2">
                <p className="text-caption font-semibold text-muted">{a.person}</p>
                <p className="text-caption text-muted/70">{a.when}</p>
              </div>
              <p className="mt-1 text-body-sm text-ink">{a.text}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
