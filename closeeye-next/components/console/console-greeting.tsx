'use client'

import { useEffect, useState } from 'react'
import { PM } from '@/lib/console-data'

/** Warm, time-aware greeting for the Presence Manager. Client-side to avoid drift. */
export function ConsoleGreeting() {
  const [part, setPart] = useState('Hello')
  useEffect(() => {
    const h = new Date().getHours()
    setPart(h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening')
  }, [])
  return (
    <div>
      <h1 className="text-h2">{part}, {PM.firstName}.</h1>
      <p className="mt-1.5 text-body leading-relaxed text-muted">Here&apos;s who you&apos;re supporting today — calm, clear, and in good hands.</p>
    </div>
  )
}
