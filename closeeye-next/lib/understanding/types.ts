/**
 * The Family Understanding Platform — domain model.
 *
 * This is not an AI pipeline. It is the OPERATING SYSTEM FOR A FAMILY'S KNOWLEDGE: every upload becomes
 * an Asset, is understood once, and — only when trustworthy — becomes durable, versioned, explainable
 * memory the family owns. This file is the shared vocabulary; it names no provider and touches no
 * database, so new AI models, new media and new capabilities absorb into it without a rewrite.
 *
 * Invariants (ratified, do not weaken):
 *  • Reasoning PROPOSES; it is never the source of truth. Everything is confidence-tagged and gated.
 *  • Nothing uncertain is stored silently — it becomes a ConfirmationRequest the family approves.
 *  • Every memory is evidence-backed, typed, versioned and dated — so it can be traced and can age.
 */

/** The raw media form of an upload. */
export type Modality = 'image' | 'pdf' | 'document' | 'audio' | 'video' | 'text'

/** What the content IS, once classified. Extensible — add a type + its extraction, not a pipeline. */
export type AssetType =
  | 'medical_report' | 'prescription' | 'lab_report' | 'insurance_document'
  | 'invoice' | 'id_proof' | 'general_document'
  | 'photo' | 'voice_note' | 'video' | 'visit_summary' | 'message'
  | 'email' | 'calendar_event' | 'whatsapp_export' // future sources — the model already holds them
  | 'unknown'

export type ConfidenceBand = 'high' | 'medium' | 'low'
export interface Confidence { band: ConfidenceBand; score?: number }

/**
 * The life domains a family's knowledge organises into (Domain Engine). Reasoning, storage and
 * retrieval are all domain-aware. This taxonomy is CloseEye-owned platform vocabulary — a model
 * classifies into it, it does not get to redefine it.
 */
export type Domain =
  | 'health' | 'legal' | 'property' | 'finance' | 'identity'
  | 'education' | 'household' | 'memories' | 'trusted_presence' | 'general'

/** Who a piece of knowledge may reach (Family Policy Engine). */
export type Sharing = 'private' | 'family' | 'guardians'

/** What the Policy Engine decided for this asset's domain — carried on every result, always visible. */
export interface PolicySummary {
  domain: Domain
  reasoned: boolean
  stored: boolean
  sharing: Sharing
  retentionDays: number | null
}

/* ── Intent (Intent Engine data types) ─────────────────────────────────────── */
export type IntentKind =
  | 'remember' | 'answer' | 'explain' | 'compare' | 'find'
  | 'book' | 'schedule' | 'remind' | 'organize' | 'share' | 'update' | 'unknown'
export interface ClarifyingQuestion { question: string; options?: string[] }
export interface Intent { kind: IntentKind; confidence: Confidence; rationale: string; clarification?: ClarifyingQuestion }

/* ── Context (Life Intelligence — Space + Subject) ─────────────────────────── */
/** WHERE something belongs — CloseEye is a Life Intelligence Platform, not only Family. */
export type Space = 'personal' | 'family' | 'business' | 'property' | 'household' | 'shared' | 'travel' | 'finance' | 'general'
export type SubjectType = 'self' | 'person' | 'entity'
export type EntityKind = 'company' | 'property' | 'partner' | 'vehicle' | 'account' | 'other'
/** WHO or WHAT this is about — the self, a person (family member), or an entity (a company, a house…). */
export interface ContextSubject {
  type: SubjectType
  id: string | null
  displayName: string
  entityKind?: EntityKind
  confidence: Confidence
}
/** The four questions every interaction resolves BEFORE reasoning (Context Resolution Engine). */
export interface ResolvedContext {
  space: { value: Space; confidence: Confidence }
  subject: ContextSubject
  intent: Intent
  domain: Domain
  clarifications: ClarifyingQuestion[]
  /** True when every dimension resolved confidently — safe to proceed without asking. */
  resolved: boolean
}
/** The evolving, STRUCTURED memory of a conversation — so a later reference resolves ("that lawyer we discussed"). */
export interface ConversationContext {
  id: string
  space?: Space
  subject?: ContextSubject
  domain?: Domain
  intentKind?: IntentKind
}

/**
 * HOW something is known — a separate axis from confidence. Confidence is "how sure"; evidence
 * strength is "on what basis". Together they give Connect a nuanced footing for reasoning.
 */
export type EvidenceStrength = 'directly_observed' | 'user_entered' | 'ocr_extracted' | 'ai_inferred' | 'user_confirmed'

/** Governance + retrieval category for a memory. */
export type MemoryType =
  | 'identity' | 'medical' | 'preference' | 'routine' | 'relationship'
  | 'event' | 'milestone' | 'document' | 'observation' | 'ai_suggestion'

/** How a memory ages. Some facts are forever; some go stale and should be re-checked. */
export type Permanence = 'permanent' | 'durable' | 'temporary'
export interface Freshness {
  permanence: Permanence
  observedAt: string
  /** After this many days a temporary/durable memory is "stale" and worth reviewing (undefined = never). */
  staleAfterDays?: number
}

