/**
 * Close Eye — abuse-guard visibility (admin side).
 *
 * Reads rate_limit_events: the record of requests the guards WOULD have turned away.
 * While RATE_LIMIT_ENFORCE is off, every row here is a request we allowed anyway — so
 * this is the tuning signal, and it answers the only question that matters before
 * enforcing: "would these limits have turned away a real family?"
 *
 * How to read it: rows with `enforced: false` are hypothetical (we let them through).
 * A handful, spread across many actors, is normal internet noise. The same actor
 * hundreds of times is abuse. Many DIFFERENT actors hitting one endpoint means the
 * limit is too tight — loosen it BEFORE enforcing, never after.
 */
import { supabase } from '@/lib/supabase'

export interface AbuseEvent {
  id: number
  created_at: string
  endpoint: string
  tier: string | null
  reason: 'rate_limited' | 'bot' | 'ai_budget'
  actor: string | null
  enforced: boolean
}

export interface AbuseSummary {
  endpoint: string
  reason: string
  events: number
  /** Distinct actors — the number that tells abuse (few) from a too-tight limit (many). */
  actors: number
  enforced: number
}

/** Recent would-block events, newest first (admin-only via RLS). */
export async function fetchAbuseEvents(days = 7, limit = 500): Promise<AbuseEvent[]> {
  const since = new Date(Date.now() - days * 86_400_000).toISOString()
  const { data, error } = await supabase
    .from('rate_limit_events')
    .select('id, created_at, endpoint, tier, reason, actor, enforced')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw new Error(error.message)
  return (data ?? []) as AbuseEvent[]
}

/**
 * Group events by endpoint + reason. Done in TypeScript rather than SQL deliberately:
 * this table is tiny by construction (only would-blocks are ever written), so a view
 * would be more machinery than the problem deserves.
 */
export function summarise(events: AbuseEvent[]): AbuseSummary[] {
  const byKey = new Map<string, { endpoint: string; reason: string; events: number; actors: Set<string>; enforced: number }>()
  for (const e of events) {
    const key = `${e.endpoint}::${e.reason}`
    const row = byKey.get(key) ?? { endpoint: e.endpoint, reason: e.reason, events: 0, actors: new Set<string>(), enforced: 0 }
    row.events += 1
    if (e.actor) row.actors.add(e.actor)
    if (e.enforced) row.enforced += 1
    byKey.set(key, row)
  }
  return [...byKey.values()]
    .map((r) => ({ endpoint: r.endpoint, reason: r.reason, events: r.events, actors: r.actors.size, enforced: r.enforced }))
    .sort((a, b) => b.events - a.events)
}
