/**
 * Close Eye — reading a refusal the SERVER authored.
 *
 * When an edge guard turns a request away (rate limit, bot check) it does not fail — it
 * answers, with an honest message that always offers a human. That message is written
 * once, on the server, next to the rule that produced it. The client's only job is to
 * carry it to the family unchanged.
 *
 * This exists because `supabase.functions.invoke` collapses every non-2xx into an opaque
 * FunctionsHttpError, whose body lives on `error.context` (a Response) and is otherwise
 * thrown away. Without this, a refusal we wrote carefully would reach a worried family as
 * "something went wrong" — the exact opposite of the intent.
 *
 * NEVER invent a refusal here. If the server didn't author one, this returns null and the
 * caller keeps its own generic error path.
 */

export type RefusalKind = 'rate_limited' | 'verification_failed'

export interface Refusal {
  kind: RefusalKind
  /** The server's own words — display verbatim. */
  message: string
  /** Seconds, from Retry-After, when the server told us how long. */
  retryAfter?: number
}

/** Statuses a guard uses to refuse. 429 = limited, 403 = failed the human check. */
const REFUSAL_STATUS: Record<number, RefusalKind> = {
  429: 'rate_limited',
  403: 'verification_failed',
}

/**
 * Extract a server-authored refusal from a functions.invoke error, or null if this
 * wasn't one. Never throws — a failure to parse just means "not a refusal".
 */
export async function readRefusal(error: unknown): Promise<Refusal | null> {
  const res = (error as { context?: unknown } | null)?.context
  if (!(res instanceof Response)) return null

  const kind = REFUSAL_STATUS[res.status]
  if (!kind) return null

  let message = ''
  try {
    const body = (await res.clone().json()) as { message?: unknown }
    if (typeof body?.message === 'string') message = body.message.trim()
  } catch {
    /* not JSON — fall through to the honest default below */
  }
  if (!message) return null // the server didn't author words for this; don't invent any

  const header = res.headers.get('Retry-After')
  const retryAfter = header && /^\d+$/.test(header) ? Number(header) : undefined

  return { kind, message, retryAfter }
}
