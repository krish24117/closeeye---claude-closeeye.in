'use client'

import * as React from 'react'
import Link from 'next/link'
import { MapPin, Bell, Camera, Mic, Image, Calendar, Contact, ShieldCheck } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Logo } from '@/components/ui/logo'
import { Button } from '@/components/ui/button'
import { SuccessState } from '@/components/ui/states'
import { useToast } from '@/components/ui/toast'
import { haptic } from '@/lib/haptics'
import { cn } from '@/lib/utils'

type Result = 'granted' | 'denied' | 'unsupported'
interface Perm { key: string; icon: LucideIcon; title: string; why: string; optional?: boolean; request: () => Promise<Result> }

const noop = async (): Promise<Result> => 'granted'

const PERMISSIONS: Perm[] = [
  {
    key: 'location', icon: MapPin, title: 'Location',
    why: 'So a Guardian can navigate to your loved one, and GPS can confirm they’ve safely arrived for each visit.',
    request: () => new Promise((res) => {
      if (typeof navigator === 'undefined' || !navigator.geolocation) return res('unsupported')
      navigator.geolocation.getCurrentPosition(() => res('granted'), () => res('denied'), { timeout: 6000 })
    }),
  },
  {
    key: 'notifications', icon: Bell, title: 'Notifications',
    why: 'To let you know the moment a visit starts, a report is ready, or something needs your attention.',
    request: async () => {
      if (typeof Notification === 'undefined') return 'unsupported'
      try { const r = await Notification.requestPermission(); return r === 'granted' ? 'granted' : 'denied' } catch { return 'denied' }
    },
  },
  {
    key: 'camera', icon: Camera, title: 'Camera',
    why: 'So Guardians can capture a warm photo from the visit to share with your family.',
    request: async () => {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices) return 'unsupported'
      try { const s = await navigator.mediaDevices.getUserMedia({ video: true }); s.getTracks().forEach((t) => t.stop()); return 'granted' } catch { return 'denied' }
    },
  },
  {
    key: 'microphone', icon: Mic, title: 'Microphone',
    why: 'For a short voice note from a visit — sometimes a warm voice says more than words.',
    request: async () => {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices) return 'unsupported'
      try { const s = await navigator.mediaDevices.getUserMedia({ audio: true }); s.getTracks().forEach((t) => t.stop()); return 'granted' } catch { return 'denied' }
    },
  },
  { key: 'photos', icon: Image, title: 'Photo library', why: 'To attach documents or photos to your family’s profile when you need to.', request: noop },
  { key: 'calendar', icon: Calendar, title: 'Calendar', why: 'So we can gently remind you about upcoming visits and appointments.', request: noop },
  { key: 'contacts', icon: Contact, title: 'Contacts', why: 'Optional — to quickly add emergency contacts for your loved one.', optional: true, request: noop },
]

export default function PermissionsPage() {
  const toast = useToast()
  const [i, setI] = React.useState(0)
  const [busy, setBusy] = React.useState(false)

  const done = i >= PERMISSIONS.length
  const p = PERMISSIONS[i]

  function next() { setI((n) => n + 1) }

  async function allow() {
    if (!p) return
    setBusy(true)
    const r = await p.request()
    setBusy(false)
    haptic(r === 'granted' ? 'success' : 'light')
    if (r === 'granted') toast(`${p.title} enabled.`)
    else if (r === 'denied') toast(`No problem — you can enable ${p.title.toLowerCase()} later in settings.`, 'info')
    next()
  }

  if (done) {
    return (
      <div className="grid min-h-dvh place-items-center bg-ivory px-5">
        <div className="w-full max-w-sm">
          <SuccessState title="You’re all set" message="Thank you. We only ever ask for what helps us care for your family — and you can change any of this later in settings." action={<Button asChild size="lg" className="w-full"><Link href="/space">Continue</Link></Button>} />
        </div>
      </div>
    )
  }

  const Icon = p!.icon

  return (
    <div className="flex min-h-dvh flex-col bg-ivory">
      <div className="flex items-center justify-between px-6 py-5">
        <Logo variant="mobile" />
        <button type="button" onClick={next} className="text-body-sm font-semibold text-muted transition-colors hover:text-ink">Skip</button>
      </div>

      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6">
        <div key={p!.key} className="ce-fade-in flex flex-col items-center text-center">
          <span className="grid h-24 w-24 place-items-center rounded-full bg-accent-soft text-green"><Icon className="h-11 w-11" strokeWidth={1.5} /></span>
          <p className="mt-8 inline-flex items-center gap-1.5 text-caption font-semibold uppercase tracking-widest text-green"><ShieldCheck className="h-4 w-4" strokeWidth={1.75} /> Permission {i + 1} of {PERMISSIONS.length}</p>
          <h1 className="mt-3 text-h2 text-ink">{p!.title}{p!.optional && <span className="text-muted"> (optional)</span>}</h1>
          <p className="mt-4 text-body leading-relaxed text-muted">{p!.why}</p>
        </div>
      </div>

      <div className="mx-auto w-full max-w-sm px-6 pb-10">
        <div className="mb-6 flex items-center justify-center gap-2">
          {PERMISSIONS.map((_, n) => <span key={n} className={cn('h-1.5 rounded-full transition-all', n === i ? 'w-6 bg-green' : n < i ? 'w-2 bg-green/40' : 'w-2 bg-line')} />)}
        </div>
        <div className="flex flex-col gap-2.5">
          <Button size="lg" className="w-full" disabled={busy} onClick={allow}>{busy ? 'Requesting…' : `Allow ${p!.title.toLowerCase()}`}</Button>
          <Button variant="text" className="mx-auto" onClick={next}>Not now</Button>
        </div>
      </div>
    </div>
  )
}
