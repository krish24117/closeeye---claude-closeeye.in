import type { PlanId } from '@/lib/plans'

/**
 * Membership purchase intent — the plan a visitor chose on /membership, kept so it
 * SURVIVES the sign-up round-trip. Google OAuth bounces through Google and back,
 * losing query params and React state; localStorage persists. This keeps the
 * chosen-membership context alive from Choose → Account → Family → Activate.
 */
const KEY = 'ce_pending_plan'

function isPlanId(v: unknown): v is PlanId {
  return v === 'companion' || v === 'trust' || v === 'family_os'
}

export function setPendingPlan(id: PlanId): void {
  if (typeof window === 'undefined') return
  try { window.localStorage.setItem(KEY, id) } catch { /* private mode / quota */ }
}

export function getPendingPlan(): PlanId | null {
  if (typeof window === 'undefined') return null
  try {
    const v = window.localStorage.getItem(KEY)
    return isPlanId(v) ? v : null
  } catch {
    return null
  }
}

export function clearPendingPlan(): void {
  if (typeof window === 'undefined') return
  try { window.localStorage.removeItem(KEY) } catch { /* ignore */ }
}
