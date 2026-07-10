'use client'

import { MapPin, ArrowRight, Navigation } from 'lucide-react'
import { Avatar } from '@/components/family/avatar'
import { Button } from '@/components/ui/button'
import type { GuardianVisit } from '@/lib/guardian-data'
import { useVisit } from '../visit-state'
import { visitLogisticsLines, safeMapLink } from '@/lib/db/guardian-visit-details'

const mapsLink = (address: string) => `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`

/** Screen 2 return state — the Guardian is back from Maps and at the door. */
export function ArriveStep({ visit }: { visit: GuardianVisit }) {
  const { dispatch } = useVisit()
  // B1 — the per-visit logistics the family entered (landmark / access / on-site
  // contact / preferred time + optional map pin). Renders nothing when absent.
  const logisticsLines = visitLogisticsLines(visit.visitLogistics ?? {})
  const mapPin = safeMapLink(visit.visitMapLink)
  return (
    <div className="flex min-h-[68vh] flex-col items-center justify-center gap-6 py-6 text-center">
      <Avatar initials={visit.memberInitials} size="xl" />
      <div>
        <p className="text-caption font-semibold uppercase tracking-widest text-green">You&apos;ve arrived</p>
        <h1 className="mt-2 text-h2 text-ink">{visit.memberName}&apos;s home</h1>
        <p className="mt-2 text-body leading-relaxed text-muted">
          Take a breath. When you&apos;re ready at the door, let&apos;s check in together.
        </p>
      </div>

      <span className="inline-flex items-center gap-2 rounded-full border border-line bg-card px-4 py-2 text-body-sm text-muted">
        <MapPin className="h-4 w-4 text-green" strokeWidth={1.75} /> {visit.address}
      </span>

      {(logisticsLines.length > 0 || mapPin) && (
        <div className="w-full rounded-lg border border-line bg-card p-4 text-left shadow-sm">
          <p className="text-caption font-semibold uppercase tracking-widest text-green">For this visit</p>
          {logisticsLines.length > 0 && (
            <ul className="mt-2 flex flex-col gap-1.5">
              {logisticsLines.map((line) => (
                <li key={line} className="flex gap-2 text-body-sm leading-relaxed text-ink">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-green" /> {line}
                </li>
              ))}
            </ul>
          )}
          {mapPin && (
            <a href={mapPin} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-body-sm font-semibold text-green hover:underline">
              <MapPin className="h-4 w-4" strokeWidth={1.75} /> Open the family&apos;s map pin
            </a>
          )}
        </div>
      )}

      <div className="mt-2 flex w-full flex-col gap-2.5">
        <Button size="lg" className="w-full" onClick={() => dispatch({ type: 'next' })}>
          I&apos;m here <ArrowRight className="h-5 w-5" strokeWidth={2} />
        </Button>
        <Button asChild variant="text" className="mx-auto">
          <a href={mapsLink(visit.address)} target="_blank" rel="noopener noreferrer">
            <Navigation className="h-4 w-4" strokeWidth={1.75} /> Open directions again
          </a>
        </Button>
      </div>
    </div>
  )
}
