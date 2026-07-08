'use client'

import * as React from 'react'
import { HeartPulse, Activity, Thermometer, Droplet, Scale, ArrowRight, Plus } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { VitalInput } from '@/components/guardian/vital-input'
import { Button } from '@/components/ui/button'
import type { GuardianVisit } from '@/lib/guardian-data'
import { useVisit } from '../visit-state'
import { requestedVitals, type VitalKey } from '../derive'

const VITALS: Record<VitalKey, { label: string; unit: string; icon: LucideIcon; placeholder: string; inputMode?: 'decimal' | 'numeric' | 'text' }> = {
  bp: { label: 'Blood pressure', unit: 'mmHg', icon: HeartPulse, placeholder: '120/80', inputMode: 'text' },
  pulse: { label: 'Pulse', unit: 'beats per min', icon: Activity, placeholder: '72', inputMode: 'numeric' },
  temp: { label: 'Temperature', unit: '°F', icon: Thermometer, placeholder: '98.4' },
  sugar: { label: 'Blood sugar', unit: 'mg/dL', icon: Droplet, placeholder: '110', inputMode: 'numeric' },
  weight: { label: 'Weight', unit: 'kg', icon: Scale, placeholder: '68' },
}
const ORDER: VitalKey[] = ['bp', 'pulse', 'temp', 'sugar', 'weight']

/** Screen 8 — readings, only when requested. Skippable, never mandatory. */
export function VitalsStep({ visit }: { visit: GuardianVisit }) {
  const { vitals, dispatch } = useVisit()
  const requested = requestedVitals(visit)
  const [showAll, setShowAll] = React.useState(requested.length === 0)

  const requestedKeys = ORDER.filter((k) => requested.includes(k))
  const otherKeys = ORDER.filter((k) => !requested.includes(k))
  const visibleOthers = showAll ? otherKeys : []

  return (
    <div className="flex flex-col gap-5 py-2">
      <div>
        <p className="text-caption font-semibold uppercase tracking-widest text-green">Readings</p>
        <h1 className="mt-1.5 text-h2 text-ink">{requested.length ? 'Just what was asked for' : 'Any readings today?'}</h1>
        <p className="mt-2 text-body leading-relaxed text-muted">
          {requested.length
            ? 'The family asked for these. Add anything else only if you took it — nothing here is required.'
            : 'No readings were requested for this visit. Add one only if you took it.'}
        </p>
      </div>

      {requestedKeys.length > 0 && (
        <div className="flex flex-col gap-2.5">
          {requestedKeys.map((k) => (
            <VitalInput
              key={k}
              label={VITALS[k].label}
              unit={VITALS[k].unit}
              icon={VITALS[k].icon}
              placeholder={VITALS[k].placeholder}
              inputMode={VITALS[k].inputMode}
              requested
              value={vitals[k] ?? ''}
              onChange={(v) => dispatch({ type: 'vital', key: k, value: v })}
            />
          ))}
        </div>
      )}

      {visibleOthers.length > 0 && (
        <div className="flex flex-col gap-2.5">
          {requestedKeys.length > 0 && <p className="text-caption font-semibold uppercase tracking-widest text-muted">Other readings (optional)</p>}
          {visibleOthers.map((k) => (
            <VitalInput
              key={k}
              label={VITALS[k].label}
              unit={VITALS[k].unit}
              icon={VITALS[k].icon}
              placeholder={VITALS[k].placeholder}
              inputMode={VITALS[k].inputMode}
              value={vitals[k] ?? ''}
              onChange={(v) => dispatch({ type: 'vital', key: k, value: v })}
            />
          ))}
        </div>
      )}

      {!showAll && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="inline-flex items-center justify-center gap-1.5 rounded-sm border border-dashed border-line py-3 text-body-sm font-semibold text-green transition-colors hover:border-green/40 hover:bg-accent-soft/40"
        >
          <Plus className="h-4 w-4" strokeWidth={2} /> Add another reading
        </button>
      )}

      <Button size="lg" className="w-full" onClick={() => dispatch({ type: 'next' })}>
        Continue <ArrowRight className="h-5 w-5" strokeWidth={2} />
      </Button>
    </div>
  )
}
