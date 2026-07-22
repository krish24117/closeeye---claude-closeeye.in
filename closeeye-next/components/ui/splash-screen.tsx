'use client'

/**
 * The Close Eye splash — the first impression. Cream ground (the colour of Intelligence in our
 * system), the brand mark breathing over a slow, soft green glow: intelligence quietly becoming
 * available. Never flashy, never playful.
 *
 * It is a fade-to-REVEAL overlay: the real app renders underneath, and the splash dissolves to
 * uncover it — so the first screen after the splash is a continuation, never a cut (onboarding, the
 * Family Space and this splash all share the same ivory ground + green orb). A reassuring line fades
 * in ONLY if boot is slow — never a technical message. Pure CSS transforms/opacity (no JS animation
 * loop, no blocking); reduced-motion falls back to a calm static mark.
 */
import * as React from 'react'
import { LogoMark } from '@/components/ui/logo'
import { cn } from '@/lib/utils'

export function SplashScreen({ visible, message = 'Getting everything ready…' }: { visible: boolean; message?: string }) {
  const [mounted, setMounted] = React.useState(visible)
  const [slow, setSlow] = React.useState(false)

  React.useEffect(() => {
    if (visible) {
      setMounted(true)
      const t = setTimeout(() => setSlow(true), 1600) // reassure only once it's genuinely taking a moment
      return () => clearTimeout(t)
    }
    setSlow(false)
    const t = setTimeout(() => setMounted(false), 560) // let the fade-out finish, then unmount
    return () => clearTimeout(t)
  }, [visible])

  if (!mounted) return null

  return (
    <div
      role="status"
      className={cn(
        'fixed inset-0 z-[9999] grid place-items-center bg-ivory transition-opacity duration-500 ease-out',
        visible ? 'opacity-100' : 'pointer-events-none opacity-0',
      )}
    >
      <div className="ce-fade-in flex flex-col items-center px-6 text-center">
        <div className="relative grid h-32 w-32 place-items-center" aria-hidden>
          <span
            className="ce-glow absolute inset-0 rounded-full"
            style={{ background: 'radial-gradient(closest-side, hsl(103 58% 54% / 0.30), transparent 72%)' }}
          />
          <LogoMark className="ce-breathe relative h-20 w-20" />
        </div>
        <p className={cn('mt-8 text-body-sm text-muted transition-opacity duration-700', slow ? 'opacity-100' : 'opacity-0')}>
          {message}
        </p>
      </div>
    </div>
  )
}
