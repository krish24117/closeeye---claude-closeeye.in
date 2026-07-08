'use client'

import * as React from 'react'
import { ChevronDown, Heart, Activity, Pill, MessageSquareText, Home, ArrowRight } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { ChecklistItem } from '@/components/guardian/checklist-item'
import { Progress } from '@/components/guardian/progress'
import { Button } from '@/components/ui/button'
import { ALL_SCALES, MOMENTS, CONCERN_VALUES, type ObservationScale } from '@/lib/cloza'
import type { GuardianVisit } from '@/lib/guardian-data'
import { cn } from '@/lib/utils'
import { useVisit } from '../visit-state'

const byKey = (k: string): ObservationScale | undefined => ALL_SCALES.find((s) => s.key === k)

interface Section {
  id: string
  title: string
  icon: LucideIcon
  scales: string[]
  moments?: boolean
}
const SECTIONS: Section[] = [
  { id: 'wellbeing', title: 'Wellbeing', icon: Heart, scales: ['mood', 'energy', 'appetite', 'sleep', 'hydration'] },
  { id: 'body', title: 'Mobility & medication', icon: Activity, scales: ['mobility', 'medication'] },
  { id: 'connection', title: 'Conversation & connection', icon: MessageSquareText, scales: ['conversation', 'emotional'], moments: true },
  { id: 'home', title: 'Home & safety', icon: Home, scales: ['cleanliness', 'safety', 'comfort'] },
]

/** Screen 6 — the Care Checklist. The heart of Close Eye: structured CLOza
 *  observations, captured as calm taps. Nothing mandatory; everything auto-saves. */
export function ChecklistStep({ visit }: { visit: GuardianVisit }) {
  const { observations, dispatch } = useVisit()
  const [open, setOpen] = React.useState<string[]>(['wellbeing'])

  const totalScales = SECTIONS.reduce((n, s) => n + s.scales.length, 0)
  const noted = SECTIONS.reduce((n, s) => n + s.scales.filter((k) => observations.scales[k]).length, 0)

  return (
    <div className="flex flex-col gap-5 py-2">
      <div>
        <p className="text-caption font-semibold uppercase tracking-widest text-green">Care checklist</p>
        <h1 className="mt-1.5 text-h2 text-ink">How is {visit.memberName.split(' ')[0]} today?</h1>
        <p className="mt-2 text-body leading-relaxed text-muted">Tap what you notice. There are no right answers — only honest ones. Everything saves as you go.</p>
      </div>

      <Progress value={noted} total={totalScales} label="Noticed" />

      <div className="flex flex-col gap-3">
        {SECTIONS.map((section) => {
          const isOpen = open.includes(section.id)
          const done = section.scales.filter((k) => observations.scales[k]).length
          const Icon = section.icon
          return (
            <section key={section.id} className="overflow-hidden rounded-lg border border-line bg-card shadow-sm">
              <button
                type="button"
                onClick={() => setOpen((o) => (o.includes(section.id) ? o.filter((x) => x !== section.id) : [...o, section.id]))}
                className="flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-accent-soft/30"
                aria-expanded={isOpen}
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent-soft text-green">
                  <Icon className="h-4 w-4" strokeWidth={1.75} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-h4 text-ink">{section.title}</span>
                  <span className="text-caption text-muted">{done} of {section.scales.length} noticed</span>
                </span>
                <ChevronDown className={cn('h-5 w-5 shrink-0 text-muted transition-transform', isOpen && 'rotate-180')} strokeWidth={1.75} />
              </button>

              {isOpen && (
                <div className="flex flex-col gap-2.5 border-t border-line p-4">
                  {section.scales.map((k) => {
                    const scale = byKey(k)
                    if (!scale) return null
                    return (
                      <ChecklistItem
                        key={k}
                        label={scale.label}
                        options={scale.options}
                        value={observations.scales[k] ?? ''}
                        onSelect={(v) => dispatch({ type: 'scale', key: k, value: v })}
                        concernValues={CONCERN_VALUES}
                      />
                    )
                  })}

                  {section.moments && (
                    <div className="rounded-md border border-line bg-ivory p-4">
                      <p className="text-body-sm font-medium text-ink">Moments you shared</p>
                      <p className="text-caption text-muted">Tap any that happened — they become the family’s timeline.</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {MOMENTS.map((m) => {
                          const active = observations.moments.includes(m.key)
                          return (
                            <button
                              key={m.key}
                              type="button"
                              onClick={() => dispatch({ type: 'toggleMoment', key: m.key })}
                              aria-pressed={active}
                              className={cn(
                                'inline-flex min-h-[2.25rem] items-center gap-1.5 rounded-full border px-3 text-body-sm font-medium transition-colors',
                                active ? 'border-green bg-green text-ivory' : 'border-line bg-card text-muted hover:border-ink/25 hover:text-ink',
                              )}
                            >
                              <span aria-hidden>{m.emoji}</span> {m.label}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </section>
          )
        })}
      </div>

      <Button size="lg" className="w-full" onClick={() => dispatch({ type: 'next' })}>
        Continue <ArrowRight className="h-5 w-5" strokeWidth={2} />
      </Button>
    </div>
  )
}
