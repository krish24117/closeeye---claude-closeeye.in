'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { ArrowRight, ShieldCheck } from 'lucide-react'

/**
 * The Presence card — a warm, honest doorway into the loved one's latest
 * Presence Story. It states only what we actually know (there was a recent
 * Presence, on the date passed in `detail`); it never simulates a live "check"
 * or asserts a wellbeing status we have not measured. Existing design system only.
 */
export function PresenceCheckIn({
  name,
  detail,
  storyHref = '/space/activity/visits',
}: {
  name: string
  detail?: ReactNode
  storyHref?: string
}) {
  return (
    <section className="relative overflow-hidden rounded-lg border border-line/70 bg-card p-6 shadow-sm">
      <span aria-hidden className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-accent-soft/50 blur-3xl" />
      <div className="relative flex flex-col gap-3">
        <div className="flex items-center gap-4">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-accent-soft text-green">
            <ShieldCheck className="h-5 w-5" strokeWidth={1.75} />
          </span>
          <div className="min-w-0">
            <h2 className="text-h3 leading-tight text-ink">Staying close to {name}</h2>
            {detail && <p className="mt-1 text-body-sm text-muted">{detail}</p>}
          </div>
        </div>
        <Link
          href={storyHref}
          className="inline-flex items-center gap-1.5 self-start text-body-sm font-semibold text-green transition-colors hover:text-green-hover"
        >
          See {name}&rsquo;s Presence Story <ArrowRight className="h-4 w-4" strokeWidth={2} />
        </Link>
      </div>
    </section>
  )
}
