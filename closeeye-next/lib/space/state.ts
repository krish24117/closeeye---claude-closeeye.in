/**
 * Sprint 2 — the Workspace State Model, made real (docs/workspace_state_model.md).
 *
 * Home is state-driven, not a fixed dashboard: "users come to a situation, not a dashboard."
 * State is DERIVED (never asserted) from each person's signals, then rolled up to the Workspace
 * by urgency. Pure — no I/O — so it is fully testable and safety-reviewable. Honors the honesty
 * guarantee: a person with no positive signal is "getting to know", never falsely "healthy".
 */
export type WorkspaceState =
  | 'getting_to_know'
  | 'healthy'
  | 'needs_attention'
  | 'active_care'
  | 'emergency'
  | 'resolved'

/** The signals that decide a single person's state. All derived from the Family Graph. */
export interface PersonSignals {
  /** A trusted person has been with them (completed visit / observation) — the ONLY basis for calm. */
  hasPositiveSignal: boolean
  /** Safety-relevant prompts still unanswered — drives "needs attention". */
  openEssentialBlanks: number
  /** A visit is live / a Guardian is en route. */
  hasActiveVisit: boolean
  /** A crisis is active (deterministic safety floor). */
  hasEmergency: boolean
  /** An attention/emergency episode just closed (brief, transitional). */
  justResolved?: boolean
}

/**
 * One person's state. Order is a strict priority ladder — the most urgent true signal wins, so
 * an emergency is never masked by anything below it.
 */
export function derivePersonState(s: PersonSignals): WorkspaceState {
  if (s.hasEmergency) return 'emergency'
  if (s.hasActiveVisit) return 'active_care'
  if (s.openEssentialBlanks > 0) return 'needs_attention'
  if (s.justResolved) return 'resolved'
  if (!s.hasPositiveSignal) return 'getting_to_know'
  return 'healthy'
}

/** Urgency rank — higher wins the roll-up. Resolved sits just above healthy (a settled note). */
const RANK: Record<WorkspaceState, number> = {
  emergency: 5,
  active_care: 4,
  needs_attention: 3,
  getting_to_know: 2,
  resolved: 1,
  healthy: 0,
}

/** The Workspace's state = the most urgent person's state. Empty family → getting to know. */
export function rollUp(states: WorkspaceState[]): WorkspaceState {
  if (!states.length) return 'getting_to_know'
  return states.reduce((a, b) => (RANK[b] > RANK[a] ? b : a))
}

export interface StateMeta {
  /** Attention tone — semantic, not a brand colour. */
  tone: 'calm' | 'learning' | 'attention' | 'active' | 'critical'
  label: string
}

/** Display metadata for a state. Copy only — no layout, no colour values. */
export function stateMeta(state: WorkspaceState): StateMeta {
  switch (state) {
    case 'emergency': return { tone: 'critical', label: 'Emergency' }
    case 'active_care': return { tone: 'active', label: 'Care in progress' }
    case 'needs_attention': return { tone: 'attention', label: 'Needs attention' }
    case 'getting_to_know': return { tone: 'learning', label: 'Getting to know' }
    case 'resolved': return { tone: 'calm', label: 'Just resolved' }
    case 'healthy': return { tone: 'calm', label: 'All calm' }
  }
}
