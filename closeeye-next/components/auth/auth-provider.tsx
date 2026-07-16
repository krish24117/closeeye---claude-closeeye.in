'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { isOnboardingComplete } from '@/lib/profile'

type AuthState = {
  /** The live Supabase session, or null when signed out. */
  session: Session | null
  user: User | null
  /** True until the initial session lookup resolves. */
  loading: boolean
  /** False when env vars are missing (never crashes the app). */
  configured: boolean
  /** null while resolving; true/false once the profile is checked. */
  onboardingComplete: boolean | null
  refreshOnboarding: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthState | undefined>(undefined)

/**
 * App-wide auth/session provider. Reads the persisted Supabase session on mount,
 * stays in sync via `onAuthStateChange`, and resolves the user's onboarding
 * status — everything the auth gate (Step 4) needs to route the app.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [onboardingComplete, setOnboardingComplete] = useState<boolean | null>(null)

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false)
      return
    }
    let mounted = true

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!mounted) return
        setSession(data.session)
        setLoading(false)
      })
      .catch(() => {
        if (mounted) setLoading(false)
      })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
    })

    return () => {
      mounted = false
      sub.subscription.unsubscribe()
    }
  }, [])

  // Resolve onboarding status whenever the signed-in user changes.
  const userId = session?.user?.id
  useEffect(() => {
    if (!userId) {
      setOnboardingComplete(null)
      return
    }
    let active = true
    setOnboardingComplete(null)
    isOnboardingComplete()
      .then((v) => { if (active) setOnboardingComplete(v) })
      .catch(() => { if (active) setOnboardingComplete(false) }) // never leave it null → never hang the splash
    return () => {
      active = false
    }
  }, [userId])

  const refreshOnboarding = async () => {
    if (session) setOnboardingComplete(await isOnboardingComplete())
  }

  const signOut = async () => {
    if (isSupabaseConfigured) await supabase.auth.signOut()
    setSession(null)
    setOnboardingComplete(null)
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        loading,
        configured: isSupabaseConfigured,
        onboardingComplete,
        refreshOnboarding,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>')
  return ctx
}
