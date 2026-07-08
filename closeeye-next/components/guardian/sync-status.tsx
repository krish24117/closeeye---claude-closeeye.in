'use client'

import { useEffect, useRef, useState } from 'react'
import { CheckCircle2, CloudOff, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

type State = 'syncing' | 'synced' | 'offline'

function relative(sec: number): string {
  if (sec < 5) return 'just now'
  if (sec < 60) return 'a few seconds ago'
  const m = Math.floor(sec / 60)
  return `${m} min ago`
}

/**
 * Meaningful sync status (not a bare "Online"). Reassures Guardians that their
 * work is safe: everything synced when online, "Offline ready · saved locally"
 * when not. Simulated here; swap for the real IndexedDB/background-sync signal.
 */
export function SyncStatus({ className }: { className?: string }) {
  const [state, setState] = useState<State>('syncing')
  const [ago, setAgo] = useState(0)
  const lastSync = useRef(0)

  useEffect(() => {
    const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now())
    const start = now()
    lastSync.current = start

    const settle = setTimeout(() => setState(navigator.onLine ? 'synced' : 'offline'), 1100)

    const tick = setInterval(() => setAgo(Math.floor((now() - lastSync.current) / 1000)), 1000)

    const onOnline = () => {
      setState('syncing')
      setTimeout(() => {
        lastSync.current = now()
        setAgo(0)
        setState('synced')
      }, 900)
    }
    const onOffline = () => setState('offline')
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      clearTimeout(settle)
      clearInterval(tick)
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  const config =
    state === 'offline'
      ? { icon: CloudOff, tone: 'text-warning', label: 'Offline ready · saved locally' }
      : state === 'syncing'
        ? { icon: RefreshCw, tone: 'text-muted', label: 'Syncing…' }
        : { icon: CheckCircle2, tone: 'text-success', label: ago < 5 ? 'Synced just now' : `Synced · ${relative(ago)}` }
  const Icon = config.icon

  return (
    <span className={cn('inline-flex items-center gap-1.5 text-caption font-medium', config.tone, className)} role="status" aria-live="polite">
      <Icon className={cn('h-4 w-4', state === 'syncing' && 'animate-spin')} strokeWidth={1.75} />
      {config.label}
    </span>
  )
}
