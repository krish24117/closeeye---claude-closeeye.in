'use client'

import { useEffect, useState } from 'react'
import { useFamilyData } from '@/components/family/family-data-provider'

/** Warm, time-aware greeting for the Presence Manager. Uses the real signed-in
 *  identity so every operator sees their own name. */
export function ConsoleGreeting() {
  const { identity } = useFamilyData()
  const [part, setPart] = useState('Hello')
  useEffect(() => {
    const h = new Date().getHours()
    setPart(h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening')
  }, [])
  const firstName = (identity.fullName || '').trim().split(/\s+/)[0] || 'there'
  return (
    <div>
      <h1 className="text-h2">{part}, {firstName}.</h1>
      <p className="mt-1.5 text-body leading-relaxed text-muted">Here&apos;s who you&apos;re supporting today — calm, clear, and in good hands.</p>
    </div>
  )
}
