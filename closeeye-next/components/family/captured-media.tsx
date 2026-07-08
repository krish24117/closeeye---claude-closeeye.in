'use client'

import * as React from 'react'
import { X } from 'lucide-react'
import { PhotoTiles } from '@/components/family/photo-tiles'
import { VoiceNote } from '@/components/family/voice-note'
import { Overlay } from '@/components/family/overlay'
import { getReport, reportKey, type SharedVisitReport } from '@/lib/visit-reports'
import { cn } from '@/lib/utils'

/**
 * Family Space media that prefers the Guardian's real captured photos / voice note
 * (from the shared report store) and gracefully falls back to the warm placeholders
 * when a member has no captured report yet. Client-only — reads localStorage.
 */
function useReport(memberName: string): SharedVisitReport | null {
  const [report, setReport] = React.useState<SharedVisitReport | null>(null)
  React.useEffect(() => {
    setReport(getReport(reportKey(memberName)))
  }, [memberName])
  return report
}

/** Real photos when captured; otherwise the placeholder tiles. Same grid either way. */
export function CapturedPhotos({
  memberName,
  fallbackCount = 0,
  max,
  className,
  interactive = true,
}: {
  memberName: string
  fallbackCount?: number
  max?: number
  className?: string
  /** false when the grid sits inside a link (e.g. the timeline) — no buttons/lightbox. */
  interactive?: boolean
}) {
  const report = useReport(memberName)
  const [preview, setPreview] = React.useState<string | null>(null)
  const photos = report?.photos ?? []

  if (photos.length === 0) {
    return fallbackCount ? <PhotoTiles count={fallbackCount} className={className} /> : null
  }

  const shown = max ? photos.slice(0, max) : photos

  if (!interactive) {
    return (
      <div className={cn('grid grid-cols-3 gap-2', className)}>
        {shown.map((p) => (
          <span key={p.id} className="block aspect-square overflow-hidden rounded-sm border border-line bg-ivory">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.thumb} alt="" className="h-full w-full object-cover" />
          </span>
        ))}
      </div>
    )
  }

  return (
    <>
      <ul className={cn('grid grid-cols-3 gap-2', className)}>
        {shown.map((p) => (
          <li key={p.id}>
            <button
              type="button"
              onClick={() => setPreview(p.thumb)}
              className="block aspect-square w-full overflow-hidden rounded-sm border border-line bg-ivory transition-transform hover:scale-[1.02]"
              aria-label="View photo"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.thumb} alt="" className="h-full w-full object-cover" />
            </button>
          </li>
        ))}
      </ul>

      <Overlay open={Boolean(preview)} onClose={() => setPreview(null)}>
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <h2 className="text-h4">Photo from the visit</h2>
          <button onClick={() => setPreview(null)} aria-label="Close" className="grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-accent-soft">
            <X className="h-5 w-5" strokeWidth={1.5} />
          </button>
        </div>
        {preview && (
          <div className="p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="Visit photo" className="max-h-[70vh] w-full rounded-md object-contain" />
          </div>
        )}
      </Overlay>
    </>
  )
}

/** Real recorded voice note when captured; otherwise the placeholder player. */
export function CapturedVoice({ memberName, guardianName }: { memberName: string; guardianName: string }) {
  const report = useReport(memberName)
  const voice = report?.voice ?? null
  const first = guardianName.split(' ')[0]

  if (voice) {
    return <VoiceNote label={`A voice note from ${first}`} duration={voice.durationSec} src={voice.dataUrl} />
  }
  return <VoiceNote label={`A voice note from ${first}`} duration={24} />
}
