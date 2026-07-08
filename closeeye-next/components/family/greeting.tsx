'use client'

import { useEffect, useState } from 'react'
import { useProfile } from '@/components/family/family-data-provider'

/** Warm, time-aware greeting. Computed client-side to avoid hydration mismatch. */
export function Greeting() {
  const { firstName } = useProfile()
  const [part, setPart] = useState('Hello')
  useEffect(() => {
    const h = new Date().getHours()
    setPart(h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening')
  }, [])

  return (
    <div>
      <h1 className="text-h2">
        {part}, {firstName}
      </h1>
      <p className="mt-1.5 text-body text-muted">Here&apos;s how your family is doing today.</p>
    </div>
  )
}
