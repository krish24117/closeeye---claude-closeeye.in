import { supabase } from '@/lib/supabase'

/** The Founding cohort target — the "100" in "100 founding families". */
export const FOUNDING_GOAL = 100

/**
 * Public count of founding families (reserved founder registrants + numbered founding
 * members) for the scarcity counter. Reads the `founding_count()` security-definer RPC
 * — anon-safe, returns only the aggregate. Never throws; falls back to 0.
 */
export async function fetchFoundingCount(): Promise<number> {
  try {
    const { data, error } = await supabase.rpc('founding_count')
    if (error || typeof data !== 'number') return 0
    return data
  } catch {
    return 0
  }
}
