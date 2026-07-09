'use client'

import * as React from 'react'
import { Clock, ListChecks, Sparkles, HeartPulse, Paperclip, NotebookPen, CheckCircle2, ArrowRight, Heart, Camera, Mic, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { VoiceNote } from '@/components/family/voice-note'
import { Overlay } from '@/components/family/overlay'
import { processVisit } from '@/lib/cloza'
import type { PhotoAttachment } from '@/lib/guardian-uploads'
import type { GuardianVisit } from '@/lib/guardian-data'
import type { ReportVitals } from '@/lib/visit-reports'
import { buildStory, moodLabel, pronounFor, wellnessScore } from '@/lib/family-report'
import { buildCanonicalReport } from '@/lib/visit-report-canonical'
import { deliverVisitReport, submitVisitReport } from '@/lib/db/guardian'
import { useVisit } from '../visit-state'
import { VisitTimer } from '../visit-timer'

function fmtSec(sec: number) {
  return `${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, '0')}`
}

function fmtDuration(ms: number) {
  const min = Math.max(1, Math.round(ms / 60000))
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m ? `${h} hr ${m} min` : `${h} hr`
}

/** Screen 9 — review and complete. Confirmation reassures, then hands to Post Visit. */
export function CompleteStep({ visit }: { visit: GuardianVisit }) {
  const { observations, vitals, prep, startedAt, checkinAt, confirmed, dispatch, bookingId, companionId, guardianName, elderProfileId } = useVisit()
  const [frozen] = React.useState(() => Date.now())
  const [preview, setPreview] = React.useState<PhotoAttachment | null>(null)
  const [saving, setSaving] = React.useState(false)
  const [err, setErr] = React.useState(false)

  const scalesNoted = Object.values(observations.scales).filter(Boolean).length
  const momentsCount = observations.moments.length
  const vitalsCount = Object.values(vitals).filter((v) => v.trim()).length
  const photos = observations.photos
  const voice = observations.voiceNote
  const hasMedia = photos.length > 0 || Boolean(voice)
  const attachmentLabel = hasMedia
    ? [photos.length ? `${photos.length} photo${photos.length === 1 ? '' : 's'}` : '', voice ? `voice ${fmtSec(voice.durationSec)}` : ''].filter(Boolean).join(' · ')
    : 'None'
  const intel = processVisit(observations, visit.memberName)

  if (confirmed) {
    return (
      <div className="flex min-h-[64vh] flex-col items-center justify-center gap-6 py-6 text-center">
        <span className="grid h-24 w-24 place-items-center rounded-full bg-success/12 text-success">
          <CheckCircle2 className="h-12 w-12" strokeWidth={1.5} />
        </span>
        <div>
          <h1 className="text-h2 text-ink">Visit complete</h1>
          <p className="mt-2 text-body leading-relaxed text-muted">
            Excellent work, and thank you. {visit.familyName} will now receive your report — warm words, not raw data.
          </p>
        </div>

        <div className="w-full rounded-lg border border-green/20 bg-accent-soft/40 p-5 text-left">
          <p className="flex items-center gap-2 text-caption font-semibold uppercase tracking-widest text-green">
            <Heart className="h-4 w-4" strokeWidth={1.75} /> What the family will read
          </p>
          <p className="mt-2 text-body italic leading-relaxed text-ink">“{intel.summary}”</p>
        </div>

        <Button size="lg" className="w-full" onClick={() => dispatch({ type: 'next' })}>
          Continue <ArrowRight className="h-5 w-5" strokeWidth={2} />
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5 py-2">
      <div>
        <p className="text-caption font-semibold uppercase tracking-widest text-green">Almost done</p>
        <h1 className="mt-1.5 text-h2 text-ink">Review your visit</h1>
        <p className="mt-2 text-body leading-relaxed text-muted">A quick look before it goes to {visit.familyName}. You can go back to add anything.</p>
      </div>

      <dl className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-card shadow-sm">
        <SummaryRow icon={Clock} label="Time together" value={startedAt ? <VisitTimer startedAt={startedAt} /> : '—'} />
        <SummaryRow icon={ListChecks} label="Care noticed" value={`${scalesNoted} observations`} />
        <SummaryRow icon={Sparkles} label="Moments shared" value={momentsCount ? `${momentsCount}` : 'None marked'} />
        <SummaryRow icon={HeartPulse} label="Readings" value={vitalsCount ? `${vitalsCount} recorded` : 'None'} />
        <SummaryRow icon={Paperclip} label="Attachments" value={attachmentLabel} />
        <SummaryRow icon={NotebookPen} label="Your note" value={observations.note ? 'Added' : 'None'} />
      </dl>

      {/* Attachments preview — tap a photo to view, play the voice note */}
      {hasMedia && (
        <section className="rounded-lg border border-line bg-card p-5 shadow-sm">
          <h2 className="flex items-center gap-2 text-caption font-semibold uppercase tracking-widest text-muted">
            <Paperclip className="h-4 w-4 text-green" strokeWidth={1.75} /> Attached to this report
          </h2>
          {photos.length > 0 && (
            <>
              <p className="mt-2 flex items-center gap-1.5 text-caption text-muted">
                <Camera className="h-3.5 w-3.5 text-green" strokeWidth={1.75} /> {photos.length} {photos.length === 1 ? 'photo' : 'photos'} · tap to view
              </p>
              <ul className="mt-2.5 grid grid-cols-4 gap-2">
                {photos.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => setPreview(p)}
                      className="block aspect-square w-full overflow-hidden rounded-md border border-line bg-ivory"
                      aria-label="View photo"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.thumb} alt="" className="h-full w-full object-cover" />
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
          {voice && (
            <div className="mt-3.5">
              <p className="mb-2 flex items-center gap-1.5 text-caption text-muted">
                <Mic className="h-3.5 w-3.5 text-green" strokeWidth={1.75} /> Voice note · {fmtSec(voice.durationSec)}
              </p>
              <VoiceNote label="Your voice note" duration={voice.durationSec} src={voice.dataUrl} />
            </div>
          )}
        </section>
      )}

      {/* Family-safe preview */}
      <div className="rounded-lg border border-green/20 bg-accent-soft/40 p-5">
        <p className="flex items-center gap-2 text-caption font-semibold uppercase tracking-widest text-green">
          <Heart className="h-4 w-4" strokeWidth={1.75} /> The family will read
        </p>
        <p className="mt-2 text-body italic leading-relaxed text-ink">“{intel.summary}”</p>
      </div>

      <p className="text-center text-caption text-muted">Recorded {fmtDuration(frozen - (startedAt ?? frozen))} of care · saved and ready.</p>

      <Button
        size="lg"
        className="w-full"
        disabled={saving}
        onClick={async () => {
          // Hand the family the full, warm report — written to the real visits row.
          const now = Date.now()
          const pronoun = pronounFor(visit.relationship || '')
          const story = buildStory(visit.memberName, pronoun, observations.scales, observations.moments, observations.social, vitals as ReportVitals)
          const photoPaths = photos.map((p) => p.url).filter((u): u is string => Boolean(u))
          const voiceOut = voice?.url ? { path: voice.url, durationSec: voice.durationSec } : null
          const canonical = buildCanonicalReport({
            memberName: visit.memberName,
            guardianName,
            service: visit.service,
            relationship: visit.relationship || '',
            scales: observations.scales,
            moments: observations.moments,
            social: observations.social,
            vitals,
            note: observations.note,
            win: observations.win,
            concern: observations.concern,
            photoPaths,
            voice: voiceOut,
            startedAt: startedAt ?? now,
            checkinAt: checkinAt ?? startedAt ?? now,
            completedAt: now,
          })
          setErr(false)
          setSaving(true)
          try {
            const id = await submitVisitReport(bookingId, {
              companionId,
              elderProfileId,
              scales: observations.scales,
              moments: observations.moments,
              social: observations.social,
              vitals,
              prep,
              win: observations.win,
              concern: observations.concern,
              note: observations.note,
              summary: intel.summary,
              story,
              moodLabel: moodLabel(observations.scales.mood),
              wellnessScore: wellnessScore(observations.scales),
              guardianName,
              service: visit.service,
              pronoun,
              photoPaths,
              voice: voiceOut,
              startedAt: startedAt ?? now,
              checkinAt: checkinAt ?? startedAt ?? now,
              completedAt: now,
              canonical,
            })
            dispatch({ type: 'reportSaved', id })
            // Deliver the report to the family (PDF + WhatsApp + completion
            // notification). Best-effort — never blocks completion.
            try {
              await deliverVisitReport({
                bookingId,
                memberName: visit.memberName,
                guardianName,
                service: visit.service,
                relationship: visit.relationship || '',
                scales: observations.scales,
                moments: observations.moments,
                social: observations.social,
                vitals,
                note: observations.note,
                win: observations.win,
                concern: observations.concern,
                startedAt: startedAt ?? now,
                checkinAt: checkinAt ?? startedAt ?? now,
                completedAt: now,
              })
            } catch {
              /* delivery is best-effort */
            }
            dispatch({ type: 'confirm' })
          } catch {
            setErr(true)
          } finally {
            setSaving(false)
          }
        }}
      >
        {saving ? 'Saving report…' : 'Complete visit'}
      </Button>
      {err && <p className="text-center text-caption text-error">We couldn&apos;t save the report. Check your connection and try again.</p>}
      <Button variant="text" className="mx-auto" onClick={() => dispatch({ type: 'back' })} disabled={saving}>
        Go back and add more
      </Button>

      <Overlay open={Boolean(preview)} onClose={() => setPreview(null)}>
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <h2 className="text-h4">Photo</h2>
          <button onClick={() => setPreview(null)} aria-label="Close" className="grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-accent-soft">
            <X className="h-5 w-5" strokeWidth={1.5} />
          </button>
        </div>
        {preview && (
          <div className="p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview.thumb} alt="Visit photo" className="max-h-[70vh] w-full rounded-md object-contain" />
          </div>
        )}
      </Overlay>
    </div>
  )
}

function SummaryRow({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 px-5 py-4">
      <Icon className="h-4 w-4 shrink-0 text-green" strokeWidth={1.75} />
      <dt className="flex-1 text-body-sm text-muted">{label}</dt>
      <dd className="text-body-sm font-semibold text-ink">{value}</dd>
    </div>
  )
}
