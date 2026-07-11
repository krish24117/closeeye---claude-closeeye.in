import { supabase } from '@/lib/supabase'

/**
 * Founder ops — the registrant list for the operational dashboard. Reads through
 * the admin-only `admin_founder_registrants` function (emails live in auth.users,
 * unreadable from the browser), and lets an admin mark follow-up / save notes
 * (allowed by the "Profiles: update own or admin" RLS).
 */
export interface FounderRegistrant {
  id: string
  fullName: string | null
  email: string | null
  phone: string | null
  serviceArea: string | null
  relationship: string | null
  planId: string | null
  subStatus: string | null
  ref: string | null
  registeredAt: string | null
  followedUp: boolean
  notes: string | null
}

interface RawRegistrant {
  id: string
  full_name: string | null
  email: string | null
  phone: string | null
  service_area: string | null
  relationship: string | null
  plan_id: string | null
  sub_status: string | null
  ref: string | null
  registered_at: string | null
  followed_up: boolean | null
  notes: string | null
}

export async function fetchFounderRegistrants(): Promise<FounderRegistrant[]> {
  const { data, error } = await supabase.rpc('admin_founder_registrants')
  if (error) {
    console.error('[founder-ops] fetchFounderRegistrants failed:', error.message)
    return []
  }
  return ((data as RawRegistrant[] | null) ?? []).map((r) => ({
    id: r.id,
    fullName: r.full_name,
    email: r.email,
    phone: r.phone,
    serviceArea: r.service_area,
    relationship: r.relationship,
    planId: r.plan_id,
    subStatus: r.sub_status,
    ref: r.ref,
    registeredAt: r.registered_at,
    followedUp: !!r.followed_up,
    notes: r.notes,
  }))
}

export async function setFollowedUp(userId: string, value: boolean): Promise<{ error: string | null }> {
  const { error } = await supabase.from('profiles').update({ founder_followed_up: value }).eq('id', userId)
  return { error: error?.message ?? null }
}

export async function setFounderNotes(userId: string, notes: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from('profiles').update({ founder_notes: notes.trim() || null }).eq('id', userId)
  return { error: error?.message ?? null }
}
