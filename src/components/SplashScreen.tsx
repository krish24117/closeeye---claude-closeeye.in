import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-context'

const SESSION_KEY = 'ce_splash_shown'
const MIN_MS      = 2000   // minimum visible time (lets animation play)
const MAX_MS      = 5000   // hard ceiling — never hangs the app
const FADE_MS     = 300    // fade-out duration

const alreadyShown =
  typeof window !== 'undefined' && !!sessionStorage.getItem(SESSION_KEY)

const reduced =
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

export function SplashScreen() {
  const { loading } = useAuth()

  // Start in 'out' immediately if this session already saw the splash
  const [phase, setPhase]             = useState<'in' | 'fading' | 'out'>(alreadyShown ? 'out' : 'in')
  const [authReady, setAuthReady]     = useState(alreadyShown || !loading)
  const [minPassed, setMinPassed]     = useState(alreadyShown)

  // Min-time + max-timeout timers — run once on mount
  useEffect(() => {
    if (alreadyShown) return
    const min = setTimeout(() => setMinPassed(true), MIN_MS)
    const max = setTimeout(() => { setAuthReady(true); setMinPassed(true) }, MAX_MS)
    return () => { clearTimeout(min); clearTimeout(max) }
  }, [])

  // Auth signal
  useEffect(() => {
    if (!loading) setAuthReady(true)
  }, [loading])

  // Trigger fade when both gates open
  useEffect(() => {
    if (!authReady || !minPassed || phase !== 'in') return
    setPhase('fading')
    const t = setTimeout(() => {
      setPhase('out')
      sessionStorage.setItem(SESSION_KEY, '1')
    }, reduced ? 0 : FADE_MS)
    return () => clearTimeout(t)
  }, [authReady, minPassed, phase])

  if (phase === 'out') return null

  return (
    <>
      {!reduced && (
        <style>{`
          @keyframes ce-sp-bloom {
            to { opacity: 1; transform: translate(-50%,-50%) scale(1); }
          }
          @keyframes ce-sp-wake {
            0%  { opacity: 0; transform: scale(.6) rotate(-10deg); }
            60% { opacity: 1; }
            100%{ opacity: 1; transform: scale(1) rotate(0); }
          }
          @keyframes ce-sp-breathe {
            0%,100% { filter: drop-shadow(0 6px 14px rgba(47,168,79,.25)); }
            50%     { filter: drop-shadow(0 6px 26px rgba(47,168,79,.55)); }
          }
          @keyframes ce-sp-ring {
            0%  { opacity: .5; transform: translate(-50%,-50%) scale(.5); }
            80% { opacity: 0;  transform: translate(-50%,-50%) scale(2.6); }
            100%{ opacity: 0;  transform: translate(-50%,-50%) scale(2.6); }
          }
          @keyframes ce-sp-wordmark {
            from { opacity: 0; transform: translateY(10px); }
            to   { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      )}

      <div
        aria-hidden="true"
        style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          // Forest radial gradient — matches splash HTML Forest variant
          background: 'radial-gradient(120% 80% at 50% 38%, #1c4a35 0%, #123524 42%, #0E2A1F 100%)',
          opacity: phase === 'fading' ? 0 : 1,
          transition: phase === 'fading' && !reduced ? `opacity ${FADE_MS}ms ease` : 'none',
          // Don't block interaction once fading starts
          pointerEvents: phase === 'fading' ? 'none' : 'auto',
          userSelect: 'none',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        {!reduced && (
          <>
            {/* Ambient glow bloom */}
            <div style={{
              position: 'absolute', top: '42%', left: '50%',
              width: 340, height: 340, borderRadius: '50%',
              transform: 'translate(-50%,-50%) scale(.2)', opacity: 0,
              filter: 'blur(8px)',
              background: 'radial-gradient(circle, rgba(47,168,79,.38) 0%, rgba(126,211,33,.14) 40%, transparent 68%)',
              animation: 'ce-sp-bloom 2.4s cubic-bezier(.22,1,.36,1) .15s forwards',
            }} />
            {/* Pulsing rings × 2 */}
            {([1.1, 2.1] as const).map((delay, i) => (
              <div key={i} style={{
                position: 'absolute', top: '42%', left: '50%',
                width: 140, height: 140, borderRadius: '50%',
                border: '1.5px solid rgba(126,211,33,.45)',
                transform: 'translate(-50%,-50%) scale(.5)', opacity: 0,
                animation: `ce-sp-ring 3.6s ease-out ${delay}s infinite`,
              }} />
            ))}
          </>
        )}

        {/* Logo mark — /logo-mark.png (512 px, cropped to 128 display) */}
        <img
          src="/logo-mark.png"
          alt=""
          width={128}
          height={128}
          draggable={false}
          style={{
            position: 'relative', zIndex: 2,
            objectFit: 'contain',
            ...(reduced
              ? { opacity: 1 }
              : {
                  transform: 'scale(.6) rotate(-10deg)', opacity: 0,
                  animation: `
                    ce-sp-wake    1.5s cubic-bezier(.34,1.56,.64,1) .35s forwards,
                    ce-sp-breathe 3.8s ease-in-out 2s infinite
                  `,
                  filter: 'drop-shadow(0 6px 16px rgba(47,168,79,.30))',
                }),
          }}
        />

        {/* Wordmark + tagline */}
        <div style={{
          marginTop: 22, textAlign: 'center', position: 'relative', zIndex: 2,
          ...(reduced
            ? { opacity: 1 }
            : { opacity: 0, animation: 'ce-sp-wordmark .7s ease .9s forwards' }),
        }}>
          <p style={{
            fontFamily: "'Open Sauce One', system-ui, sans-serif",
            fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em',
            color: '#FAF7F2', margin: 0,
          }}>
            close eye
          </p>
          <p style={{
            fontFamily: "'Open Sauce One', system-ui, sans-serif",
            fontSize: 13, fontWeight: 400,
            color: 'rgba(168,213,181,.70)',
            margin: '5px 0 0', letterSpacing: '0.01em',
          }}>
            care, close to home
          </p>
        </div>
      </div>
    </>
  )
}
