/**
 * Close Eye Connect — the understanding learning loop (client side).
 *
 * Appends every clarification, human handoff, and user "not right" flag to the
 * understanding_log table so we can measure quality and turn real failures into
 * regression tests. It is FIRE-AND-FORGET: telemetry never blocks, never throws,
 * and never surfaces an error — the experience is unaffected if it can't write
 * (offline, table not yet deployed, etc.).
 */
import { supabase } from '@/lib/supabase'
import type { ReadLedger } from './ledger'

export type UnderstandingEvent = 'first' | 'clarify' | 'handoff' | 'flag'

// One id per understanding ATTEMPT (a fresh id at each new "ask"), so clarify /
// handoff / flag events group into the same funnel for the weekly metrics.
let sid = ''
function rand(): string {
  try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID() } catch { /* older browser */ }
  return `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}
export function newUnderstandingSession(): string { sid = rand(); return sid }

function understood(rl: ReadLedger | null): Record<string, unknown> {
  if (!rl) return {}
  return { subjectKind: rl.subjectKind, subjectKnown: rl.subjectKnown, need: rl.need, forLoved: rl.forLoved, city: rl.city }
}

/** Append one understanding event. Never awaited, never throws. */
export function logUnderstanding(event: UnderstandingEvent, rawText: string, rl: ReadLedger | null, againCount = 0): void {
  if (typeof window === 'undefined') return
  if (!sid) newUnderstandingSession()
  try {
    void supabase
      .from('understanding_log')
      .insert({
        session_id: sid,
        event,
        raw_text: (rawText || '').slice(0, 2000),
        understood: understood(rl),
        again_count: againCount,
      })
      .then(() => {}, () => {}) // swallow — a telemetry failure must never reach the user
  } catch { /* never throw from telemetry */ }
}
