/**
 * Operational visit state — cancellations, reschedules and reassignments.
 *
 * Applied on top of the base schedule (`TODAY_VISITS`) so history is never lost: a
 * cancelled visit keeps its record and simply gains a status + reason. localStorage
 * stands in for the shared backend (swap for the Supabase visits table); the UI reads
 * the effective state and metrics update live.
 */
import type { ConsoleVisit, VisitStatus, Escalation } from '@/lib/console-data'
import { familyById, guardianById } from '@/lib/console-data'

export interface VisitOp {
  status: VisitStatus
  reason?: string
  rescheduledTo?: string
  assigneeId?: string
  at: number
}
export type OpsMap = Record<string, VisitOp>

const STORAGE_KEY = 'ce_visit_ops'

export function readOps(): OpsMap {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as OpsMap) : {}
  } catch {
    return {}
  }
}

function writeOps(map: OpsMap) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
  } catch {
    /* quota / private mode */
  }
}

export function cancelVisit(visitId: string, reason: string) {
  const map = readOps()
  map[visitId] = { ...(map[visitId] ?? {}), status: 'cancelled', reason, at: Date.now() }
  writeOps(map)
}

export function rescheduleVisit(visitId: string, opts: { rescheduledTo: string; assigneeId?: string }) {
  const map = readOps()
  map[visitId] = { ...(map[visitId] ?? {}), status: 'rescheduled', rescheduledTo: opts.rescheduledTo, assigneeId: opts.assigneeId, at: Date.now() }
  writeOps(map)
}

export function clearOp(visitId: string) {
  const map = readOps()
  delete map[visitId]
  writeOps(map)
}

/** The visit as it stands now, with any operational override applied. */
export function effectiveVisit(v: ConsoleVisit, ops: OpsMap): ConsoleVisit {
  const op = ops[v.id]
  if (!op) return v
  return {
    ...v,
    status: op.status,
    cancelReason: op.reason ?? v.cancelReason,
    rescheduledTo: op.rescheduledTo ?? v.rescheduledTo,
    guardianId: op.assigneeId ?? v.guardianId,
  }
}

export function effectiveVisits(visits: ConsoleVisit[], ops: OpsMap): ConsoleVisit[] {
  return visits.map((v) => effectiveVisit(v, ops))
}

/* ── Live dashboard metrics ──────────────────────────────────────────────── */

export interface VisitMetrics {
  completed: number
  upcoming: number
  delayed: number
  cancelled: number
  rescheduled: number
  noShow: number
}

export function visitMetrics(visits: ConsoleVisit[], ops: OpsMap): VisitMetrics {
  const eff = effectiveVisits(visits, ops)
  const count = (fn: (v: ConsoleVisit) => boolean) => eff.filter(fn).length
  return {
    completed: count((v) => v.status === 'completed'),
    upcoming: count((v) => v.status === 'upcoming' || v.status === 'scheduled' || v.status === 'en-route' || v.status === 'on-site'),
    delayed: count((v) => v.status === 'delayed'),
    cancelled: count((v) => v.status === 'cancelled'),
    rescheduled: count((v) => v.status === 'rescheduled'),
    noShow: count((v) => v.status === 'missed'),
  }
}

/* ── Auto-escalation rules ───────────────────────────────────────────────── */

/**
 * Generate escalations from operational disruptions. V1 covers the highest-signal
 * rule: a high-priority (often medical) visit that was cancelled needs a human
 * decision. Extend with the other rules (consecutive cancellations, guardian
 * unavailable within 30 min, companion unavailable) as history accrues.
 */
export function autoEscalations(visits: ConsoleVisit[], ops: OpsMap): Escalation[] {
  const out: Escalation[] = []
  for (const v of effectiveVisits(visits, ops)) {
    if (v.status !== 'cancelled') continue
    const family = familyById(v.familyId)
    const guardian = guardianById(v.guardianId)
    if (!family) continue
    const highPriority = v.priority === 'high'
    out.push({
      id: `auto-${v.id}`,
      familyId: v.familyId,
      guardianId: v.guardianId,
      priority: highPriority ? 'high' : 'medium',
      issue: `${highPriority ? 'High-priority visit cancelled' : 'Visit cancelled'} — ${v.memberName} (${v.cancelReason ?? 'reason noted'})`,
      assignedTo: 'Priya Menon',
      createdLabel: 'Just now',
      recommendedAction: highPriority
        ? `Call the family and rebook ${v.memberName.split(' ')[0]} today; ${guardian ? 'reassign to an available Guardian' : 'assign a Guardian'}`
        : `Confirm a new time with the family and reassign if needed`,
      status: 'open',
    })
  }
  return out
}
