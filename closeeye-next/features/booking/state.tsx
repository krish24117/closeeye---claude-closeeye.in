'use client'

import * as React from 'react'
import type { BookingData } from './schema'

export const STEPS = [
  { key: 'service', label: 'Visit' },
  { key: 'family', label: 'Family' },
  { key: 'purpose', label: 'Details' },
  { key: 'schedule', label: 'Date & time' },
  { key: 'contact', label: 'Contact' },
  { key: 'review', label: 'Review' },
] as const

export const SUCCESS_STEP = STEPS.length // 6
export const LAST_FORM_STEP = STEPS.length - 1 // 5 (Review)

export type SubmitStatus = 'idle' | 'submitting' | 'error'

interface State {
  step: number
  data: Partial<BookingData>
  status: SubmitStatus
  ref?: string
}

type Action =
  | { type: 'next' }
  | { type: 'back' }
  | { type: 'goto'; step: number }
  | { type: 'patch'; data: Partial<BookingData> }
  | { type: 'status'; status: SubmitStatus }
  | { type: 'submitted'; ref: string }
  | { type: 'reset' }

const STORAGE_KEY = 'ce_booking_v1'

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'next':
      return { ...state, step: Math.min(state.step + 1, SUCCESS_STEP) }
    case 'back':
      return { ...state, step: Math.max(state.step - 1, 0) }
    case 'goto':
      return { ...state, step: Math.max(0, Math.min(action.step, SUCCESS_STEP)) }
    case 'patch':
      return { ...state, data: { ...state.data, ...action.data } }
    case 'status':
      return { ...state, status: action.status }
    case 'submitted':
      return { ...state, ref: action.ref, status: 'idle', step: SUCCESS_STEP }
    case 'reset':
      return { step: 0, data: {}, status: 'idle', ref: undefined }
    default:
      return state
  }
}

interface Ctx extends State {
  next: () => void
  back: () => void
  goto: (step: number) => void
  patch: (data: Partial<BookingData>) => void
  setStatus: (status: SubmitStatus) => void
  submitted: (ref: string) => void
  reset: () => void
}

const BookingContext = React.createContext<Ctx | null>(null)

export function BookingProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = React.useReducer(reducer, { step: 0, data: {}, status: 'idle' })

  // Hydrate saved progress (data only — always resume at the start of the form).
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<BookingData>
        if (parsed && typeof parsed === 'object') dispatch({ type: 'patch', data: parsed })
      }
    } catch {
      /* ignore private-mode / quota */
    }
  }, [])

  // Persist data as it changes (never persist past the success screen).
  React.useEffect(() => {
    try {
      if (state.step >= SUCCESS_STEP) localStorage.removeItem(STORAGE_KEY)
      else localStorage.setItem(STORAGE_KEY, JSON.stringify(state.data))
    } catch {
      /* ignore */
    }
  }, [state.data, state.step])

  const value: Ctx = {
    ...state,
    next: () => dispatch({ type: 'next' }),
    back: () => dispatch({ type: 'back' }),
    goto: (step) => dispatch({ type: 'goto', step }),
    patch: (data) => dispatch({ type: 'patch', data }),
    setStatus: (status) => dispatch({ type: 'status', status }),
    submitted: (ref) => dispatch({ type: 'submitted', ref }),
    reset: () => {
      try {
        localStorage.removeItem(STORAGE_KEY)
      } catch {
        /* ignore */
      }
      dispatch({ type: 'reset' })
    },
  }

  return <BookingContext.Provider value={value}>{children}</BookingContext.Provider>
}

export function useBooking(): Ctx {
  const ctx = React.useContext(BookingContext)
  if (!ctx) throw new Error('useBooking must be used within <BookingProvider>')
  return ctx
}
