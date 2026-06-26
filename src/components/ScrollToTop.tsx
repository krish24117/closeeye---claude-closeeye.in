// src/components/ScrollToTop.tsx
import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

export function ScrollToTop() {
  const { pathname, hash } = useLocation()

  useEffect(() => {
    // If the route carries a hash (e.g. /#societies), scroll to that section
    // instead of the top so cross-page section links land correctly.
    if (hash) {
      const el = document.getElementById(hash.slice(1))
      if (el) {
        el.scrollIntoView({ behavior: 'instant' as ScrollBehavior, block: 'start' })
        return
      }
    }
    // Triple approach for maximum browser compatibility
    try {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior })
    } catch {
      window.scrollTo(0, 0)
    }
    document.documentElement.scrollTop = 0
    document.body.scrollTop = 0
  }, [pathname, hash])

  return null
}
