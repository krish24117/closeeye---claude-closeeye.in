// src/components/ScrollToTop.tsx
// This component must be INSIDE BrowserRouter to work correctly
import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

export function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    // Use instant scroll for reliability, not smooth
    window.scrollTo(0, 0)
    document.documentElement.scrollTop = 0
    document.body.scrollTop = 0 // Safari fallback
  }, [pathname])

  return null
}
