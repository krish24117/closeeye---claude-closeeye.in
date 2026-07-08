'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { useAuth } from '@/components/auth/auth-provider'
import { addLovedOne as addLovedOneDb, deleteLovedOne as deleteLovedOneDb, fetchMyLovedOnes, fetchMyProfile } from '@/lib/db/family'
import type { LovedOne, NewLovedOne, Profile } from '@/lib/db/types'

/** The signed-in person's display identity, resolved from profile + auth. */
export interface Identity {
  fullName: string
  firstName: string
  email: string | null
  avatarUrl: string | null
  initials: string
  /** True when we have no real name yet (falls back to "there"). */
  isPlaceholder: boolean
}

interface FamilyData {
  profile: Profile | null
  lovedOnes: LovedOne[]
  identity: Identity
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  addLovedOne: (input: NewLovedOne) => Promise<LovedOne>
  removeLovedOne: (id: string) => Promise<void>
}

const FamilyDataContext = createContext<FamilyData | undefined>(undefined)

function deriveIdentity(user: User | null, profile: Profile | null): Identity {
  const meta = (user?.user_metadata ?? {}) as { full_name?: string; name?: string; avatar_url?: string; picture?: string }
  const emailName = user?.email ? user.email.split('@')[0] : ''
  const raw = (profile?.full_name || meta.full_name || meta.name || emailName || '').trim()
  const parts = raw ? raw.split(/\s+/) : []
  const firstName = parts[0] || 'there'
  const initials = parts.length
    ? parts.slice(0, 2).map((s) => s[0]).join('').toUpperCase()
    : (user?.email?.[0]?.toUpperCase() ?? '·')
  return {
    fullName: raw || 'there',
    firstName,
    email: user?.email ?? null,
    avatarUrl: meta.avatar_url || meta.picture || null,
    initials,
    isPlaceholder: !raw,
  }
}

/**
 * App-wide source of the signed-in family account's REAL data (profile + loved
 * ones), replacing the lib/family-data.ts mocks. Fetches once the user is known,
 * exposes loading/error, and an addLovedOne mutation that updates in place.
 */
export function FamilyDataProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const userId = user?.id
  const [profile, setProfile] = useState<Profile | null>(null)
  const [lovedOnes, setLovedOnes] = useState<LovedOne[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!userId) {
      setProfile(null)
      setLovedOnes([])
      setError(null)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const [p, l] = await Promise.all([fetchMyProfile(userId), fetchMyLovedOnes(userId)])
      setProfile(p)
      setLovedOnes(l)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load your family data.')
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    void load()
  }, [load])

  const addLovedOne = useCallback(
    async (input: NewLovedOne) => {
      if (!userId) throw new Error('You’re not signed in.')
      const created = await addLovedOneDb(userId, input)
      setLovedOnes((prev) => [...prev, created])
      return created
    },
    [userId],
  )

  const removeLovedOne = useCallback(async (id: string) => {
    await deleteLovedOneDb(id)
    setLovedOnes((prev) => prev.filter((l) => l.id !== id))
  }, [])

  const identity = useMemo(() => deriveIdentity(user, profile), [user, profile])
  const value = useMemo<FamilyData>(
    () => ({ profile, lovedOnes, identity, loading, error, refresh: load, addLovedOne, removeLovedOne }),
    [profile, lovedOnes, identity, loading, error, load, addLovedOne, removeLovedOne],
  )

  return <FamilyDataContext.Provider value={value}>{children}</FamilyDataContext.Provider>
}

export function useFamilyData(): FamilyData {
  const ctx = useContext(FamilyDataContext)
  if (!ctx) throw new Error('useFamilyData must be used within <FamilyDataProvider>')
  return ctx
}

/** Just the signed-in person's display identity (name, avatar, initials). */
export function useProfile(): Identity {
  return useFamilyData().identity
}

/** The signed-in user's loved ones, with loading/empty/error + add/remove. */
export function useLovedOnes() {
  const { lovedOnes, loading, error, refresh, addLovedOne, removeLovedOne } = useFamilyData()
  return { lovedOnes, loading, error, refresh, addLovedOne, removeLovedOne }
}
