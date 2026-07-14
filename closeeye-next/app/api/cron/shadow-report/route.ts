import { NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { createPostgresReadonlyReader } from '@/lib/identity/postgres-reader'
import { runShadowReport } from '@/lib/identity/shadow-runner'
import { isShadowEnabled } from '@/lib/identity/shadow-source'

/**
 * Out-of-band Identity Shadow runner (Migration Phase A · A5, hardened in A4.1).
 *
 * A scheduled job / operator-triggered endpoint that runs one shadow validation pass
 * against production READ-ONLY and logs the Founder Report. It is independent of the
 * live application and on no family's request path.
 *
 * DORMANT & FAIL-CLOSED by default: it does nothing unless BOTH the kill-switch flag
 * (SHADOW_ENABLED) is on AND the read-only connection (SHADOW_RO_DATABASE_URL) is
 * configured. It is secret-gated (CRON_SECRET) so only the scheduled job or an
 * operator with the secret can invoke it. It performs ZERO writes — the report goes
 * to the logs only, and the report is aggregate (counts, rates, status), never PII.
 *
 * A4.1 hardening: every invocation carries a run identifier + wall-clock timestamp so
 * each run maps directly to a row in the Founder Evidence Log.
 *
 * Kill switch (per the ratified rollback procedure): the PRIMARY, instant stop is
 * database-side privilege revocation (revoke the role's grants / disable the role);
 * SHADOW_ENABLED is a secondary administrative control that takes effect on redeploy.
 *
 * Guarantees preserved: zero writes, zero behaviour change, zero downtime, zero
 * performance regression.
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  // Secret gate — only the scheduled job (Vercel sends this header) or an operator
  // with the secret may run it.
  const secret = process.env.CRON_SECRET
  const auth = request.headers.get('authorization')
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }

  // Evidence identity (A4.1): a unique run id + wall-clock time for the Evidence Log.
  const runId = randomUUID()
  const ranAt = new Date().toISOString()

  // Fail closed: dormant unless explicitly enabled AND the read-only connection exists.
  const roUrl = process.env.SHADOW_RO_DATABASE_URL
  if (!isShadowEnabled() || !roUrl) {
    return NextResponse.json({ ok: true, runId, ranAt, enabled: false, note: 'shadow disabled or read-only connection not configured' })
  }

  const { reader, close } = createPostgresReadonlyReader(roUrl)
  try {
    // windowStable stays false for automated runs: "ready" is a human judgement over
    // several consecutive green reports, never declared by a single run.
    const center = await runShadowReport(reader, { enabled: true, windowStable: false })

    // Observability (zero DB writes): the aggregate Founder Report to the logs, stamped
    // with the run id + time so it lines up with the Evidence Log.
    console.log(`[shadow-report] run ${runId} at ${ranAt}\n` + center.founderReport)

    return NextResponse.json({
      ok: true,
      runId,
      ranAt,
      enabled: true,
      health: center.shadowHealth.status,
      identityParity: center.identityParity.rate,
      authorizationParity: center.authorizationParity.rate,
      performanceMs: center.performance.loadMs,
      discrepancies: center.identityParity.discrepancies.length + center.authorizationParity.discrepancies.length,
      blockers: center.readiness.blockers,
    })
  } catch (err) {
    // Belt-and-braces: the runner already fails closed, but never let this endpoint throw.
    console.error(`[shadow-report] run ${runId} at ${ranAt} failed (non-fatal):`, err)
    return NextResponse.json({ ok: false, runId, ranAt, enabled: true, error: 'shadow run failed — see logs' }, { status: 200 })
  } finally {
    await close()
  }
}
