/**
 * B3 — pure shaping + validation for a feedback submission.
 *
 * Kept dependency-free (no `@/` imports) so it is unit-testable and importable
 * without the app alias graph. The I/O (the real Supabase insert) lives in
 * ./feedback.ts, which gates the page's success state on a real write.
 */

export interface FeedbackInput {
  rating: number // 0..5 stars; 0 = not given
  nps: number | null // 0..10 recommend score; null = not given
  category: string
  kind: 'praise' | 'bug' | 'idea'
  message: string
}

export interface FeedbackRow {
  user_id: string | null
  rating: number | null
  nps: number | null
  category: string | null
  kind: string
  message: string | null
}

/** At least one substantive signal — mirrors the form's submit-enable rule. */
export function isSubmittableFeedback(i: FeedbackInput): boolean {
  return i.rating > 0 || i.nps !== null || i.message.trim().length > 0
}

/** Shape the form state into the stored row: empty values become null (never
 *  fabricated), and the rating's "0 = not given" sentinel becomes null. */
export function buildFeedbackRow(i: FeedbackInput, userId: string | null): FeedbackRow {
  return {
    user_id: userId,
    rating: i.rating > 0 ? i.rating : null,
    nps: i.nps,
    category: i.category.trim() || null,
    kind: i.kind,
    message: i.message.trim() || null,
  }
}
