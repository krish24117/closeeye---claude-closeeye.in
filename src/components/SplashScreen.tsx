import { useEffect, useState } from 'react'

const SESSION_KEY   = 'ce_splash_v5'
const DISMISS_AFTER = 2500   // ms before auto-fade begins
const FADE_DURATION = 400    // ms for the opacity transition

const alreadyShown =
  typeof window !== 'undefined' && !!sessionStorage.getItem(SESSION_KEY)

const reducedMotion =
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

export function SplashScreen() {
  const [fading, setFading] = useState(false)
  const [gone,   setGone]   = useState(alreadyShown)

  useEffect(() => {
    if (alreadyShown) return
    if (reducedMotion) {
      sessionStorage.setItem(SESSION_KEY, '1')
      setGone(true)
      return
    }
    const t1 = setTimeout(() => setFading(true), DISMISS_AFTER)
    const t2 = setTimeout(() => {
      setGone(true)
      sessionStorage.setItem(SESSION_KEY, '1')
    }, DISMISS_AFTER + FADE_DURATION)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  if (gone) return null

  function dismiss() {
    if (fading) return
    setFading(true)
    setTimeout(() => {
      setGone(true)
      sessionStorage.setItem(SESSION_KEY, '1')
    }, FADE_DURATION)
  }

  return (
    <div
      onClick={dismiss}
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: '#fff',
        cursor: 'pointer',
        opacity: fading ? 0 : 1,
        transition: `opacity ${FADE_DURATION}ms ease-in-out`,
        willChange: 'opacity',
      }}
    >
      <img
        src="/splash/SPLASHSCREEN..png"
        alt=""
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: 'top center',
          display: 'block',
          pointerEvents: 'none',
          userSelect: 'none',
        }}
        draggable={false}
      />
    </div>
  )
}
