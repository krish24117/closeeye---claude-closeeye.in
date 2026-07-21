'use client'

/**
 * Welcome — the India front-door intro carousel (unauth families; the global Connect door lands on
 * /connect instead). Brought up to the shipped premium language (Newsreader serif, the luminous orb
 * as the through-line, calm ivory/ink) so it matches onboarding and the person Space rather than the
 * old feature-tile deck. Copy is tightened into Close Eye's voice; positioning is unchanged. Behaviour
 * is preserved: 2s splash, swipe + dots + skip, then hand off to /auth (the gate takes over).
 */
import * as React from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, ChevronRight } from 'lucide-react'
import { Logo } from '@/components/ui/logo'
import { Button } from '@/components/ui/button'
import { haptic } from '@/lib/haptics'
import { cn } from '@/lib/utils'

const serif = { fontFamily: 'var(--font-newsreader), Georgia, "Times New Roman", serif' } as const

interface Slide { eyebrow: string; title: string; body: string }
const SLIDES: Slide[] = [
  { eyebrow: 'Welcome to Close Eye', title: 'The people you love, deeply understood.', body: 'Close Eye is your family’s private intelligence — it learns what matters, and answers from what it truly knows.' },
  { eyebrow: 'How it works', title: 'Understanding, built together.', body: 'Add the people who matter — their routines, their health, the small things. Everything stays private to your family.' },
  { eyebrow: 'Ask naturally', title: 'Ask the way you would family.', body: 'Grounded in what Close Eye remembers, and honest when it’s still learning. Never a guess.' },
  { eyebrow: 'Ready when you are', title: 'Everything begins with understanding.', body: 'Build your private Family Space — and it only grows from here.' },
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
          <div className="mb-9 grid h-16 w-16 place-items-center rounded-full bg-surface-inverse">
            <span className="h-4 w-4 animate-pulse rounded-full" style={{ background: 'hsl(103 58% 54%)', boxShadow: '0 0 16px 3px hsl(103 62% 54% / 0.6)' }} />
          </div>
          <p className="text-caption font-semibold uppercase tracking-widest text-green">{s.eyebrow}</p>
          <h1 style={serif} className="mt-4 text-h2 leading-tight text-ink">{s.title}</h1>
          <p className="mt-4 max-w-sm text-lead leading-relaxed text-muted">{s.body}</p>
        </div>
      </div>

      {/* Controls */}
      <div className="mx-auto w-full max-w-md px-6 pb-10">
        <div className="flex items-center justify-center gap-2">
          {SLIDES.map((_, n) => (
            <button key={n} type="button" onClick={() => setI(n)} aria-label={`Go to slide ${n + 1}`} className={cn('h-2 rounded-full transition', n === i ? 'w-6 bg-green' : 'w-2 bg-line')} />
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
