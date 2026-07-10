'use client'

import * as React from 'react'
import { Sparkles, Share2, ChevronDown } from 'lucide-react'
import { Avatar } from '@/components/family/avatar'
import { MoodBadge } from '@/components/family/badges'
import { DownloadButton } from '@/components/family/download-button'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { brandedDocument } from '@/lib/download'
import type { Mood } from '@/lib/family-data'
import type { SharedVisitReport } from '@/lib/visit-reports'
import { wellnessLabel } from '@/lib/family-report'

function timeLabel(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

function storyDoc(r: SharedVisitReport): string {
  const vit = Object.entries(r.vitals).filter(([, v]) => v)
  return brandedDocument(`Visit story — ${r.memberName}`, `
    <h1>A note from ${r.guardianName}</h1>
    <p class="meta">${r.memberName} · ${r.service} · with ${r.guardianName}</p>
    <div class="card"><p>${r.story}</p></div>
    ${r.win ? `<div class="card"><h2>A small win today</h2><p>${r.win}</p></div>` : ''}
    ${vit.length ? `<div class="card"><h2>Readings</h2>${vit.map(([k, v]) => `<div class="row"><span class="label">${k}</span><span>${v}</span></div>`).join('')}</div>` : ''}
  `)
}

/** AIStoryCard — the hero of the visit. A warm, human summary first; raw detail never. */
export function AIStoryCard({ report }: { report: SharedVisitReport }) {
  const toast = useToast()
  const [expanded, setExpanded] = React.useState(false)
  const long = report.story.length > 220

  async function share() {
    const text = `${report.memberName}'s visit — ${report.story}`
    try {
      if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
        await navigator.share({ title: `${report.memberName}'s visit`, text })
      } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(text)
        toast('Copied — share it with the family.')
      }
    } catch {
      /* user dismissed the share sheet */
    }
  }

  return (
    <article className="overflow-hidden rounded-lg border border-line/70 bg-card shadow-md">
      <div className="flex items-center gap-3 border-b border-line bg-accent-soft/40 px-6 py-4">
        <Avatar initials={report.memberName.split(' ').map((w) => w[0]).join('')} size="md" />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-caption font-semibold uppercase tracking-widest text-green">
            <Sparkles className="h-3.5 w-3.5" strokeWidth={1.75} /> Your visit story
          </p>
          <p className="text-body-sm text-muted">
            with {report.guardianName} · {timeLabel(report.completedAt)}
          </p>
        </div>
        {report.mood && <MoodBadge mood={report.mood as Mood} />}
      </div>

      <div className="px-6 py-5">
        <p className={`text-lead leading-relaxed text-ink ${long && !expanded ? 'line-clamp-4' : ''}`}>{report.story}</p>

        {long && (
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            className="mt-2 inline-flex items-center gap-1 text-body-sm font-semibold text-green hover:underline"
          >
            {expanded ? 'Show less' : 'Read more'}
            <ChevronDown className={`h-4 w-4 transition-transform ${expanded ? 'rotate-180' : ''}`} strokeWidth={1.75} />
          </button>
        )}

        <p className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1 text-caption font-semibold text-green">
          {wellnessLabel(report.wellnessScore)}
        </p>

        <div className="mt-5 flex flex-col gap-2.5 sm:flex-row">
          <Button variant="secondary" size="sm" onClick={share}>
            <Share2 className="h-4 w-4" strokeWidth={1.75} /> Share
          </Button>
          <DownloadButton label="Download PDF" filename={`close-eye-story-${report.key.replace(/\s+/g, '-')}.html`} content={storyDoc(report)} />
        </div>
      </div>
    </article>
  )
}
