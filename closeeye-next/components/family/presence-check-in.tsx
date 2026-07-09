'use client'

import * as React from 'react'
import Link from 'next/link'
import { ArrowRight, ShieldCheck } from 'lucide-react'

/**
 * The check-in moment — CloseEye's emotional signature. On open it briefly
 * "checks on" the loved one (~700ms soft pulse), then resolves to the dominant
 * reassurance line and a doorway into their Presence Story. Respects
 * prefers-reduced-motion (resolves immediately). Reuses the existing design
 * system only — no new tokens, colours, or components.
 */
export function PresenceCheckIn({
  name,
  detail,
  storyHref = '/family/visits',
}: {
  name: string
  detail?: React.ReactNode
  storyHref?: string
}) {
  const [ready, setReady] = React.useState(false)

  React.useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setReady(true)
      return
    }
    const t = window.setTimeout(() => setReady(true), 700)
    return () => window.clearTimeout(t)
  }, [])

  return (
    <section
      aria-live="polite"
      className="relative overflow-hidden rounded-lg border border-line bg-card p-6 shadow-sm"
    >
      <span aria-hidden className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-accent-soft/50 blur-3xl" />

      {!ready ? (
        <div className="relative flex items-center gap-4 py-1.5">
          <span className="relative grid h-11 w-11 shrink-0 place-items-center rounded-full bg-accent-soft text-green">
            <span className="absolute inline-flex h-7 w-7 rounded-full bg-green/25 motion-safe:animate-ping" />
            <span className="relative h-2.5 w-2.5 rounded-full bg-green" />
          </span>
          <p className="text-h4 text-ink">Checking on {name}…</p>
        </div>
      ) : (
        <div className="ce-fade-in relative flex flex-col gap-3">
          <div className="flex items-center gap-4">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-success/12 text-success">
              <ShieldCheck className="h-5 w-5" strokeWidth={1.75} />
            </span>
            <div className="min-w-0">
              <h2 className="text-h3 leading-tight text-ink">{name} is doing well today</h2>
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
      )}
    </section>
  )
}
