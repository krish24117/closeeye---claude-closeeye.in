'use client'

import { useEffect, useState } from 'react'
import { GUARDIAN } from '@/lib/guardian-data'

/** Warm, time-aware greeting. Computed client-side to avoid hydration mismatch. */
export function GuardianGreeting({ subtitle }: { subtitle: string }) {
  const [part, setPart] = useState('Hello')
  useEffect(() => {
    const h = new Date().getHours()
    setPart(h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening')
  }, [])
  return (
    <div>
      <h1 className="text-h2">
        {part}, {GUARDIAN.firstName}.
      </h1>
      <p className="mt-1.5 text-body leading-relaxed text-muted">{subtitle}</p>
    </div>
  )
}
