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
  // The mobile lives ONLY on the profiles row (not metadata) and is mirrored to
  // whatsapp_number so the "WhatsApp contact" reads resolve to a real number
  // instead of silently falling back. A failed write loses the mobile — so
  // surface the error, never swallow it.
  const { error: profileErr } = await supabase.from('profiles')
    .update({ full_name, phone, whatsapp_number: phone }).eq('id', userId)
  const { error: authErr } = await supabase.auth.updateUser({ data: { full_name, onboarding_complete: true } })
  return { error: authErr?.message ?? profileErr?.message ?? null }
}

/**
 * Store the chosen membership plan. No charge is taken — a NEW row starts as
 * 'created' and payment is completed later via Razorpay from the Membership page.
 * NEVER overwrites status: the Razorpay webhook is the sole authority for it, so
 * re-choosing on an existing (possibly 'active') subscription updates only the
 * plan — never downgrading status back to 'created'.
 */
export async function selectPlan(userId: string, planId: PlanId): Promise<{ error: string | null }> {
  const { data: existing } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle()

  if (existing) {
    // Row already exists — update only the plan; leave status to the webhook.
    const { error } = await supabase.from('subscriptions').update({ plan_id: planId }).eq('user_id', userId)
    return { error: error?.message ?? null }
  }

  // No subscription yet — create a fresh, unpaid row.
  const { error } = await supabase
    .from('subscriptions')
    .insert({ user_id: userId, plan_id: planId, status: 'created' })
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
  // Mobile lives on profiles (not metadata); mirror it to whatsapp_number so the
  // WhatsApp-contact reads resolve. Surface a failed write — never toast success
  // while silently dropping the user's edited mobile number.
  const { error: profileErr } = await supabase.from('profiles')
    .update({ full_name, phone, whatsapp_number: phone }).eq('id', userId)
  const { error: authErr } = await supabase.auth.updateUser({
    data: {
      full_name,
      language: (input.language ?? '').trim(),
      emergency_contact_name: (input.emergencyName ?? '').trim(),
      emergency_contact_phone: (input.emergencyPhone ?? '').trim(),
    },
  })
  return { error: authErr?.message ?? profileErr?.message ?? null }
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
