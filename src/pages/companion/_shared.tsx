// Shared helpers + primitives for the companion dashboard (mobile-first PWA).
// Kept small and self-contained so each screen file stays readable.
import { useCallback, useRef, useState } from 'react'
import { RefreshCw } from 'lucide-react'

// ── Display helpers ────────────────────────────────────────────────────────

export function initialsOf(name?: string | null): string {
  if (!name) return '?'
  return name.trim().split(/\s+/).map(n => n[0]).slice(0, 2).join('').toUpperCase() || '?'
}

export function firstNameOf(name?: string | null): string {
  return name?.trim().split(/\s+/)[0] || 'there'
}

export function greetingFor(d = new Date()): string {
  const h = d.getHours()
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}

export function durationLabel(mins: number | null | undefined): string {
  if (mins == null || mins < 0) return '—'
  if (mins < 60) return `${mins} min`
  const h = Math.floor(mins / 60), m = mins % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

// JSONB medication rows on elder_profiles: [{ name, dosage, timing }]
export interface Medication { name?: string; dosage?: string; timing?: string }
// JSONB emergency contact rows: [{ name, relation, phone, priority }]
export interface EmergencyContact { name?: string; relation?: string; phone?: string; priority?: number | null }

export function asArray<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : []
}

// Continuity notes are stored as one blob, one entry per line
// ("12 Jun 2025 — Companion: note"). Newest entries are appended last.
export function continuityEntries(notes?: string | null, n = 5): string[] {
  if (!notes) return []
  return notes.split('\n').map(l => l.trim()).filter(Boolean).slice(-n).reverse()
}

// ── Avatar ─────────────────────────────────────────────────────────────────

export function Avatar({ name, size = 40, photoUrl }: { name?: string | null; size?: number; photoUrl?: string | null }) {
  if (photoUrl) {
    return <img src={photoUrl} alt={name ? `${name}'s profile photo` : 'Profile photo'} style={{ width: size, height: size }} className="rounded-full object-cover flex-shrink-0" />
  }
  return (
    <div
      style={{ width: size, height: size, fontSize: Math.round(size * 0.33) }}
      className="rounded-full bg-[#0E2A1F] text-[#A8D5B5] font-bold flex items-center justify-center flex-shrink-0"
    >
      {initialsOf(name)}
    </div>
  )
}

// ── Pull to refresh ────────────────────────────────────────────────────────
// Lightweight touch-based PTR: only engages when the scroll container is at the
// very top and the user drags down. Never blocks normal scrolling.

export function usePullToRefresh(onRefresh: () => Promise<void> | void) {
  const startY = useRef<number | null>(null)
  const [distance, setDistance] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const THRESHOLD = 60

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (refreshing) return
    const atTop = (document.scrollingElement?.scrollTop ?? window.scrollY) <= 0
    startY.current = atTop ? e.touches[0].clientY : null
  }, [refreshing])

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (startY.current == null || refreshing) return
    const delta = e.touches[0].clientY - startY.current
    if (delta > 0) setDistance(Math.min(delta * 0.5, 80))
  }, [refreshing])

  const onTouchEnd = useCallback(async () => {
    if (startY.current == null) return
    startY.current = null
    if (distance >= THRESHOLD) {
      setRefreshing(true)
      setDistance(48)
      try { await onRefresh() } finally { setRefreshing(false); setDistance(0) }
    } else {
      setDistance(0)
    }
  }, [distance, onRefresh, refreshing])

  const indicator = (distance > 0 || refreshing) ? (
    <div className="ce-comp-ptr" style={{ height: distance }}>
      <RefreshCw size={20} style={{ opacity: Math.min(distance / THRESHOLD, 1) }} />
    </div>
  ) : null

  return {
    bind: { onTouchStart, onTouchMove, onTouchEnd },
    indicator,
    refreshing,
  }
}

// ── Skeleton block ─────────────────────────────────────────────────────────

export function SkeletonBlock({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`} />
}
