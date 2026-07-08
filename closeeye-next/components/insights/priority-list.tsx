'use client'

import * as React from 'react'
import Link from 'next/link'
import { Check, ArrowRight } from 'lucide-react'
import { useToast } from '@/components/ui/toast'
import { TOP_PRIORITIES } from '@/lib/exec-intel'
import { cn } from '@/lib/utils'

/** Founder priority list — the five highest-impact tasks, each with a one-click action. */
export function PriorityList() {
  const toast = useToast()
  const [done, setDone] = React.useState<string[]>([])
  const toggle = (id: string) => setDone((d) => (d.includes(id) ? d.filter((x) => x !== id) : [...d, id]))

  return (
    <section className="overflow-hidden rounded-lg border border-line bg-card shadow-sm">
      <h2 className="border-b border-line px-5 py-4 text-h4">Today&apos;s top priorities</h2>
      <ul className="divide-y divide-line">
        {TOP_PRIORITIES.map((p) => {
          const checked = done.includes(p.id)
          return (
            <li key={p.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
              <button type="button" onClick={() => toggle(p.id)} aria-label={checked ? 'Mark not done' : 'Mark done'} className={cn('grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 transition-colors', checked ? 'border-green bg-green text-ivory' : 'border-line text-transparent hover:border-green/50')}>
                <Check className="h-3.5 w-3.5" strokeWidth={3} />
              </button>
              <span className={cn('min-w-0 flex-1', checked && 'opacity-50')}>
                <span className="flex items-center gap-2">
                  <span className={cn('block truncate text-body-sm font-semibold text-ink', checked && 'line-through')}>{p.title}</span>
                  <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[0.6rem] font-bold uppercase', p.priority === 'high' ? 'bg-error/10 text-error' : 'bg-warning/12 text-warning')}>{p.priority}</span>
                </span>
                <span className="block truncate text-caption text-muted">{p.impact}</span>
              </span>
              {p.href ? (
                <Link href={p.href} onClick={() => toast(`${p.action} — opening.`)} className="inline-flex shrink-0 items-center gap-1.5 rounded-sm bg-ink px-3.5 py-2 text-caption font-semibold text-ivory transition-colors hover:bg-green-hover">{p.action} <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} /></Link>
              ) : (
                <button type="button" onClick={() => toast(`${p.action} — started.`)} className="inline-flex shrink-0 items-center gap-1.5 rounded-sm bg-ink px-3.5 py-2 text-caption font-semibold text-ivory transition-colors hover:bg-green-hover">{p.action}</button>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
