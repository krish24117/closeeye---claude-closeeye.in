/**
 * The Intent Understanding Engine — understands WHY a family is asking or uploading, and asks a
 * clarifying question when it can't tell, rather than assuming. It serves both sides of Connect: a
 * question ("what medicines is Mom on?") and an upload (a bare photo with no context).
 *
 * The clarify-rather-than-assume POLICY is CloseEye's, not a model's. A reasoning provider may later
 * PROPOSE an intent, but this engine owns the decision of when to act and when to ask — so that
 * behaviour stays uniquely CloseEye's while the AI underneath evolves. Provider-independent.
 */
import type { Asset, Confidence, Intent, IntentKind } from './types'

export interface IntentSignal {
  /** A question or note the family typed, if any. */
  text?: string
  /** An asset being uploaded, if any. */
  asset?: Asset
  /** The family chose an action explicitly in the UI — the strongest signal. */
  explicit?: IntentKind
}

export interface IntentEngine {
  readonly name: string
  understand(signal: IntentSignal): Intent
}

const conf = (band: Confidence['band']): Confidence => ({ band })

export const defaultIntentEngine: IntentEngine = {
  name: 'heuristic',
  understand(signal): Intent {
    // 1 — An explicit choice is the truth; never second-guess the family.
    if (signal.explicit) return { kind: signal.explicit, confidence: conf('high'), rationale: 'the family chose this action' }

    const t = (signal.text ?? '').trim()
    const lower = t.toLowerCase()

    // 2 — Phrased as a question → they want an answer.
    if (t && (/\?\s*$/.test(t) || /^(who|what|when|where|why|how|is|are|does|do|can|should|could|will)\b/.test(lower)))
      return { kind: 'answer', confidence: conf('high'), rationale: 'phrased as a question' }

    // 3 — Time-bound language → a reminder.
    if (/\bremind|don.?t forget|expir|due\b|renew|deadline|before\b/.test(lower))
      return { kind: 'remind', confidence: conf('medium'), rationale: 'mentions a time-bound need' }

    // 4 — A bare upload with no words: don't assume — ask what they want done with it.
    if (signal.asset && !t)
      return {
        kind: 'unknown', confidence: conf('low'), rationale: 'a file arrived with no context',
        clarification: { question: 'What should I do with this?', options: ['Remember what it says', 'Just keep it safely', 'Set a reminder'] },
      }

    // 5 — A note (with or without a file) → remember it.
    if (t) return { kind: 'remember', confidence: conf('medium'), rationale: 'a note to keep' }

    // 6 — Nothing to go on → ask.
    return { kind: 'unknown', confidence: conf('low'), rationale: 'not enough to tell', clarification: { question: 'What would you like Close Eye to do?' } }
  },
}
