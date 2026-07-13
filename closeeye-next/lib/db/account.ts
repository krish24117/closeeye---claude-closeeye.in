import { supabase } from '@/lib/supabase'

/**
 * True the first time a previously-deleted family signs back in — and it clears the record
 * server-side so it only ever fires once. Backed by the claim_welcome_back RPC (SECURITY
 * DEFINER + auth.email(), so a caller can only claim their own email).
 */
export async function claimWelcomeBack(): Promise<boolean> {
  const { data, error } = await supabase.rpc('claim_welcome_back')
  if (error) return false
  return data === true
}
