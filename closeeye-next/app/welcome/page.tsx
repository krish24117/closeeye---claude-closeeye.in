'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Users, Sparkles, MessageSquareHeart, ShieldCheck, ArrowRight, ChevronRight } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Logo } from '@/components/ui/logo'
import { Button } from '@/components/ui/button'
import { haptic } from '@/lib/haptics'
import { cn } from '@/lib/utils'

interface Slide { icon: LucideIcon; eyebrow: string; title: string; points: string[] }
const SLIDES: Slide[] = [
  { icon: Sparkles, eyebrow: 'Welcome to Close Eye', title: 'The intelligence that knows the people you love', points: ["Your family's private intelligence", 'It learns what matters, over time', 'Answers grounded in your family — never guesses'] },
  { icon: Users, eyebrow: 'How it works', title: 'Build understanding together', points: ['Add the people who matter', 'Memories, routines, health, milestones', 'Everything private to your family'] },
  { icon: MessageSquareHeart, eyebrow: 'Ask naturally', title: 'Answers that come from understanding', points: ['Ask the way you would a family member', 'Grounded in what Close Eye remembers', "Honest when it's still learning"] },
  { icon: ShieldCheck, eyebrow: 'Ready when you are', title: 'Everything starts with understanding', points: ['Build your private Family Space', 'Remember what matters over time', 'Ask naturally. Get grounded answers.'] },
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
    // Onboarding intro done → hand off to authentication (never straight to the
    // dashboard). The auth gate takes over from here.
    router.push('/auth')
  }

  if (splash) {
    return (
      <div className="grid min-h-dvh place-items-center bg-ivory px-6">
        <div className="ce-fade-in flex flex-col items-center text-center">
          <Logo lockup="stacked" height={176} className="ce-pulse-soft" />
          <p className="mt-5 text-body text-muted">The intelligence that knows the people you love</p>
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
        <Logo variant="mobile" />
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
