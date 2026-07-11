import { supabase } from '@/lib/supabase'
import type { FounderAction } from '@/lib/founder-ops-view'

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
  followedUpAt: string | null
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
  followed_up_at: string | null
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
    followedUpAt: r.followed_up_at,
    notes: r.notes,
  }))
}

export async function setFollowedUp(userId: string, value: boolean): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('profiles')
    .update({ founder_followed_up: value, founder_followed_up_at: value ? new Date().toISOString() : null })
    .eq('id', userId)
  return { error: error?.message ?? null }
}

export async function setFounderNotes(userId: string, notes: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from('profiles').update({ founder_notes: notes.trim() || null }).eq('id', userId)
  return { error: error?.message ?? null }
}

export type FounderActionType = 'call' | 'whatsapp' | 'email'
export type { FounderAction }

/** Log a founder outbound action, fire-and-forget — never blocks the tap, and
 *  swallows errors (incl. before the founder_actions migration lands). */
export function logFounderAction(registrantId: string, actionType: FounderActionType): void {
  try {
    void supabase
      .from('founder_actions')
      .insert({ registrant_id: registrantId, action_type: actionType })
      .then(() => {}, () => {})
  } catch {
    /* best-effort */
  }
}

/** All founder actions (admin RLS), newest first — for KPIs + per-family timelines. */
export async function fetchFounderActions(): Promise<FounderAction[]> {
  const { data, error } = await supabase
    .from('founder_actions')
    .select('registrant_id, action_type, created_at')
    .order('created_at', { ascending: false })
  if (error) {
    console.error('[founder-ops] fetchFounderActions failed:', error.message)
    return []
  }
  return ((data as { registrant_id: string; action_type: string; created_at: string }[] | null) ?? []).map((a) => ({
    registrantId: a.registrant_id,
    actionType: a.action_type,
    createdAt: a.created_at,
  }))
}
