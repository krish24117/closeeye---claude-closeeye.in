import { useEffect, useState } from 'react'
import { Logo } from '@/components/ui/Logo'

// ─── Config ────────────────────────────────────────────────────────────────
const SESSION_KEY  = 'ce_splash_v4'
const FADE_START   = 1500   // begin fade-out at 1.5 s
const FADE_DURATION = 320   // 320 ms smooth fade
const MAX_VISIBLE  = 2000   // hard cap — never exceed 2 s

const alreadyShown =
  typeof window !== 'undefined' && !!sessionStorage.getItem(SESSION_KEY)

const reducedMotion =
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

// ─── Component ─────────────────────────────────────────────────────────────
export function SplashScreen() {
  const [fading, setFading] = useState(false)
  const [gone,   setGone]   = useState(alreadyShown)

  useEffect(() => {
    if (alreadyShown) return
    const t1 = setTimeout(() => setFading(true), Math.min(FADE_START, MAX_VISIBLE))
    const t2 = setTimeout(() => {
      setGone(true)
      sessionStorage.setItem(SESSION_KEY, '1')
    }, Math.min(FADE_START, MAX_VISIBLE) + FADE_DURATION)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  if (gone) return null

  return (
    <>
      <style>{`
        /* Logo: fade in + gentle scale 95 → 100, no bounce */
        @keyframes sp-logo {
          0%  { opacity: 0; transform: scale(.95); }
          50% { opacity: 1; transform: scale(.95); }
          100%{ opacity: 1; transform: scale(1);   }
        }
        /* Tagline: soft upward fade */
        @keyframes sp-rise {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0);   }
        }
        /* Glow: barely-there bloom behind logo */
        @keyframes sp-glow {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        /* Reduced-motion override — fade only */
        @keyframes sp-fade {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
      `}</style>

      {/* ── Backdrop ─────────────────────────────────────────────────── */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: '#FAF8F5',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          /* Fade-out the whole screen as one GPU layer */
          opacity: fading ? 0 : 1,
          transition: `opacity ${FADE_DURATION}ms ease-in-out`,
          willChange: 'opacity',
          WebkitBackfaceVisibility: 'hidden',
        }}
      >
        {/* ── Glow (appears at 1.2 s, very soft) ──────────────────── */}
        <div style={{
          position: 'absolute',
          width: 220, height: 220,
          borderRadius: '50%',
          background:
            'radial-gradient(circle, rgba(11,79,58,.10) 0%, rgba(11,79,58,.04) 45%, transparent 70%)',
          filter: 'blur(12px)',
          opacity: 0,
          animation: reducedMotion
            ? 'none'
            : `sp-glow 600ms ease-in-out ${1200}ms forwards`,
          willChange: 'opacity',
        }} />

        {/* ── Logo (fades in at 0 s, scales to 100 % by 0.8 s) ────── */}
        <Logo
          style={{
            width: 88,
            height: 88,
            display: 'block',
            position: 'relative',
            zIndex: 1,
            animation: reducedMotion
              ? 'sp-fade 300ms ease forwards'
              : 'sp-logo 800ms cubic-bezier(.45,.05,.55,.95) forwards',
            willChange: 'transform, opacity',
          }}
        />

        {/* ── Tagline (fades in at 0.8 s) ──────────────────────────── */}
        <p style={{
          fontFamily: "'Open Sauce One', system-ui, sans-serif",
          fontSize: 12.5,
          fontWeight: 500,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: '#0B4F3A',
          margin: '20px 0 0',
          opacity: 0,
          animation: reducedMotion
            ? 'sp-fade 300ms ease 150ms forwards'
            : 'sp-rise 450ms ease-in-out 800ms forwards',
        }}>
          Your Trusted Presence in India
        </p>
      </div>
    </>
  )
}
