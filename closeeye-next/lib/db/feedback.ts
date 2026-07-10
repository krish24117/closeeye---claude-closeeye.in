import { supabase } from '@/lib/supabase'
import { buildFeedbackRow, isSubmittableFeedback, type FeedbackInput } from './feedback-shape'

export type { FeedbackInput } from './feedback-shape'

/**
 * B3 — persist a feedback submission to the real `feedback` table (public insert,
 * admin read; migration 20260714000000). Returns { ok } only on a genuine write,
 * so the page can show its "goes straight to the team" success ONLY when true.
 */
export async function submitFeedback(input: FeedbackInput): Promise<{ ok: boolean; error?: string }> {
  if (!isSubmittableFeedback(input)) {
    return { ok: false, error: 'Please add a rating, a score, or a note before sending.' }
  }

  // Best-effort attribution — a signed-in family member's own id, else anonymous.
  let userId: string | null = null
  try {
    const { data } = await supabase.auth.getUser()
    userId = data.user?.id ?? null
  } catch {
    /* anon visitor — leave userId null */
  }

  const { error } = await supabase.from('feedback').insert(buildFeedbackRow(input, userId))
  if (error) {
    console.error('[feedback] insert failed:', error.message)
    return { ok: false, error: 'We couldn’t send your feedback just now. Please try again in a moment.' }
  }
  return { ok: true }
}
