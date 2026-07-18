'use client'

/**
 * Sprint 4 — People (Owner: People, /space/people). The roster of everyone you love; each opens
 * their Person Space. Uses the family-data hooks (FamilyDataProvider is now mounted for the
 * Workspace). Add someone is the global growth action.
 */
import * as React from 'react'
import Link from 'next/link'
import { UserPlus, ChevronRight } from 'lucide-react'
import { useLovedOnes } from '@/components/family/family-data-provider'

const initial = (s: string) => (s || '?').trim().charAt(0).toUpperCase()

export default function PeoplePage() {
  const { lovedOnes, loading, error } = useLovedOnes()

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-h2 text-ink">People</h1>
        <Link href="/family/add" className="inline-flex items-center gap-1.5 rounded-full border border-line bg-card px-3.5 py-2 text-caption font-semibold text-ink transition-colors hover:border-green/40 hover:text-green">
          <UserPlus className="h-4 w-4" strokeWidth={1.75} /> Add someone
        </Link>
      </div>

      {loading && <p className="py-12 text-center text-caption text-muted">Loading your family…</p>}
      {error && <p className="py-12 text-center text-body-sm text-error">We couldn’t load your family just now.</p>}

      {!loading && !error && lovedOnes.length === 0 && (
        <div className="rounded-lg border border-line/70 bg-card p-8 text-center shadow-sm">
          <p className="text-body-sm font-semibold text-ink">No one here yet</p>
          <p className="mx-auto mt-1 max-w-xs text-caption text-muted">Add someone you love, and CloseEye starts holding everything that matters about them.</p>
          <Link href="/family/add" className="mt-4 inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-body-sm font-semibold text-ivory"><UserPlus className="h-4 w-4" strokeWidth={2} /> Add someone</Link>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {lovedOnes.map((lo) => (
          <Link key={lo.id} href={`/space/people/${lo.id}`} className="flex items-center gap-3 rounded-lg border border-line/70 bg-card p-4 shadow-sm transition-colors hover:border-green/40">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent-soft text-body-sm font-semibold text-green">{initial(lo.full_name)}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-body-sm font-semibold text-ink">{lo.full_name}</p>
              <p className="truncate text-caption text-muted">{[lo.relationship, lo.city].filter(Boolean).join(' · ') || 'Family'}</p>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted" strokeWidth={1.75} />
          </Link>
        ))}
      </div>
    </div>
  )
}
