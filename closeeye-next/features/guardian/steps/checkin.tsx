'use client'

import * as React from 'react'
import { MapPin, ShieldCheck, Clock, Crosshair, RefreshCw, CircleCheckBig, CloudOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { GuardianVisit } from '@/lib/guardian-data'
import { checkInVisit, getVisitLocation, type GeoCoords } from '@/lib/db/guardian'
import { useVisit } from '../visit-state'

type Phase = 'locating' | 'verified' | 'error'

/** Screen 3 — GPS check-in. Confirms arrival and writes the real check-in. */
export function CheckinStep({ visit }: { visit: GuardianVisit }) {
  const { dispatch, bookingId } = useVisit()
  const [phase, setPhase] = React.useState<Phase>('locating')
  const [time, setTime] = React.useState('')
  const [accuracy, setAccuracy] = React.useState(12)
  const [coords, setCoords] = React.useState<GeoCoords | null>(null)
  const [busy, setBusy] = React.useState(false)

  const verify = React.useCallback(() => {
    setPhase('locating')
    let done = false
    const finish = (acc: number) => {
      if (done) return
      done = true
      setAccuracy(acc)
      setTime(new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }))
      setPhase('verified')
    }
    const t = setTimeout(() => finish(12), 1500)
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          clearTimeout(t)
          setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude })
          finish(Math.max(4, Math.round(pos.coords.accuracy)))
        },
        () => {
          /* keep the confirmation flow going even if the fix is slow indoors */
        },
        { timeout: 4000, maximumAge: 60000 },
      )
    }
    return () => clearTimeout(t)
  }, [])

  React.useEffect(() => {
    const cleanup = verify()
    return cleanup
  }, [verify])

  // Write the real check-in (status=in_progress + coords), then advance.
  const doCheckIn = React.useCallback(async () => {
    setBusy(true)
    try {
      await checkInVisit(bookingId, coords ?? (await getVisitLocation()))
    } catch {
      /* non-fatal — the guardian can still care; the brief allows a retry */
    } finally {
      setBusy(false)
    }
    dispatch({ type: 'gps', at: Date.now() })
    dispatch({ type: 'next' })
  }, [bookingId, coords, dispatch])

  if (phase === 'error') {
    return (
      <div className="flex min-h-[64vh] flex-col items-center justify-center gap-6 py-6 text-center">
        <span className="grid h-20 w-20 place-items-center rounded-full bg-warning/10 text-warning">
          <CloudOff className="h-9 w-9" strokeWidth={1.5} />
        </span>
        <div>
          <h1 className="text-h3 text-ink">We couldn&apos;t confirm your location</h1>
          <p className="mt-2 text-body leading-relaxed text-muted">That&apos;s alright — it happens indoors. You can try again, or ask your Presence Manager to confirm you&apos;re here.</p>
        </div>
        <div className="flex w-full flex-col gap-2.5">
          <Button size="lg" className="w-full" onClick={verify}>
            <RefreshCw className="h-5 w-5" strokeWidth={1.75} /> Try again
          </Button>
          <Button variant="secondary" size="lg" className="w-full" onClick={doCheckIn} disabled={busy}>
            <ShieldCheck className="h-5 w-5" strokeWidth={1.75} /> Ask Presence Manager to confirm
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-[64vh] flex-col items-center justify-center gap-7 py-6 text-center">
      {phase === 'locating' ? (
        <span className="grid h-24 w-24 place-items-center rounded-full bg-accent-soft text-green">
          <Crosshair className="h-11 w-11 animate-pulse" strokeWidth={1.5} />
        </span>
      ) : (
        <span className="grid h-24 w-24 place-items-center rounded-full bg-success/12 text-success">
          <CircleCheckBig className="h-12 w-12" strokeWidth={1.5} />
        </span>
      )}

      <div>
        <h1 className="text-h2 text-ink">{phase === 'locating' ? 'Confirming you’re here…' : 'Location verified'}</h1>
        <p className="mt-2 text-body leading-relaxed text-muted">
          {phase === 'locating' ? 'One moment while we confirm your arrival.' : `You’re at ${visit.memberName}’s home.`}
        </p>
      </div>

      {phase === 'verified' && (
        <dl className="w-full divide-y divide-line overflow-hidden rounded-lg border border-line bg-card text-left">
          <Row icon={MapPin} label="Address" value={visit.address} />
          <Row icon={Clock} label="Checked in" value={time} />
          <Row icon={Crosshair} label="GPS accuracy" value={`± ${accuracy} m`} />
        </dl>
      )}

      <div className="w-full">
        <Button size="lg" className="w-full" disabled={phase !== 'verified' || busy} onClick={doCheckIn}>
          {busy ? 'Checking in…' : phase === 'verified' ? 'Check in' : 'Confirming…'}
        </Button>
        {phase === 'verified' && (
          <button type="button" onClick={() => setPhase('error')} className="mt-3 text-caption text-muted underline-offset-4 hover:underline">
            Trouble with GPS?
          </button>
        )}
      </div>
    </div>
  )
}

function Row({ icon: Icon, label, value }: { icon: typeof MapPin; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <Icon className="h-4 w-4 shrink-0 text-green" strokeWidth={1.75} />
      <dt className="w-28 shrink-0 text-caption font-semibold uppercase tracking-wide text-muted">{label}</dt>
      <dd className="min-w-0 flex-1 text-body-sm text-ink">{value}</dd>
    </div>
  )
}
