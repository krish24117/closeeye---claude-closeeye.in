'use client'

import { Sparkles, Flag, ArrowRight, RefreshCw } from 'lucide-react'
import { ObservationCard } from '@/components/guardian/observation-card'
import { PhotoCapture } from '@/components/guardian/photo-capture'
import { VoiceRecorder } from '@/components/guardian/voice-recorder'
import { Button } from '@/components/ui/button'
import { PRESENCE_MANAGER, type GuardianVisit } from '@/lib/guardian-data'
import { useVisit } from '../visit-state'

const PROMPTS = ['What changed today?', 'Anything unusual?', 'Anything the family should know?']

/** Screen 7 — open observations in the Guardian's own words. All optional. */
export function ObservationsStep({ visit }: { visit: GuardianVisit }) {
  const { observations, dispatch } = useVisit()
  const first = visit.memberName.split(' ')[0]
  const uploading = observations.photos.some((p) => p.status === 'uploading') || observations.voiceNote?.status === 'uploading'

  return (
    <div className="flex flex-col gap-5 py-2">
      <div>
        <p className="text-caption font-semibold uppercase tracking-widest text-green">In your words</p>
        <h1 className="mt-1.5 text-h2 text-ink">Anything to share?</h1>
        <p className="mt-2 text-body leading-relaxed text-muted">
          A sentence or two about your time with {first} helps the family feel close. Add a photo or a voice note if it says more than words.
        </p>
      </div>

      <ObservationCard
        value={observations.note ?? ''}
        onChange={(v) => dispatch({ type: 'field', key: 'note', value: v })}
        prompts={PROMPTS}
        placeholder={`How was your time with ${first}?`}
      />

      <PhotoCapture
        photos={observations.photos}
        onAdd={(photo) => dispatch({ type: 'photoAdd', photo })}
        onPatch={(id, patch) => dispatch({ type: 'photoPatch', id, patch })}
        onRemove={(id) => dispatch({ type: 'photoRemove', id })}
      />

      <VoiceRecorder
        voice={observations.voiceNote}
        onSet={(voice) => dispatch({ type: 'voiceSet', voice })}
        onPatch={(patch) => dispatch({ type: 'voicePatch', patch })}
      />

      {/* A small win */}
      <label className="rounded-lg border border-line bg-card p-5 shadow-sm">
        <span className="flex items-center gap-2 text-caption font-semibold uppercase tracking-widest text-green">
          <Sparkles className="h-4 w-4" strokeWidth={1.75} /> A small win today
        </span>
        <input
          value={observations.win ?? ''}
          onChange={(e) => dispatch({ type: 'field', key: 'win', value: e.target.value })}
          placeholder="e.g. Finished the whole walk without stopping"
          className="mt-2.5 w-full rounded-sm border border-line bg-ivory px-3.5 py-2.5 text-body-sm text-ink placeholder:text-muted/70 focus:border-green focus:outline-none focus:ring-2 focus:ring-green/20"
        />
      </label>

      {/* Flag to PM */}
      <label className="rounded-lg border border-line bg-card p-5 shadow-sm">
        <span className="flex items-center gap-2 text-caption font-semibold uppercase tracking-widest text-muted">
          <Flag className="h-4 w-4 text-green" strokeWidth={1.75} /> Anything for {PRESENCE_MANAGER.name.split(' ')[0]}?
        </span>
        <p className="mt-1 text-caption text-muted">Only your Presence Manager sees this — not the family.</p>
        <textarea
          value={observations.concern ?? ''}
          onChange={(e) => dispatch({ type: 'field', key: 'concern', value: e.target.value })}
          rows={2}
          placeholder="Anything you’d like Priya to follow up on"
          className="mt-2.5 w-full resize-none rounded-sm border border-line bg-ivory px-3.5 py-2.5 text-body-sm text-ink placeholder:text-muted/70 focus:border-green focus:outline-none focus:ring-2 focus:ring-green/20"
        />
      </label>

      <Button size="lg" className="w-full" disabled={uploading} onClick={() => dispatch({ type: 'next' })}>
        {uploading ? (
          <>
            <RefreshCw className="h-5 w-5 animate-spin" strokeWidth={2} /> Finishing uploads…
          </>
        ) : (
          <>
            Continue <ArrowRight className="h-5 w-5" strokeWidth={2} />
          </>
        )}
      </Button>
    </div>
  )
}
