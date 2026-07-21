/**
 * Cloza — CloseEye's executive intelligence copilot, as a PLATFORM capability (not a page). These
 * types are the contract shared by the one engine, the one UI, and every role provider.
 *
 * The non-negotiable is epistemic honesty: every thing Cloza says is tagged as a verified FACT (from
 * live data), a RECOMMENDATION, a PREDICTION, or UNAVAILABLE. Cloza never blurs these — it must never
 * present a recommendation as a fact, or imply certainty where no data exists.
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

export interface ClozaAnswer {
  title: string
  segments: ClozaSegment[]
  source: string
}

export interface ClozaQuestion {
  id: string
  label: string
}
