'use client'

/**
 * The Workspace Home — the FAMILY JOURNEY (founder-approved rev-2 mockup, 2026-07-24).
 *
 * The dock label stays "Home"; internally this screen is the Journey, and it answers ONE
 * question — "Where does my family stand today?" — with a composition that adapts by stage:
 *
 *   Stage 1 · First-time user  — one story, one action. NO ask box (a newcomer doesn't know
 *     what to ask), a 28%-smaller orb (it supports the story, not the story), one dark action
 *     (Add your first family member) and three proof doors (How it works · Meet your Guardian
 *     · Sample report). The AI earns its place after the first family member.
 *   Stage 2 · Family added     — goal: prepare the first visit. The journey card is the spine:
 *     ✓ Family added → Complete profile (real ten-point completeness) → Emergency contacts →
 *     Book the first visit → Your Guardian (DIMMED until a real assignment exists — the
 *     introduction is earned, never staged).
 *   Stage 3 · Active           — status first: stones, latest visit, next visit, understanding,
 *     two ask chips bridging into the orb.
 *
 * The services catalogue lives in the ORB (Connect sheet) now — a catalogue answers "What do
 * I need?", which is Connect's question, not Home's. Every line here derives from real graph
 * data via fetchHome; nothing is ever invented (Understanding Constitution).
 */
import * as React from 'react'
import { useRouter } from 'next/navigation'
import { fetchHome, type HomeData } from '@/lib/db/home'
import { WorkspaceHomeView } from '@/components/workspace/journey-home'
import { takeFirstPerson } from '@/lib/first-run'

export default function WorkspaceHome() {
  const router = useRouter()
  // First-run hand-off: a user who just finished onboarding opens ON their new person's
  // Space (the guided first task), not this home. Read once, pre-paint — no flash.
  const [firstPerson] = React.useState<string | null>(() => takeFirstPerson())
  const [home, setHome] = React.useState<HomeData | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState(false)

  const load = React.useCallback(async () => {
    setLoading(true); setError(false)
    try { setHome(await fetchHome()) } catch { setError(true) }
    finally { setLoading(false) }
  }, [])
  React.useEffect(() => { void load() }, [load])

  React.useEffect(() => {
    if (firstPerson) router.replace(`/space/people/${firstPerson}`)
  }, [firstPerson, router])

  if (firstPerson) return <p className="py-20 text-center text-caption text-content-muted">Opening their space…</p>
  if (loading) return <p className="py-20 text-center text-caption text-content-muted">Opening your family…</p>
  if (error) return (
    <div className="py-20 text-center">
      <p className="text-body-sm text-content">We couldn’t open your family just now.</p>
      <button onClick={load} className="mt-4 rounded-full bg-surface-inverse px-5 py-2 text-body-sm font-semibold text-content-inverse">Try again</button>
    </div>
  )
  if (!home) return null
  return <WorkspaceHomeView home={home} />
}
