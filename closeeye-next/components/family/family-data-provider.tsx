'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { useAuth } from '@/components/auth/auth-provider'
import { addLovedOne as addLovedOneDb, deleteLovedOne as deleteLovedOneDb, fetchMyLovedOnes, fetchMyProfile, updateFamilyMember as updateFamilyMemberDb } from '@/lib/db/family'
import { fetchMySubscription, selectPlan as selectPlanDb } from '@/lib/db/onboarding'
import type { LovedOne, NewLovedOne, Profile, Subscription } from '@/lib/db/types'
import type { PlanId } from '@/lib/plans'
import { DEFAULT_REGION_CODE } from '@/lib/platform/regions'

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
  subscription: Subscription | null
  identity: Identity
  /** This family's region code (lib/platform). Resolved from the loved one they care for
   *  (their emergency number, locale, Care availability). Default 'IN' — India-identical
   *  today, since every loved one's region_code defaults to 'IN'. */
  region: string
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  addLovedOne: (input: NewLovedOne) => Promise<LovedOne>
  editFamilyMember: (id: string, input: NewLovedOne) => Promise<LovedOne>
  removeLovedOne: (id: string) => Promise<void>
  chooseMembership: (planId: PlanId) => Promise<void>
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
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!userId) {
      setProfile(null)
      setLovedOnes([])
      setSubscription(null)
      setError(null)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const [p, l, sub] = await Promise.all([fetchMyProfile(userId), fetchMyLovedOnes(userId), fetchMySubscription(userId)])
      setProfile(p)
      setLovedOnes(l)
      setSubscription(sub)
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

  const editFamilyMember = useCallback(async (id: string, input: NewLovedOne) => {
    const updated = await updateFamilyMemberDb(id, input)
    setLovedOnes((prev) => prev.map((l) => (l.id === id ? updated : l)))
    return updated
  }, [])

  const removeLovedOne = useCallback(async (id: string) => {
    await deleteLovedOneDb(id)
    setLovedOnes((prev) => prev.filter((l) => l.id !== id))
  }, [])

  const chooseMembership = useCallback(
    async (planId: PlanId) => {
      if (!userId) throw new Error('You’re not signed in.')
      const { error: e } = await selectPlanDb(userId, planId)
      if (e) throw new Error(e)
      setSubscription((prev) => ({
        plan_id: planId,
        status: prev?.status ?? 'created',
        current_end: prev?.current_end ?? null,
        next_billing_at: prev?.next_billing_at ?? null,
        total_paid_paise: prev?.total_paid_paise ?? null,
        invoice_count: prev?.invoice_count ?? null,
      }))
    },
    [userId],
  )

  const identity = useMemo(() => deriveIdentity(user, profile), [user, profile])
  // The family's region = where the person they care for is. First loved one is the primary
  // subject; every surface that shows an emergency number, a locale or a currency reads this.
  const region = useMemo(() => lovedOnes[0]?.region_code || DEFAULT_REGION_CODE, [lovedOnes])
  const value = useMemo<FamilyData>(
    () => ({ profile, lovedOnes, subscription, identity, region, loading, error, refresh: load, addLovedOne, editFamilyMember, removeLovedOne, chooseMembership }),
    [profile, lovedOnes, subscription, identity, region, loading, error, load, addLovedOne, editFamilyMember, removeLovedOne, chooseMembership],
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
  const { lovedOnes, loading, error, refresh, addLovedOne, editFamilyMember, removeLovedOne } = useFamilyData()
  return { lovedOnes, loading, error, refresh, addLovedOne, editFamilyMember, removeLovedOne }
}

/** The signed-in user's membership subscription + plan selection. */
export function useMembership() {
  const { subscription, chooseMembership, loading } = useFamilyData()
  return { subscription, chooseMembership, loading }
}
