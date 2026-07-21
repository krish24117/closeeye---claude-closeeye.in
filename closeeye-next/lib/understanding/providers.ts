/**
 * Provider interfaces for the Family Understanding Platform (Article IX — provider-replaceable).
 *
 * Each capability is a small, single-purpose contract. The pipeline depends ONLY on these interfaces,
 * never on a vendor — so Claude, a vision API, an OCR engine, a speech model or an embedding service
 * can each be swapped for another by changing the registry, with zero change to business logic.
 *
 * Only the ReasoningProvider is generative. Per the architecture: it PROPOSES (subject links, memory
 * candidates) and everything it returns is confidence-tagged, then gated by the pipeline before
 * anything is stored. It is never the source of truth.
 */
import type { AssetType, Confidence, Extraction, MemoryCandidate, SubjectLink } from './types'

/** A provider-agnostic handle to an asset's bytes — a URI plus type, and optional already-known text. */
export interface AssetInput {
  uri: string
  mimeType: string
  text?: string
}

export interface VisionResult { description: string; labels: string[]; confidence: Confidence }
export interface VisionProvider {
  readonly name: string
  describeImage(input: AssetInput): Promise<VisionResult>
}

export interface OcrResult { text: string; confidence: Confidence; language?: string }
export interface OcrProvider {
  readonly name: string
  extractText(input: AssetInput): Promise<OcrResult>
}

export interface DocumentUnderstandingInput { text: string; hint?: AssetType }
export interface DocumentUnderstandingResult {
  assetType: AssetType
  assetTypeConfidence: Confidence
  summary: string
  extractions: Extraction[]
}
export interface DocumentUnderstandingProvider {
  readonly name: string
  understand(input: DocumentUnderstandingInput): Promise<DocumentUnderstandingResult>
}

export interface SpeechResult { transcript: string; confidence: Confidence; language?: string }
export interface SpeechToTextProvider {
  readonly name: string
  transcribe(input: AssetInput): Promise<SpeechResult>
}

export interface EmbeddingProvider {
  readonly name: string
  embed(text: string): Promise<number[]>
}

export interface ReasoningInput {
  text: string
  extractions: Extraction[]
  /** The family members the subject could be — reasoning links, it does not invent people. */
  lovedOnes: { id: string; name: string }[]
}
export interface ReasoningResult {
  subject: SubjectLink
  memoryCandidates: MemoryCandidate[]
}
export interface ReasoningProvider {
  readonly name: string
  reason(input: ReasoningInput): Promise<ReasoningResult>
}

/** The full set the pipeline needs. `embedding` is optional — retrieval degrades, it never breaks. */
export interface UnderstandingProviders {
  vision: VisionProvider
  ocr: OcrProvider
  document: DocumentUnderstandingProvider
  speech: SpeechToTextProvider
  embedding: EmbeddingProvider | null
  reasoning: ReasoningProvider
}
