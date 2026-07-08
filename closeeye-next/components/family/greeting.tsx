'use client'

import { useEffect, useState } from 'react'
import { useProfile } from '@/components/family/family-data-provider'

/**
 * Warm, time-aware greeting. Computed client-side to avoid hydration mismatch.
 * The dashboard passes a per-lifecycle `subtitle`; `showName={false}` is used for
 * the brand-new user welcome. Same typography/spacing in every case.
 */
export function Greeting({ subtitle, showName = true }: { subtitle?: React.ReactNode; showName?: boolean } = {}) {
  const { firstName } = useProfile()
  const [part, setPart] = useState('Hello')
  useEffect(() => {
    const h = new Date().getHours()
    setPart(h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening')
  }, [])

  return (
    <div>
      <h1 className="text-h2">{showName ? `${part}, ${firstName}` : part}</h1>
      <p className="mt-1.5 text-body text-muted">{subtitle ?? "Here's how your family is doing today."}</p>
    </div>
  )
}
