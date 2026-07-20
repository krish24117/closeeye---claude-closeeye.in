import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * Liveness + readiness probe for uptime monitoring (Launch Readiness Phase 2).
 * - Always cheap, never authenticated, never touches family data.
 * - `db` check is a HEAD count on a tiny public-config read through the anon client — it proves the
 *   API gateway + Postgres are reachable without exposing anything or depending on RLS state.
 * Returns 200 when healthy, 503 when a dependency is down (so a monitor can alert).
 */
export const dynamic = 'force-dynamic'

export async function GET() {
  const startedAt = Date.now()
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  const checks: Record<string, 'ok' | 'down' | 'unconfigured'> = { db: 'unconfigured' }

  if (url && anon) {
    try {
      const sb = createClient(url, anon, { auth: { persistSession: false } })
      // Lightweight reachability probe: a HEAD count on an RLS-protected table with a bounded timeout.
      // Anon gets 0 rows (RLS filters, it does not error) — a clean round-trip proves gateway + Postgres
      // are up. Only a transport/timeout error means "down". No family data is read or exposed.
      const probe = sb.from('loved_ones').select('id', { count: 'exact', head: true })
      const timeout = new Promise<{ error: { message: string } }>((resolve) =>
        setTimeout(() => resolve({ error: { message: 'timeout' } }), 3000),
      )
      const res = (await Promise.race([probe, timeout])) as { error: { message: string } | null }
      checks.db = res.error && /fetch|network|timeout|ENOTFOUND|ECONNREFUSED|503|502/i.test(res.error.message) ? 'down' : 'ok'
    } catch {
      checks.db = 'down'
    }
  }

  const healthy = checks.db === 'ok'
  return NextResponse.json(
    { status: healthy ? 'ok' : 'degraded', checks, uptimeMs: Date.now() - startedAt, at: new Date().toISOString() },
    { status: healthy ? 200 : 503, headers: { 'Cache-Control': 'no-store' } },
  )
}
