import { supabase } from '@/lib/supabase'

/**
 * Ask Close Eye — the client seam onto the LIVE `ask-health` edge function.
 *
 * The function owns all the intelligence and safety: red-flag emergency
 * detection (+ WhatsApp care-team alert), service routing, out-of-scope / child
 * guarding, prompt-injection defence, monthly + burst rate limits, the Claude
 * answer + auto-disclaimer, and persistence to `member_queries`. We only shape
 * the request and normalise the (several) response shapes.
 */

/** One turn in the running conversation sent to the model on follow-ups. */
export interface AskTurn {
  role: 'user' | 'assistant'
  content: string
}

export type AskKind = 'answer' | 'escalate' | 'pending' | 'capped' | 'error' | 'consent'

export interface AskResult {
  kind: AskKind
  /** First-turn id — pass back as conversationId to continue the same thread. */
  queryId: string | null
  /** Markdown answer / escalation copy, when present. */
  text: string | null
  ambulanceNumber?: string
  outOfScope?: boolean
  /** Friendly one-liner for a cap / rate-limit / connectivity error. */
  notice?: string
}

export interface AskInput {
  question: string
  subjectLabel?: string | null
  lovedOneId?: string | null
  /** The first turn's queryId — continues the conversation (skips re-capping). */
  conversationId?: string | null
  priorTurns?: AskTurn[]
}

export async function askCloseEye(input: AskInput): Promise<AskResult> {
  // Patient context is assembled server-side in ask-health now, so the client just
  // sends the question (plus prior turns on a follow-up).
  const messages: AskTurn[] = [...(input.priorTurns ?? []), { role: 'user', content: input.question }]

  const { data, error } = await supabase.functions.invoke('ask-health', {
    body: {
      question: input.question,
      subject_label: input.subjectLabel ?? undefined,
      loved_one_id: input.lovedOneId ?? null,
      ...(input.conversationId ? { conversation_id: input.conversationId } : {}),
      messages,
    },
  })

  if (error) {
    // supabase-js wraps a non-2xx as FunctionsHttpError; the real body (the
    // cap / rate-limit message) lives on error.context (the raw Response).
    const res = (error as { context?: Response }).context
    if (res && typeof res.json === 'function') {
      try {
        const body = await res.json()
        if (body?.error === 'monthly_limit_reached' || body?.error === 'rate_limited') {
          return { kind: 'capped', queryId: null, text: null, notice: body.message }
        }
      } catch {
        /* fall through to a generic error */
      }
    }
    return {
      kind: 'error',
      queryId: null,
      text: null,
      notice:
        typeof navigator !== 'undefined' && navigator.onLine === false
          ? 'No internet connection. Please check your connection and try again.'
          : 'Something went wrong. Please try again in a moment.',
    }
  }

  // Consent gate (server is the source of truth) — Close Eye won't process family information
  // without a granted consent. The client surfaces the trust-promise consent card.
  if (data?.consent_required) {
    return { kind: 'consent', queryId: null, text: null }
  }
  if (data?.lane === 'escalate') {
    return {
      kind: 'escalate',
      queryId: data.query_id ?? null,
      text: data.message ?? null,
      ambulanceNumber: data.escalation?.ambulanceNumber,
    }
  }
  if (data?.ai_answer) {
    return { kind: 'answer', queryId: data.query_id ?? null, text: data.ai_answer, outOfScope: !!data.out_of_scope }
  }
  // No answer produced (no key / model failure) — the care team follows up.
  return { kind: 'pending', queryId: data?.query_id ?? null, text: null }
}

export interface AskHistoryItem {
  id: string
  question: string
  answer: string | null
  status: string
  createdAt: string
  /** Which loved one the question was about, if it was scoped to one. */
  lovedOneId?: string | null
}

/** Recent Ask questions for this user (RLS already scopes `member_queries` to user_id). */
export async function fetchAskHistory(userId: string, limit = 6): Promise<AskHistoryItem[]> {
  const { data } = await supabase
    .from('member_queries')
    .select('id, question, answer, ai_answer, status, created_at, loved_one_id')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)
  const rows =
    (data as Array<{ id: string; question: string; answer: string | null; ai_answer: string | null; status: string; created_at: string; loved_one_id: string | null }> | null) ?? []
  return rows.map((q) => ({
    id: q.id,
    question: q.question,
    answer: q.answer || q.ai_answer,
    status: q.status,
    createdAt: q.created_at,
    lovedOneId: q.loved_one_id,
  }))
}

/**
 * Ask history for ONE family member — the Q&A the family asked Close Eye about this
 * person. Scoped by `loved_one_id` so it can live inside that member's conversation
 * (unifying the AI and PM timelines). RLS still restricts to the caller's own rows.
 */
export async function fetchAskHistoryForMember(
  userId: string,
  lovedOneId: string,
  limit = 4,
): Promise<AskHistoryItem[]> {
  const { data } = await supabase
    .from('member_queries')
    .select('id, question, answer, ai_answer, status, created_at')
    .eq('user_id', userId)
    .eq('loved_one_id', lovedOneId)
    .order('created_at', { ascending: false })
    .limit(limit)
  const rows =
    (data as Array<{ id: string; question: string; answer: string | null; ai_answer: string | null; status: string; created_at: string }> | null) ?? []
  return rows.map((q) => ({
    id: q.id,
    question: q.question,
    answer: q.answer || q.ai_answer,
    status: q.status,
    createdAt: q.created_at,
  }))
}
