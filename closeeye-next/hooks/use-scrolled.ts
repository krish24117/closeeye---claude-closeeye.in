'use client'

import { useEffect, useState } from 'react'

/**
 * Returns true once the window has scrolled past `threshold` px.
 * Passive listener + rAF guard keep it off the main-thread hot path.
 */
export function useScrolled(threshold = 24): boolean {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    let ticking = false
    const update = () => {
      setScrolled(window.scrollY > threshold)
      ticking = false
    }
    const onScroll = () => {
      if (!ticking) {
        ticking = true
        window.requestAnimationFrame(update)
      }
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [threshold])

  return scrolled
}
