/**
 * Provider registry — the ONE place vendors are wired. `configureUnderstandingProviders` (startup /
 * per environment) swaps Claude, a vision API, an OCR engine, a medical model, etc. in and out with
 * no change elsewhere.
 *
 * Core defaults are deliberately INERT (empty, low-confidence) and future providers default to `null`.
 * So the pipeline runs end-to-end with zero real providers — and because everything is low-confidence,
 * nothing is auto-stored; it all becomes a ConfirmationRequest. Uncertain-by-default is the safe posture.
 */
import type {
  UnderstandingProviders, AssetClassifierProvider, VisionProvider, OcrProvider,
  DocumentUnderstandingProvider, SpeechToTextProvider, ReasoningProvider,
} from './providers'
import type { Confidence } from './types'

const low = (): Confidence => ({ band: 'low', score: 0 })

const stubClassifier: AssetClassifierProvider = { name: 'none', async classify() { return { assetType: 'unknown', confidence: low() } } }
const stubVision: VisionProvider = { name: 'none', async describeImage() { return { description: '', labels: [], confidence: low() } } }
const stubOcr: OcrProvider = { name: 'none', async extractText() { return { text: '', confidence: low() } } }
const stubDocument: DocumentUnderstandingProvider = { name: 'none', async understand() { return { summary: '', extractions: [] } } }
const stubSpeech: SpeechToTextProvider = { name: 'none', async transcribe() { return { transcript: '', confidence: low() } } }
const stubReasoning: ReasoningProvider = { name: 'none', async reason() { return { subject: { lovedOneId: null, displayName: 'your family', confidence: low(), reason: 'no reasoning provider configured' }, memories: [], events: [] } } }

let current: UnderstandingProviders = {
  classifier: stubClassifier, vision: stubVision, ocr: stubOcr, document: stubDocument, speech: stubSpeech, reasoning: stubReasoning,
  translation: null, medical: null, video: null, embedding: null, recommendation: null, notification: null,
}

export function getUnderstandingProviders(): UnderstandingProviders {
  return current
}

/** Register real providers. The only vendor-coupled call site in the whole platform. */
export function configureUnderstandingProviders(next: Partial<UnderstandingProviders>): void {
  current = { ...current, ...next }
}
