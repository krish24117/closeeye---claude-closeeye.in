/* eslint-disable @next/next/no-img-element */
'use client'

import * as React from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, CalendarClock, Camera, CheckCircle2, HeartPulse, Loader2, MapPin, MessageCircle, Phone, PlayCircle, ShieldAlert } from 'lucide-react'
import { Avatar } from '@/components/family/avatar'
import { initialsOf } from '@/components/family/loved-one-card'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/states'
import { useAuth } from '@/components/auth/auth-provider'
import { checkInVisit, completeVisit, fetchGuardianVisit, getVisitLocation, uploadVisitPhoto, type GuardianVisitBrief } from '@/lib/db/guardian'
import { cn } from '@/lib/utils'

const MOODS = [
  { v: 1, label: 'Low' },
  { v: 2, label: 'Quiet' },
  { v: 3, label: 'Okay' },
  { v: 4, label: 'Good' },
  { v: 5, label: 'Great' },
]

function fmtWhen(iso: string | null): string {
  if (!iso) return 'Time to be confirmed'
  try {
    return new Date(iso).toLocaleString('en-IN', {
      weekday: 'long', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit', hour12: true,
    })
  } catch {
    return '—'
  }
}

export default function GuardianVisitBriefPage() {
  const params = useParams<{ id: string }>()
  const { user } = useAuth()
  const [visit, setVisit] = React.useState<GuardianVisitBrief | null | undefined>(undefined)
  const [busy, setBusy] = React.useState(false)
  const [summary, setSummary] = React.useState('')
  const [mood, setMood] = React.useState<number | null>(null)
  const [photos, setPhotos] = React.useState<{ path: string; url: string }[]>([])
  const [uploading, setUploading] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const load = React.useCallback(() => {
    if (!user?.id || !params.id) {
      setVisit(null)
      return
    }
    fetchGuardianVisit(user.id, params.id)
      .then(setVisit)
      .catch(() => setVisit(null))
  }, [user?.id, params.id])

  React.useEffect(() => {
    load()
  }, [load])

  async function startVisit() {
    if (!visit) return
    setBusy(true)
    try {
      await checkInVisit(visit.id, await getVisitLocation())
      load()
    } finally {
      setBusy(false)
    }
  }

  async function finishVisit() {
    if (!visit || !user?.id) return
    setBusy(true)
    try {
      await completeVisit(visit.id, {
        companionId: user.id,
        summary,
        mood,
        photoPaths: photos.map((p) => p.path),
        coords: await getVisitLocation(),
      })
      load()
    } finally {
      setBusy(false)
    }
  }

  async function addPhoto(file: File | undefined) {
    if (!file || !visit) return
    setUploading(true)
    try {
      const path = await uploadVisitPhoto(visit.id, file)
      setPhotos((prev) => [...prev, { path, url: URL.createObjectURL(file) }])
    } catch {
      /* non-fatal — the guardian can retry */
    } finally {
      setUploading(false)
    }
  }

  const back = (
    <Link href="/guardian" className="inline-flex items-center gap-1.5 text-caption font-semibold text-muted hover:text-ink">
      <ArrowLeft className="h-4 w-4" strokeWidth={1.75} /> Today
    </Link>
  )

  if (visit === undefined) {
    return <div className="grid place-items-center py-24"><Loader2 className="h-6 w-6 animate-spin text-green" strokeWidth={2} /></div>
  }

  if (!visit) {
    return (
      <div className="flex flex-col gap-6">
        {back}
        <EmptyState icon={CalendarClock} title="Visit not found" hint="This visit may have been reassigned or isn't assigned to you." action={<Button asChild><Link href="/guardian">Back to today</Link></Button>} />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {back}

      <header className="flex items-center gap-4 rounded-lg border border-line bg-card p-5 shadow-sm">
        <Avatar initials={initialsOf(visit.memberName)} size="xl" tone="solid" />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-h3 leading-tight text-ink">{visit.memberName}</h1>
          <p className="mt-0.5 truncate text-body-sm text-muted">{visit.service}</p>
        </div>
      </header>

      <section className="flex flex-col gap-3 rounded-lg border border-line bg-card p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <CalendarClock className="mt-0.5 h-5 w-5 shrink-0 text-green" strokeWidth={1.75} />
          <div><p className="text-caption text-muted">When</p><p className="text-body-sm font-medium text-ink">{fmtWhen(visit.scheduledAt)}</p></div>
        </div>
        {visit.address && (
          <div className="flex items-start gap-3">
            <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-green" strokeWidth={1.75} />
            <div><p className="text-caption text-muted">Where</p><p className="text-body-sm font-medium text-ink">{visit.address}</p></div>
          </div>
        )}
      </section>

      {visit.medicalNotes && (
        <section className="rounded-lg border border-line bg-card p-5 shadow-sm">
          <p className="flex items-center gap-2 text-caption font-semibold uppercase tracking-widest text-green"><HeartPulse className="h-4 w-4" strokeWidth={1.75} /> Health notes</p>
          <p className="mt-2 text-body-sm leading-relaxed text-ink">{visit.medicalNotes}</p>
        </section>
      )}

      {visit.emergencyContactName && (
        <section className="rounded-lg border border-line bg-card p-5 shadow-sm">
          <p className="flex items-center gap-2 text-caption font-semibold uppercase tracking-widest text-green"><ShieldAlert className="h-4 w-4" strokeWidth={1.75} /> Emergency contact</p>
          <div className="mt-2 flex items-center justify-between gap-3">
            <p className="text-body-sm font-medium text-ink">{visit.emergencyContactName}</p>
            {visit.emergencyContactPhone && (
              <Button asChild variant="secondary" size="sm">
                <a href={`tel:${visit.emergencyContactPhone.replace(/\s/g, '')}`}><Phone className="h-4 w-4" strokeWidth={1.75} /> Call</a>
              </Button>
            )}
          </div>
        </section>
      )}

      <div className="flex flex-col gap-3">
        {visit.status === 'completed' ? (
          <div className="flex items-center gap-3 rounded-lg border border-line bg-success/[0.06] p-4">
            <CheckCircle2 className="h-6 w-6 shrink-0 text-success" strokeWidth={1.75} />
            <p className="text-body-sm font-semibold text-ink">Visit completed. Thank you for showing up.</p>
          </div>
        ) : visit.status === 'in_progress' ? (
          <>
            <div className="flex items-center gap-2 rounded-lg border border-green/30 bg-accent-soft/50 p-3 text-body-sm font-semibold text-green">
              <span className="h-2 w-2 animate-pulse rounded-full bg-green" /> Visit in progress
            </div>

            <section className="flex flex-col gap-4 rounded-lg border border-line bg-card p-5 shadow-sm">
              <h2 className="text-h4">Visit report</h2>

              <div>
                <label htmlFor="summary" className="text-caption font-semibold text-muted">How was the visit?</label>
                <textarea
                  id="summary"
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  rows={3}
                  placeholder="A short note the family will treasure…"
                  className="mt-1.5 w-full rounded-md border border-line bg-ivory px-3 py-2 text-body-sm text-ink placeholder:text-muted/70 focus:border-green focus:outline-none focus:ring-2 focus:ring-green/25"
                />
              </div>

              <div>
                <p className="text-caption font-semibold text-muted">How were they today?</p>
                <div className="mt-2 flex gap-2">
                  {MOODS.map((m) => (
                    <button
                      key={m.v}
                      type="button"
                      onClick={() => setMood(m.v)}
                      className={cn(
                        'flex-1 rounded-md border py-2 text-caption font-semibold transition-colors',
                        mood === m.v ? 'border-green bg-accent-soft text-green' : 'border-line text-muted hover:text-ink',
                      )}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-caption font-semibold text-muted">Photos</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  hidden
                  onChange={(e) => {
                    void addPhoto(e.target.files?.[0])
                    e.target.value = ''
                  }}
                />
                <div className="mt-2 flex flex-wrap gap-2">
                  {photos.map((p) => (
                    <span key={p.path} className="h-16 w-16 overflow-hidden rounded-md border border-line">
                      <img src={p.url} alt="Visit" className="h-full w-full object-cover" />
                    </span>
                  ))}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    aria-label="Add photo"
                    className="grid h-16 w-16 place-items-center rounded-md border border-dashed border-line text-muted transition-colors hover:border-green hover:text-green disabled:opacity-50"
                  >
                    {uploading ? <Loader2 className="h-5 w-5 animate-spin" strokeWidth={2} /> : <Camera className="h-5 w-5" strokeWidth={1.75} />}
                  </button>
                </div>
              </div>
            </section>

            <Button size="lg" className="w-full" onClick={finishVisit} disabled={busy || uploading}>
              {busy ? <><Loader2 className="h-5 w-5 animate-spin" strokeWidth={2} /> Saving…</> : <><CheckCircle2 className="h-5 w-5" strokeWidth={1.75} /> Complete &amp; save report</>}
            </Button>
          </>
        ) : (
          <Button size="lg" className="w-full" onClick={startVisit} disabled={busy}>
            {busy ? <><Loader2 className="h-5 w-5 animate-spin" strokeWidth={2} /> Starting…</> : <><PlayCircle className="h-5 w-5" strokeWidth={1.75} /> Start visit</>}
          </Button>
        )}

        <Button asChild variant="secondary" size="lg" className="w-full">
          <Link href="/guardian/messages"><MessageCircle className="h-5 w-5" strokeWidth={1.75} /> Message Presence Manager</Link>
        </Button>
        {visit.status !== 'completed' && visit.status !== 'in_progress' && (
          <p className="text-center text-caption text-muted">Start the visit to check in, then add photos and a report.</p>
        )}
      </div>
    </div>
  )
}
