/**
 * Cloza — CloseEye's executive intelligence copilot, as a PLATFORM capability (not a page). These
 * types are the contract shared by the layered engine, the one UI, and every role provider.
 *
 * Two non-negotiables:
 *  • Epistemic honesty — everything Cloza says is a verified FACT (live data), a RECOMMENDATION, a
 *    PREDICTION, or UNAVAILABLE. It never blurs these, and never implies certainty without data.
 *  • Separation of concerns — INTENT (what was asked) · RETRIEVAL (the snapshot) · ANALYSIS (facts) ·
 *    RECOMMENDATION (advice + actions) · PRESENTATION (the UI) are distinct layers, so new roles and
 *    new capabilities extend without rewrites.
 */
export type ClozaRole = 'founder' | 'admin' | 'presence_manager' | 'guardian' | 'customer'

export type Epistemic = 'fact' | 'recommendation' | 'prediction' | 'unavailable'

export const EPISTEMIC_LABEL: Record<Epistemic, string> = {
  fact: 'Verified',
  recommendation: 'Recommendation',
  prediction: 'Prediction',
  unavailable: 'Not available',
}

export interface ClozaSegment {
  kind: Epistemic
  text: string
}

/**
 * What Cloza ALREADY KNOWS about where you're asking from — so you never have to say "show
 * Hyderabad" when you're already looking at Hyderabad. A host page passes as much as it has; the
 * founder workspace has no filters yet, so most fields are absent, but the plumbing is here.
 */
export interface ClozaScope {
  role: ClozaRole
  userName: string
  page?: string
  region?: string
  city?: string
  dateRange?: { label: string }
}

/** Something Cloza can DO from an answer. `available:false` = architected but not yet wired. */
export type ClozaActionKind = 'navigate' | 'task' | 'refine'
export interface ClozaAction {
  kind: ClozaActionKind
  label: string
  href?: string       // navigate
  command?: string    // task / refine identifier
  available: boolean
}

export interface ClozaAnswer {
  title: string
  segments: ClozaSegment[]
  source: string
  actions?: ClozaAction[]
  /** What Cloza assumed about scope, shown back so context is visible (e.g. "Founder · today · all cities"). */
  scopeNote?: string
  /** The capability that produced this answer — lets a follow-up ("break that down") inherit it. */
  capability?: string
}

export interface ClozaQuestion {
  id: string
  label: string
}

/** One exchange, kept so Cloza can carry a conversation. */
export interface ClozaTurn {
  question: string
  answer: ClozaAnswer
}

/** The output of the INTENT layer — what the user meant, resolved against scope + prior turns. */
export interface ClozaIntent {
  capability: string
  city?: string
  breakdown?: 'city'
  compare?: string[]
  isFollowUp: boolean
}
