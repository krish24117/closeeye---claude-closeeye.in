/**
 * Provider registry — the ONE place vendors are wired. Business logic depends on the interfaces; this
 * decides which implementations back them. `configureUnderstandingProviders` (called at startup / per
 * environment) swaps Claude, a vision API, an OCR engine, etc. in and out with no change elsewhere.
 *
 * The defaults are deliberately INERT: they call nothing and claim nothing (every result is empty and
 * low-confidence). So the pipeline runs end-to-end with zero real providers — and because everything
 * is low-confidence, nothing is auto-stored; it all becomes a ConfirmationRequest. Uncertain-by-
 * default is the safe posture.
 */
import type {
  UnderstandingProviders, VisionProvider, OcrProvider, DocumentUnderstandingProvider,
  SpeechToTextProvider, ReasoningProvider,
} from './providers'
import type { Confidence } from './types'

const low = (): Confidence => ({ band: 'low', score: 0 })

const stubVision: VisionProvider = { name: 'none', async describeImage() { return { description: '', labels: [], confidence: low() } } }
const stubOcr: OcrProvider = { name: 'none', async extractText() { return { text: '', confidence: low() } } }
const stubDocument: DocumentUnderstandingProvider = { name: 'none', async understand() { return { assetType: 'unknown', assetTypeConfidence: low(), summary: '', extractions: [] } } }
const stubSpeech: SpeechToTextProvider = { name: 'none', async transcribe() { return { transcript: '', confidence: low() } } }
const stubReasoning: ReasoningProvider = { name: 'none', async reason() { return { subject: { lovedOneId: null, displayName: 'your family', confidence: low(), reason: 'no reasoning provider configured' }, memoryCandidates: [] } } }

let current: UnderstandingProviders = {
  vision: stubVision, ocr: stubOcr, document: stubDocument, speech: stubSpeech, embedding: null, reasoning: stubReasoning,
}

export function getUnderstandingProviders(): UnderstandingProviders {
  return current
}

/** Register real providers. The only vendor-coupled call site in the whole platform. */
export function configureUnderstandingProviders(next: Partial<UnderstandingProviders>): void {
  current = { ...current, ...next }
}
