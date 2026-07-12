import { supabase } from '@/lib/supabase'

/** The consent captured at the membership gate: holding a loved one's wellbeing data. */
export const WELLBEING_CONSENT_TYPE = 'wellbeing_data'
/** Bump when the wording / scope of what we ask consent for changes. */
export const WELLBEING_CONSENT_VERSION = 'v1'

/**
 * Record a durable, auditable consent event (append-only `consents` log). Callers in a
 * user flow should treat a failure as non-fatal — the ticked checkbox is the consent
 * act; this is the durable record of it, and it must never block the flow behind it.
 */
export async function recordConsent(input: {
  lovedOneId?: string | null
  consentType?: string
  policyVersion?: string
  granted?: boolean
}): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession()
  const userId = session?.user?.id
  if (!userId) throw new Error('not_authenticated')
  const { error } = await supabase.from('consents').insert({
    user_id: userId,
    loved_one_id: input.lovedOneId ?? null,
    consent_type: input.consentType ?? WELLBEING_CONSENT_TYPE,
    policy_version: input.policyVersion ?? WELLBEING_CONSENT_VERSION,
    granted: input.granted ?? true,
  })
  if (error) throw new Error(error.message)
}

/** Whether the user currently has a granted consent of a type (latest event wins). */
export async function hasActiveConsent(consentType: string = WELLBEING_CONSENT_TYPE): Promise<boolean> {
  const { data: { session } } = await supabase.auth.getSession()
  const userId = session?.user?.id
  if (!userId) return false
  const { data, error } = await supabase
    .from('consents')
    .select('granted')
    .eq('user_id', userId)
    .eq('consent_type', consentType)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) return false
  return !!(data as { granted?: boolean } | null)?.granted
}
