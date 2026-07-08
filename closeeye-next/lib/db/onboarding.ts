import { supabase } from '@/lib/supabase'
import type { PlanId } from '@/lib/plans'
import type { MembershipReceipt, Subscription } from '@/lib/db/types'

/**
 * Save the user's basic profile from onboarding and mark onboarding complete.
 * The metadata flag is authoritative (the user always owns their own metadata);
 * the profiles row is best-effort under RLS.
 */
export async function saveProfileBasics(userId: string, input: { fullName: string; phone?: string }): Promise<{ error: string | null }> {
  const full_name = input.fullName.trim()
  const phone = input.phone?.trim() || null
  try {
    await supabase.from('profiles').update({ full_name, phone }).eq('id', userId)
  } catch {
    /* best-effort; the metadata flag below is the source of truth */
  }
  const { error } = await supabase.auth.updateUser({ data: { full_name, onboarding_complete: true } })
  return { error: error?.message ?? null }
}

/**
 * Store the chosen membership plan. No charge is taken — status is 'created'
 * and payment is completed later via Razorpay from the Membership page.
 * Upserts on the unique user_id so re-choosing updates the same row.
 */
export async function selectPlan(userId: string, planId: PlanId): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('subscriptions')
    .upsert({ user_id: userId, plan_id: planId, status: 'created' }, { onConflict: 'user_id' })
  return { error: error?.message ?? null }
}

/**
 * Save the Profile module's editable fields. Name + mobile go to the `profiles`
 * row; language + emergency contact live on the user's own metadata (no schema
 * change). Metadata is the authoritative source for name/language.
 */
export async function saveMyProfile(
  userId: string,
  input: { fullName: string; phone?: string; language?: string; emergencyName?: string; emergencyPhone?: string },
): Promise<{ error: string | null }> {
  const full_name = input.fullName.trim()
  const phone = input.phone?.trim() || null
  try {
    await supabase.from('profiles').update({ full_name, phone }).eq('id', userId)
  } catch {
    /* best-effort; the metadata below is authoritative for name */
  }
  const { error } = await supabase.auth.updateUser({
    data: {
      full_name,
      language: (input.language ?? '').trim(),
      emergency_contact_name: (input.emergencyName ?? '').trim(),
      emergency_contact_phone: (input.emergencyPhone ?? '').trim(),
    },
  })
  return { error: error?.message ?? null }
}

/** The user's current membership subscription, or null if none selected yet. */
export async function fetchMySubscription(userId: string): Promise<Subscription | null> {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('plan_id, status, current_end, next_billing_at, total_paid_paise, invoice_count')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return (data as Subscription | null) ?? null
}

/**
 * The user's one-time membership receipts (memberships table). Filter explicitly
 * by user_id — memberships RLS also grants admins a global read.
 */
export async function fetchMyMemberships(userId: string): Promise<MembershipReceipt[]> {
  const { data, error } = await supabase
    .from('memberships')
    .select('id, amount_paise, status, razorpay_payment_id, activated_at, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data as MembershipReceipt[] | null) ?? []
}
