'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'

/**
 * Global search launcher — ⌘K / Ctrl-K opens the app-wide search from anywhere,
 * including the Presence Console and Operations Admin. Mounted once in the root layout.
 */
export function CommandK() {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        if (pathname !== '/search') router.push('/search')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [router, pathname])

  return null
}
