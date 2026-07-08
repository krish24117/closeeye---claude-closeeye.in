'use client'

import * as React from 'react'
import { Heart, Stethoscope, Headset, Briefcase } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { audienceSummary, AUDIENCE_LABEL, SAMPLE_REPORT, type Audience } from '@/lib/cloza-engine'
import { getReport, reportKey } from '@/lib/visit-reports'
import { cn } from '@/lib/utils'

const TABS: { key: Audience; icon: LucideIcon }[] = [
  { key: 'family', icon: Heart },
  { key: 'doctor', icon: Stethoscope },
  { key: 'pm', icon: Headset },
  { key: 'founder', icon: Briefcase },
]

/** One visit, four audiences — the same care, told the right way for each reader. */
export function StoryStudio() {
  const [audience, setAudience] = React.useState<Audience>('family')
  const [report, setReport] = React.useState<typeof SAMPLE_REPORT | null>(null)
  const [live, setLive] = React.useState(false)

  React.useEffect(() => {
    const r = getReport(reportKey('Ramesh Rao'))
    if (r) {
      setReport({ memberName: r.memberName, guardianName: r.guardianName, service: r.service, story: r.story, vitals: r.vitals as Record<string, string>, scales: r.scales, moments: r.moments, durationSec: r.durationSec })
      setLive(true)
    } else {
      setReport(SAMPLE_REPORT)
    }
  }, [])

  const r = report ?? SAMPLE_REPORT
  const text = audienceSummary(r, audience)

  return (
    <section className="rounded-lg border border-line bg-card shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
        <div>
          <h2 className="text-h4">One visit, every audience</h2>
          <p className="text-caption text-muted">{r.memberName}&apos;s latest visit · {live ? 'live capture' : 'sample'}</p>
        </div>
        <div className="inline-flex flex-wrap rounded-full border border-line bg-card p-1">
          {TABS.map((t) => {
            const Icon = t.icon
            return (
              <button key={t.key} type="button" onClick={() => setAudience(t.key)} className={cn('inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-caption font-semibold transition-colors', audience === t.key ? 'bg-green text-ivory' : 'text-muted hover:text-ink')}>
                <Icon className="h-3.5 w-3.5" strokeWidth={1.75} /> {AUDIENCE_LABEL[t.key]}
              </button>
            )
          })}
        </div>
      </div>
      <div className="p-6">
        <p className="text-caption font-semibold uppercase tracking-widest text-green">{AUDIENCE_LABEL[audience]} version</p>
        <p className="mt-2 text-lead leading-relaxed text-ink">{text}</p>
      </div>
    </section>
  )
}
