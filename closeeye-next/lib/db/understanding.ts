/**
 * Close Eye Connect — the understanding learning loop (admin/review side).
 *
 * Reads the append-only understanding_log (admin RLS) and the weekly-metrics view,
 * and lets an admin triage a row: mark it reviewed and note what it SHOULD have
 * understood. Those notes become the seed for a regression test (see
 * scripts/sync-understanding-cases.mjs → lib/connect/cases.json).
 */
import { supabase } from '@/lib/supabase'

export interface Understood {
  subjectKind?: 'person' | 'family' | 'self' | null
  subjectKnown?: boolean
  need?: string
  forLoved?: boolean
  city?: string | null
}
export interface UnderstandingRow {
  id: string
  created_at: string
  session_id: string
  event: 'first' | 'clarify' | 'handoff' | 'flag'
  raw_text: string
  understood: Understood
  again_count: number
  reviewed: boolean
  expected: string | null
}
export interface WeeklyMetric {
  week: string
  sessions: number
  first_try_pct: number | null
  resolved_after_clarify_pct: number | null
  handoff_pct: number | null
  flagged_wrong: number | null
}

/** Recent understanding events, newest first (admin-only via RLS). */
export async function fetchUnderstandingLog(limit = 300): Promise<UnderstandingRow[]> {
  const { data, error } = await supabase
    .from('understanding_log')
    .select('id, created_at, session_id, event, raw_text, understood, again_count, reviewed, expected')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw new Error(error.message)
  return (data ?? []) as UnderstandingRow[]
}

/** Weekly quality metrics (first-try %, resolved-after-clarify %, handoff %, flags). */
export async function fetchUnderstandingWeekly(): Promise<WeeklyMetric[]> {
  const { data, error } = await supabase.from('understanding_weekly').select('*')
  if (error) throw new Error(error.message)
  return (data ?? []) as WeeklyMetric[]
}

/** Triage a row: mark reviewed and note what it should have understood (→ regression). */
export async function reviewUnderstanding(id: string, expected: string | null): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('understanding_log')
    .update({ reviewed: true, expected: expected && expected.trim() ? expected.trim() : null })
    .eq('id', id)
  return { error: error?.message ?? null }
}
