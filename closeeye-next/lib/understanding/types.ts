/**
 * The Family Understanding Platform — domain model.
 *
 * Every upload (document, image, voice note, PDF, visit, message, future media) becomes an Asset and
 * flows through ONE pipeline to deepen Connect's understanding of the family. This file is the shared
 * vocabulary; it names no provider and touches no database — the platform's meaning lives here,
 * independent of who does vision/OCR/reasoning and where things are stored.
 *
 * Two invariants encoded in these types (from the ratified architecture):
 *  • The LLM/reasoning step PROPOSES; it is never the source of truth. Everything it produces is
 *    confidence-tagged and gated.
 *  • Nothing uncertain is stored silently. Low/medium-confidence inferences become ConfirmationRequests
 *    the family must approve before they become long-term memory or a graph label.
 */

/** The raw media form of an upload. */
export type Modality = 'image' | 'pdf' | 'document' | 'audio' | 'video' | 'text'

/** What the content IS, once understood (semantic classification). Extensible — add a type, not a pipeline. */
export type AssetType =
  | 'medical_report'
  | 'prescription'
  | 'lab_report'
  | 'insurance_document'
  | 'photo'
  | 'voice_note'
  | 'video'
  | 'visit_summary'
  | 'message'
  | 'unknown'

export type ConfidenceBand = 'high' | 'medium' | 'low'
/** A band drives the confirmation gate; the optional score is for providers that produce one. */
export interface Confidence {
  band: ConfidenceBand
  score?: number
}

/** A raw uploaded asset — a provider-agnostic reference, never the bytes themselves. */
export interface Asset {
  id: string
  familyId: string
  modality: Modality
  mimeType: string
  uri: string
  uploadedBy: string
  uploadedAt: string
  bytes?: number
  /** Text that is already known (a message, a typed visit summary) — lets the pipeline skip OCR/STT. */
  text?: string
}

/** One structured fact drawn from the asset, with the confidence it was read at. */
export interface Extraction {
  field: string
  value: string
  confidence: Confidence
  unit?: string
  /** When the fact is dated (e.g. the report/test date) — distinct from when it was uploaded. */
  observedAt?: string
}

/** A candidate long-term memory inferred from the asset. Uncertain ones REQUIRE confirmation. */
export interface MemoryCandidate {
  statement: string
  kind: 'fact' | 'label' | 'observation'
  confidence: Confidence
  /** The evidence behind the statement — so the family can see WHY, never a black box. */
  extractions: Extraction[]
}

/** A proposed link from the asset to a family member. */
export interface SubjectLink {
  lovedOneId: string | null
  displayName: string
  confidence: Confidence
  reason: string
}

/** The understanding of ONE asset — the pipeline's core reading. */
export interface Understanding {
  assetId: string
  assetType: AssetType
  assetTypeConfidence: Confidence
  summary: string
  extractions: Extraction[]
  memoryCandidates: MemoryCandidate[]
  subject: SubjectLink
  language?: string
}

/** Something the family must confirm before it becomes long-term memory / a graph label. */
export interface ConfirmationRequest {
  id: string
  prompt: string
  candidate: MemoryCandidate | SubjectLink
  reason: string
}

/** An event on the Family Timeline. */
export interface TimelineEntry {
  assetId: string
  familyId: string
  lovedOneId: string | null
  at: string
  title: string
  summary: string
  assetType: AssetType
}

export interface GraphNode { id: string; type: string; label: string; props?: Record<string, string> }
export interface GraphEdge { from: string; to: string; type: string }
export interface KnowledgeGraphUpdate { nodes: GraphNode[]; edges: GraphEdge[] }

/**
 * The full result of understanding one asset. The split is the trust contract:
 *  • `verified`  — high-confidence; safe to apply to memory + graph now.
 *  • `pending`   — uncertain; NOTHING here is stored until the family confirms.
 */
export interface PipelineResult {
  understanding: Understanding
  timeline: TimelineEntry
  verified: {
    extractions: Extraction[]
    memories: MemoryCandidate[]
    graph: KnowledgeGraphUpdate
    subject: SubjectLink | null
  }
  pending: ConfirmationRequest[]
  /** For natural-language retrieval; null when no embedding provider is configured. */
  embedding: number[] | null
}