/** The audit trail behind a memory — makes retrieval explainable ("from a visit summary, 2 Jun, confirmed"). */
export interface Provenance {
  source: AssetType | 'user_note' | 'conversation'
  evidenceStrength: EvidenceStrength
  observedAt: string
  confirmedBy?: string
  evidenceAssetId?: string
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

/** One structured fact drawn from the asset, with how sure AND on what basis it was read. */
export interface Extraction {
  field: string
  value: string
  confidence: Confidence
  evidenceStrength: EvidenceStrength
  unit?: string
  observedAt?: string
}

/** What the reasoning provider PROPOSES as a memory — light; the pipeline enriches it. */
export interface ProposedMemory {
  statement: string
  memoryType: MemoryType
  confidence: Confidence
  permanence?: Permanence
}

/** A pipeline-enriched memory candidate: typed, dated, evidence-backed. Uncertain ones need confirming. */
export interface MemoryCandidate {
  statement: string
  memoryType: MemoryType
  confidence: Confidence
  evidenceStrength: EvidenceStrength
  freshness: Freshness
  extractions: Extraction[]
}

/**
 * A stored, VERSIONED memory (the Memory Platform's unit — Phase 3 persists it). Its DNA is what makes
 * CloseEye remember CONTEXT, not just conversations: every memory carries Space · Subject · Domain ·
 * Intent · permissions · Evidence · Confidence · Freshness · Version. Families evolve, so a new reading
 * supersedes the old rather than overwriting it.
 */
export interface Memory {
  id: string
  // ── DNA — the context every memory carries ──
  space: Space
  subject: ContextSubject
  domain: Domain
  intent: IntentKind
  sharing: Sharing            // permissions
  // ── content + evidence ──
  memoryType: MemoryType
  statement: string
  value?: string
  confidence: Confidence
  provenance: Provenance      // source + evidence strength + confirmedBy + evidence asset
  freshness: Freshness
  // ── versioning ──
  version: number
  supersedes?: string
  supersededBy?: string
  createdAt: string
}

export interface SubjectLink {
  lovedOneId: string | null
  displayName: string
  confidence: Confidence
  reason: string
}

/** An event an asset represents — birthdays, doctor visits, renewals — that lands on the Timeline. */
export type EventKind = 'birthday' | 'doctor_visit' | 'renewal' | 'appointment' | 'milestone' | 'general'
export interface DetectedEvent {
  kind: EventKind
  title: string
  at: string
  /** Renewals/expiries want a reminder ahead of time. */
  forReminder: boolean
  confidence: Confidence
}

/** The understanding of ONE asset — the pipeline's core reading. */
export interface Understanding {
  assetId: string
  assetType: AssetType
  assetTypeConfidence: Confidence
  summary: string
  extractions: Extraction[]
  memoryCandidates: MemoryCandidate[]
  events: DetectedEvent[]
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

export interface TimelineEntry {
  assetId: string
  familyId: string
  lovedOneId: string | null
  at: string
  title: string
  summary: string
  assetType: AssetType
  eventKind?: EventKind
}

export interface GraphNode { id: string; type: string; label: string; props?: Record<string, string> }
export interface GraphEdge { from: string; to: string; type: string }
export interface KnowledgeGraphUpdate { nodes: GraphNode[]; edges: GraphEdge[] }

/** A proactive suggestion (Phase 5–7). Never stored as memory; surfaced for the family to act on. */
export interface Recommendation {
  text: string
  kind: 'care' | 'health' | 'document' | 'reminder' | 'general'
  confidence: Confidence
  action?: { label: string; href?: string }
}

/** A notification the platform thinks is worth raising (e.g. an upcoming expiry). */
export interface NotificationIntent {
  title: string
  body: string
  kind: 'reminder' | 'insight' | 'alert'
  at?: string
}

/* ── Actions (Action Orchestrator) ─────────────────────────────────────────── */
/** The meaningful next moves after understanding — proposals only, never executed here. */
export type ActionKind =
  | 'save_memory' | 'set_reminder' | 'share' | 'invite_collaborator' | 'create_task'
  | 'book_trusted_presence' | 'request_information' | 'compare_knowledge' | 'mark_complete'

/**
 * A structured, explainable action OPPORTUNITY for the Response Composer. The orchestrator never
 * executes — it proposes. `autoExecutable` is true only when the family's policy explicitly pre-
 * authorised this action kind; otherwise every action needs confirmation.
 */
export interface ActionProposal {
  kind: ActionKind
  label: string
  rationale: string
  domain?: Domain
  subject?: ContextSubject
  requiresConfirmation: boolean
  autoExecutable: boolean
  payload?: Record<string, string>
}

/**
 * The Internal Reasoning Trace — recorded for EVERY interaction, never shown to users. It captures the
 * exact path the pipeline took, so when someone reports "CloseEye put my passport in Mom's profile" an
 * engineer can see precisely where a decision went wrong. Observability is a first-class platform output.
 */
export interface ReasoningTrace {
  assetId?: string
  space: Space
  subject: { type: SubjectType; id: string | null; displayName: string; confidence: ConfidenceBand }
  intent: IntentKind
  domain: Domain
  confidence: ConfidenceBand
  evidenceUsed: string[]
  memoryRetrieved: string[]
  policyApplied: { domain: Domain; reasoned: boolean; stored: boolean; sharing: Sharing }
  actionCandidates: ActionKind[]
}

/**
 * The full result of understanding one asset. The split is the trust contract:
 *  • `verified` — high-confidence; safe to apply to memory + graph + timeline now.
 *  • `pending`  — uncertain; NOTHING here is stored until the family confirms.
 */
export interface PipelineResult {
  understanding: Understanding
  timeline: TimelineEntry
  verified: {
    extractions: Extraction[]
    memories: MemoryCandidate[]
    events: DetectedEvent[]
    graph: KnowledgeGraphUpdate
    subject: SubjectLink | null
  }
  pending: ConfirmationRequest[]
  recommendations: Recommendation[]
  notifications: NotificationIntent[]
  embedding: number[] | null
  /** The domain this asset belongs to + what the family's policy permitted. Always present. */
  policy: PolicySummary
  /** The resolved Space · Subject · Intent · Domain for this interaction. Stamps every memory's DNA. */
  context: ResolvedContext
}
