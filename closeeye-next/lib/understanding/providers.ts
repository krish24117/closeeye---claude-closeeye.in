/**
 * Provider interfaces (Article IX — provider-replaceable). The pipeline depends ONLY on these, never
 * on a vendor. Today Claude might back Reasoning and Classification; tomorrow a specialised medical
 * model, a translation service, a video model or a notification engine slots in by changing the
 * registry — business logic never moves.
 *
 * Core (required): Classifier · Vision · OCR · Document · Speech · Reasoning.
 * Future/optional (null-safe): Translation · Medical Extraction · Video · Embedding · Recommendation ·
 * Notification Intelligence. Absent ones degrade gracefully; they never break the pipeline.
 *
 * Only Reasoning and Recommendation are generative — they PROPOSE, confidence-tagged, and are gated.
 */
import type { AssetType, Confidence, DetectedEvent, Extraction, Modality, NotificationIntent, ProposedMemory, Recommendation, SubjectLink } from './types'

/** A provider-agnostic handle to an asset's bytes. */
export interface AssetInput { uri: string; mimeType: string; text?: string }

/** Provider-produced extraction — no evidence strength yet; the pipeline stamps that from the path. */
export interface RawExtraction { field: string; value: string; confidence: Confidence; unit?: string; observedAt?: string }

/* ── What is this? (classification) ─────────────────────────────────────────── */
export interface ClassificationInput { text: string; modality: Modality; mimeType: string }
export interface ClassificationResult { assetType: AssetType; confidence: Confidence; alternatives?: { assetType: AssetType; confidence: Confidence }[] }
export interface AssetClassifierProvider { readonly name: string; classify(input: ClassificationInput): Promise<ClassificationResult> }

/* ── Reduce any modality to text ─────────────────────────────────────────────── */
export interface VisionResult { description: string; labels: string[]; confidence: Confidence }
export interface VisionProvider { readonly name: string; describeImage(input: AssetInput): Promise<VisionResult> }

export interface OcrResult { text: string; confidence: Confidence; language?: string }
export interface OcrProvider { readonly name: string; extractText(input: AssetInput): Promise<OcrResult> }

export interface SpeechResult { transcript: string; confidence: Confidence; language?: string }
export interface SpeechToTextProvider { readonly name: string; transcribe(input: AssetInput): Promise<SpeechResult> }

export interface VideoResult { description: string; transcript?: string; confidence: Confidence; language?: string }
export interface VideoProvider { readonly name: string; understand(input: AssetInput): Promise<VideoResult> }

export interface TranslationResult { text: string; from: string; to: string }
export interface TranslationProvider { readonly name: string; translate(text: string, to: string, from?: string): Promise<TranslationResult> }

/* ── Extraction (general + specialised) ──────────────────────────────────────── */
export interface ExtractionInput { text: string; assetType: AssetType }
export interface ExtractionResult { summary: string; extractions: RawExtraction[] }
export interface DocumentUnderstandingProvider { readonly name: string; understand(input: ExtractionInput): Promise<ExtractionResult> }
/** Specialised medical extraction (meds, dosages, diagnoses, vitals, lab values). Falls back to Document when null. */
export interface MedicalExtractionProvider { readonly name: string; extract(input: ExtractionInput): Promise<ExtractionResult> }

/* ── Reasoning — the generative core (proposes; never the source of truth) ───── */
export interface ReasoningInput {
  text: string
  assetType: AssetType
  extractions: Extraction[]
  lovedOnes: { id: string; name: string }[]
}
export interface ReasoningResult {
  subject: SubjectLink
  memories: ProposedMemory[]
  events: DetectedEvent[]
}
export interface ReasoningProvider { readonly name: string; reason(input: ReasoningInput): Promise<ReasoningResult> }

/* ── Retrieval, recommendation, notification (Phase 5–7 capabilities, wired now) ─ */
export interface EmbeddingProvider { readonly name: string; embed(text: string): Promise<number[]> }

export interface RecommendationInput { assetType: AssetType; summary: string; extractions: Extraction[]; events: DetectedEvent[] }
export interface RecommendationProvider { readonly name: string; recommend(input: RecommendationInput): Promise<Recommendation[]> }

export interface NotificationInput { events: DetectedEvent[]; subject: SubjectLink }
export interface NotificationIntelligenceProvider { readonly name: string; evaluate(input: NotificationInput): Promise<NotificationIntent[]> }

/** The full set the pipeline can use. Core are always present; the rest are null when not configured. */
export interface UnderstandingProviders {
  classifier: AssetClassifierProvider
  vision: VisionProvider
  ocr: OcrProvider
  document: DocumentUnderstandingProvider
  speech: SpeechToTextProvider
  reasoning: ReasoningProvider
  translation: TranslationProvider | null
  medical: MedicalExtractionProvider | null
  video: VideoProvider | null
  embedding: EmbeddingProvider | null
  recommendation: RecommendationProvider | null
  notification: NotificationIntelligenceProvider | null
}
