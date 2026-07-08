'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Users, HeartHandshake, MessageSquareHeart, Sparkles, ArrowRight, ChevronRight } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Logo, LogoMark } from '@/components/ui/logo'
import { Button } from '@/components/ui/button'
import { haptic } from '@/lib/haptics'
import { cn } from '@/lib/utils'

interface Slide { icon: LucideIcon; eyebrow: string; title: string; points: string[] }
const SLIDES: Slide[] = [
  { icon: Users, eyebrow: 'Welcome to Close Eye', title: 'Helping families care for the people they love', points: ['A trusted human presence, wherever you are', 'For parents and elders back home', 'So no family faces the important moments alone'] },
  { icon: HeartHandshake, eyebrow: 'Trusted people', title: 'Guardians, Companions & hospital support', points: ['Verified, trained Guardians', 'Warm Companions for conversation and walks', 'Medical escorts and hospital assistance'] },
  { icon: MessageSquareHeart, eyebrow: 'Stay connected', title: 'Every visit, shared with you', points: ['Warm visit reports and photos', 'Mood, medication and wellbeing', 'Emergency support, always a tap away'] },
  { icon: Sparkles, eyebrow: 'Ready when you are', title: 'Everything starts with care', points: ['Set up your family in minutes', 'A dedicated Presence Manager for you', 'Calm, human, and always close'] },
]

export default function WelcomePage() {
  const router = useRouter()
  const [splash, setSplash] = React.useState(true)
  const [i, setI] = React.useState(0)
  const touchX = React.useRef<number | null>(null)

  React.useEffect(() => {
    const t = setTimeout(() => setSplash(false), 2000)
    return () => clearTimeout(t)
  }, [])

  const last = i === SLIDES.length - 1
  const go = (dir: number) => setI((n) => Math.min(Math.max(n + dir, 0), SLIDES.length - 1))
  function finish() {
    haptic('success')
    router.push('/family')
  }

  if (splash) {
    return (
      <div className="grid min-h-dvh place-items-center bg-ivory px-6">
        <div className="ce-fade-in flex flex-col items-center text-center">
          <LogoMark className="ce-pulse-soft h-20 w-20" />
          <p className="mt-6 text-[2.25rem] font-extrabold lowercase leading-none tracking-[-0.02em] text-ink">close eye</p>
          <p className="mt-3 text-body text-muted">Care beyond presence</p>
        </div>
      </div>
    )
  }

  const s = SLIDES[i]!
  const Icon = s.icon

  return (
    <div className="flex min-h-dvh flex-col bg-ivory">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-5">
        <Logo />
        {!last && <button type="button" onClick={finish} className="text-body-sm font-semibold text-muted transition-colors hover:text-ink">Skip</button>}
      </div>

      {/* Slide */}
      <div
        className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6"
        onTouchStart={(e) => (touchX.current = e.touches[0]?.clientX ?? null)}
        onTouchEnd={(e) => {
          if (touchX.current === null) return
          const dx = (e.changedTouches[0]?.clientX ?? 0) - touchX.current
          if (Math.abs(dx) > 44) go(dx < 0 ? 1 : -1)
          touchX.current = null
        }}
      >
        <div key={i} className="ce-fade-in flex flex-col items-center text-center">
          <span className="grid h-24 w-24 place-items-center rounded-full bg-accent-soft text-green"><Icon className="h-11 w-11" strokeWidth={1.5} /></span>
          <p className="mt-8 text-caption font-semibold uppercase tracking-widest text-green">{s.eyebrow}</p>
          <h1 className="mt-3 text-h2 leading-tight text-ink">{s.title}</h1>
          <ul className="mt-6 flex flex-col gap-2.5">
            {s.points.map((p) => (
              <li key={p} className="flex items-center gap-2.5 text-body leading-relaxed text-muted"><span className="h-1.5 w-1.5 shrink-0 rounded-full bg-green" /> {p}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* Controls */}
      <div className="mx-auto w-full max-w-md px-6 pb-10">
        <div className="flex items-center justify-center gap-2">
          {SLIDES.map((_, n) => (
            <button key={n} type="button" onClick={() => setI(n)} aria-label={`Go to slide ${n + 1}`} className={cn('h-2 rounded-full transition-all', n === i ? 'w-6 bg-green' : 'w-2 bg-line')} />
          ))}
        </div>
        <div className="mt-6">
          {last ? (
            <Button size="lg" className="w-full" onClick={finish}>Get started <ArrowRight className="h-5 w-5" strokeWidth={2} /></Button>
          ) : (
            <Button size="lg" className="w-full" onClick={() => go(1)}>Continue <ChevronRight className="h-5 w-5" strokeWidth={2} /></Button>
          )}
        </div>
      </div>
    </div>
  )
}
