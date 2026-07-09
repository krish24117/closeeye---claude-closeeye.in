'use client'

import * as React from 'react'
import { emptyObservations, type VisitObservations } from '@/lib/cloza'
import type { PhotoAttachment, VoiceAttachment } from '@/lib/guardian-uploads'

/**
 * The Guardian's in-visit journey state. Everything auto-saves to localStorage
 * so a visit survives a refresh, a phone lock, or going offline — the Guardian
 * never loses their work. Swap the localStorage layer for IndexedDB + background
 * sync later; the shape stays the same.
 */

export const STEPS = ['arrive', 'checkin', 'prep', 'start', 'checklist', 'observations', 'vitals', 'complete', 'post'] as const
export type StepKey = (typeof STEPS)[number]

interface JourneyState {
  step: number
  gpsChecked: boolean
  checkinAt: number | null
  prep: string[]
  startedAt: number | null
  observations: VisitObservations
  vitals: Record<string, string>
  confirmed: boolean
  rating: number
  issues: string[]
  /** The saved `visits` row id (set once the report is written) — lets the
   *  post-visit step attach rating/issues to the same real record. */
  reportId: string | null
}

function initial(): JourneyState {
  return { step: 0, gpsChecked: false, checkinAt: null, prep: [], startedAt: null, observations: emptyObservations(), vitals: {}, confirmed: false, rating: 0, issues: [], reportId: null }
}

type Action =
  | { type: 'next' }
  | { type: 'back' }
  | { type: 'goto'; step: number }
  | { type: 'gps'; at?: number }
  | { type: 'togglePrep'; id: string }
  | { type: 'start'; at: number }
  | { type: 'scale'; key: string; value: string }
  | { type: 'toggleMoment'; key: string }
  | { type: 'toggleSocial'; key: string }
  | { type: 'field'; key: 'win' | 'familyRequest' | 'concern' | 'note'; value: string }
  | { type: 'vital'; key: string; value: string }
  | { type: 'photoAdd'; photo: PhotoAttachment }
  | { type: 'photoPatch'; id: string; patch: Partial<PhotoAttachment> }
  | { type: 'photoRemove'; id: string }
  | { type: 'voiceSet'; voice: VoiceAttachment | null }
  | { type: 'voicePatch'; patch: Partial<VoiceAttachment> }
  | { type: 'confirm' }
  | { type: 'reportSaved'; id: string }
  | { type: 'rating'; value: number }
  | { type: 'toggleIssue'; id: string }
  | { type: 'hydrate'; state: JourneyState }
  | { type: 'reset' }

function toggle(list: string[], id: string) {
  return list.includes(id) ? list.filter((x) => x !== id) : [...list, id]
}

function reducer(s: JourneyState, a: Action): JourneyState {
  switch (a.type) {
    case 'next':
      return { ...s, step: Math.min(s.step + 1, STEPS.length - 1) }
    case 'back':
      return { ...s, step: Math.max(s.step - 1, 0) }
    case 'goto':
      return { ...s, step: Math.max(0, Math.min(a.step, STEPS.length - 1)) }
    case 'gps':
      return { ...s, gpsChecked: true, checkinAt: s.checkinAt ?? a.at ?? null }
    case 'togglePrep':
      return { ...s, prep: toggle(s.prep, a.id) }
    case 'start':
      return { ...s, startedAt: s.startedAt ?? a.at }
    case 'scale':
      return { ...s, observations: { ...s.observations, scales: { ...s.observations.scales, [a.key]: a.value } } }
    case 'toggleMoment':
      return { ...s, observations: { ...s.observations, moments: toggle(s.observations.moments, a.key) } }
    case 'toggleSocial':
      return { ...s, observations: { ...s.observations, social: toggle(s.observations.social, a.key) } }
    case 'field':
      return { ...s, observations: { ...s.observations, [a.key]: a.value } }
    case 'vital':
      return { ...s, vitals: { ...s.vitals, [a.key]: a.value } }
    case 'photoAdd':
      return { ...s, observations: { ...s.observations, photos: [...s.observations.photos, a.photo] } }
    case 'photoPatch':
      return { ...s, observations: { ...s.observations, photos: s.observations.photos.map((p) => (p.id === a.id ? { ...p, ...a.patch } : p)) } }
    case 'photoRemove':
      return { ...s, observations: { ...s.observations, photos: s.observations.photos.filter((p) => p.id !== a.id) } }
    case 'voiceSet':
      return { ...s, observations: { ...s.observations, voiceNote: a.voice } }
    case 'voicePatch':
      return { ...s, observations: { ...s.observations, voiceNote: s.observations.voiceNote ? { ...s.observations.voiceNote, ...a.patch } : s.observations.voiceNote } }
    case 'confirm':
      return { ...s, confirmed: true }
    case 'reportSaved':
      return { ...s, reportId: a.id }
    case 'rating':
      return { ...s, rating: a.value }
    case 'toggleIssue':
      return { ...s, issues: toggle(s.issues, a.id) }
    case 'hydrate':
      return a.state
    case 'reset':
      return initial()
    default:
      return s
  }
}

interface Ctx extends JourneyState {
  dispatch: React.Dispatch<Action>
  stepKey: StepKey
  /** Real identifiers, from the signed-in guardian + the assigned booking. */
  bookingId: string
  companionId: string
  guardianName: string
  elderProfileId: string | null
}
const VisitContext = React.createContext<Ctx | null>(null)

export interface VisitProviderProps {
  visitId: string
  companionId: string
  guardianName: string
  elderProfileId: string | null
  children: React.ReactNode
}

export function VisitProvider({ visitId, companionId, guardianName, elderProfileId, children }: VisitProviderProps) {
  const key = `ce_guardian_visit_${visitId}`
  const [state, dispatch] = React.useReducer(reducer, undefined, initial)
  const hydrated = React.useRef(false)

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(key)
      if (raw) dispatch({ type: 'hydrate', state: { ...initial(), ...(JSON.parse(raw) as JourneyState) } })
    } catch {
      /* ignore */
    }
    hydrated.current = true
  }, [key])

  // Keep the newest state reachable for the debounced write + unmount flush.
  const latest = React.useRef(state)
  latest.current = state

  const persist = React.useCallback(() => {
    if (!hydrated.current) return
    try {
      localStorage.setItem(key, JSON.stringify(latest.current))
    } catch {
      /* quota (media too large) / private mode — session keeps working in memory */
    }
  }, [key])

  // Debounced so typing and rapid upload-progress ticks don't re-serialise media blobs each change.
  React.useEffect(() => {
    if (!hydrated.current) return
    const id = setTimeout(persist, 250)
    return () => clearTimeout(id)
  }, [state, persist])

  // Flush the last change when the journey unmounts (e.g. navigating away mid-visit).
  React.useEffect(() => () => persist(), [persist])

  return (
    <VisitContext.Provider
      value={{ ...state, dispatch, stepKey: STEPS[state.step]!, bookingId: visitId, companionId, guardianName, elderProfileId }}
    >
      {children}
    </VisitContext.Provider>
  )
}

export function useVisit(): Ctx {
  const ctx = React.useContext(VisitContext)
  if (!ctx) throw new Error('useVisit must be used within <VisitProvider>')
  return ctx
}
