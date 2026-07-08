'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

function fmt(totalSec: number) {
  const s = Math.max(0, totalSec)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`
}

/** Live, gentle visit timer. Reads the start time and ticks once a second. */
export function VisitTimer({ startedAt, className }: { startedAt: number; className?: string }) {
  const [now, setNow] = React.useState(startedAt)
  React.useEffect(() => {
    setNow(Date.now())
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])
  return <span className={cn('tabular-nums', className)}>{fmt(Math.floor((now - startedAt) / 1000))}</span>
}

/** Static clock label, e.g. "9:42 AM". Client-only to avoid hydration drift. */
export function useClockLabel(active: boolean) {
  const [label, setLabel] = React.useState('')
  React.useEffect(() => {
    if (!active) return
    setLabel(new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }))
  }, [active])
  return label
}
