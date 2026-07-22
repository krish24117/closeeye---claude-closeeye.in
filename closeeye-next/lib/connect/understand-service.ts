/**
 * Track 2, Step 4 — the understanding service. Binds the REAL pieces into the pipeline: the
 * deterministic crisis floor (@shared/crisis), and comprehension on the first-capable model.
 *
 * This is the signed-out first-conversation path (/connect): no Family Graph yet (no account), so
 * no retrieve/remember. The signed-in path (/space/connect) adds those later. Testable — the model
 * is reached only via comprehend(); a crisis returns before any model call (Law 4).
 */
import { detectCrisis } from '@shared/crisis'
import { understand, type Decision, type SafetyResult } from './pipeline'
import { comprehend } from './comprehend'
import { anthropicCaller } from './model'

/** Map the deterministic crisis floor to the pipeline's safety verdict. Authoritative (Law 4). */
export function safetyCheck(input: string): SafetyResult | null {
  const r = detectCrisis(input)
  if (!r.matched) return null
  // Signed-out: we don't know the family's region, so no specific number — the UI shows
  // "your local emergency number" (regions.ts safety invariant: never a wrong one).
  return { message: 'This sounds urgent — please call your local emergency number now.', ambulanceNumber: null }
}

/** Understand one message from the signed-out first conversation. */
export function understandOnce(input: string): Promise<Decision> {
  return understand(input, {
    safetyCheck,
    comprehend: (i) => comprehend(i, anthropicCaller),
  })
}
