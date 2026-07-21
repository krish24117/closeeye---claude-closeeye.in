/**
 * The unified understanding pipeline — every asset, one path:
 *
 *   reduce to text → CLASSIFY → extract (specialised by type) → reason → gate the uncertain →
 *   link → timeline + events → knowledge-graph → make retrievable → recommend / notify
 *
 * It is pure ORCHESTRATION over the provider interfaces: it owns the family rules (classify before
 * reasoning, confidence-gate, confirm-before-store, evidence-stamp, memory ageing, verified-only
 * links), never a vendor. Swap any provider and this file does not change. This is the operating
 * system for a family's knowledge — transparent, privacy-preserving, under the family's control.
 */
import type {
  Asset, AssetType, ConfirmationRequest, DetectedEvent, EvidenceStrength, Extraction, Freshness,
  GraphEdge, GraphNode, KnowledgeGraphUpdate, MemoryCandidate, MemoryType, Permanence,
  PipelineResult, ProposedMemory, TimelineEntry, Understanding,
} from './types'
import type { AssetInput, UnderstandingProviders } from './providers'
import { getUnderstandingProviders } from './registry'

export interface PipelineContext {
  /** The family members the asset could belong to — reasoning LINKS to these, never invents a person. */
  lovedOnes: { id: string; name: string }[]
  providers?: UnderstandingProviders
}

const isHigh = (c: { band: string }) => c.band === 'high'
const MEDICAL_TYPES = new Set<AssetType>(['medical_report', 'prescription', 'lab_report'])

export async function understandAsset(asset: Asset, ctx: PipelineContext): Promise<PipelineResult> {
  const P = ctx.providers ?? getUnderstandingProviders()
  const input: AssetInput = { uri: asset.uri, mimeType: asset.mimeType, text: asset.text }

  // 1 — Reduce any modality to text. Evidence strength is set by HOW we got it.
  let text = asset.text ?? ''
  let language: string | undefined
  const sourceEvidence: EvidenceStrength = asset.text ? 'user_entered' : 'ocr_extracted'
  if (!text) {
    if (asset.modality === 'video') {
      if (P.video) { const v = await P.video.understand(input); text = [v.transcript, v.description].filter(Boolean).join('\n'); language = v.language }
      else { const s = await P.speech.transcribe(input); text = s.transcript; language = s.language }
    } else if (asset.modality === 'audio') {
      const s = await P.speech.transcribe(input); text = s.transcript; language = s.language
    } else if (asset.modality === 'image') {
      const [v, o] = await Promise.all([P.vision.describeImage(input), P.ocr.extractText(input)])
      text = [o.text, v.description].filter(Boolean).join('\n'); language = o.language
    } else if (asset.modality === 'pdf' || asset.modality === 'document') {
      const o = await P.ocr.extractText(input); text = o.text; language = o.language
    }
  }

  // 1b — Translate to a canonical language for reasoning (understanding stays language-aware).
  if (P.translation && language && language !== 'en' && text) {
    const t = await P.translation.translate(text, 'en', language); text = t.text
  }

  // 2 — CLASSIFY: what IS this asset? (drives specialised extraction downstream.)
  const cls = await P.classifier.classify({ text, modality: asset.modality, mimeType: asset.mimeType })
  const assetType = cls.assetType

  // 3 — EXTRACT: specialised for medical assets, else general document understanding.
  const doc = MEDICAL_TYPES.has(assetType) && P.medical
    ? await P.medical.extract({ text, assetType })
    : await P.document.understand({ text, assetType })
  const extractions: Extraction[] = doc.extractions.map((e) => ({ ...e, evidenceStrength: sourceEvidence }))
  const observedAt = extractions.find((e) => e.observedAt)?.observedAt ?? asset.uploadedAt

  // 4 — REASON: propose subject link + memory candidates + events (generative — proposes only).
  const reasoned = await P.reasoning.reason({ text, assetType, extractions, lovedOnes: ctx.lovedOnes })
  const memoryCandidates: MemoryCandidate[] = reasoned.memories.map((m) => ({
    statement: m.statement, memoryType: m.memoryType, confidence: m.confidence,
    evidenceStrength: 'ai_inferred', freshness: freshnessFor(m, observedAt), extractions,
  }))

  const understanding: Understanding = {
    assetId: asset.id, assetType, assetTypeConfidence: cls.confidence, summary: doc.summary,
    extractions, memoryCandidates, events: reasoned.events, subject: reasoned.subject, language,
  }

  // 5 — CONFIDENCE GATE: HIGH is verified; MEDIUM/LOW must be confirmed by the family before storing.
  const verifiedMemories = memoryCandidates.filter((m) => isHigh(m.confidence))
  const verifiedEvents = reasoned.events.filter((e) => isHigh(e.confidence))
  const subjectVerified = !!reasoned.subject.lovedOneId && isHigh(reasoned.subject.confidence)

  const pending: ConfirmationRequest[] = []
  memoryCandidates.filter((m) => !isHigh(m.confidence)).forEach((m, i) =>
    pending.push({ id: `memory:${i}`, prompt: `Should I remember: “${m.statement}”?`, candidate: m, reason: `Confidence is ${m.confidence.band} — I'd rather ask than assume.` }))
  if (reasoned.subject.lovedOneId && !subjectVerified)
    pending.push({ id: 'subject', prompt: `Is this about ${reasoned.subject.displayName}?`, candidate: reasoned.subject, reason: reasoned.subject.reason })

  // 6 — LINK + TIMELINE: verified subject only; the strongest verified event dates & titles the entry.
  const lovedOneId = subjectVerified ? reasoned.subject.lovedOneId : null
  const topEvent = verifiedEvents[0]
  const timeline: TimelineEntry = {
    assetId: asset.id, familyId: asset.familyId, lovedOneId,
    at: topEvent?.at ?? observedAt, title: topEvent?.title ?? titleFor(assetType),
    summary: doc.summary, assetType, eventKind: topEvent?.kind,
  }

  // 7 — KNOWLEDGE GRAPH: verified facts/memories only, each tied back to its evidence.
  const graph = buildGraph(asset, understanding, verifiedMemories, lovedOneId)

  // 8 — RETRIEVABLE + proactive layers (recommendations / notifications never become memory).
  const embedding = P.embedding ? await P.embedding.embed(retrievalText(understanding)) : null
  const recommendations = P.recommendation ? await P.recommendation.recommend({ assetType, summary: doc.summary, extractions, events: reasoned.events }) : []
  const notifications = P.notification ? await P.notification.evaluate({ events: verifiedEvents, subject: reasoned.subject }) : []

  return {
    understanding, timeline,
    verified: {
      extractions: extractions.filter((e) => isHigh(e.confidence)),
      memories: verifiedMemories, events: verifiedEvents, graph,
      subject: subjectVerified ? reasoned.subject : null,
    },
    pending, recommendations, notifications, embedding,
  }
}

/* ── Memory ageing ───────────────────────────────────────────────────────────── */
const DEFAULT_PERMANENCE: Record<MemoryType, Permanence> = {
  identity: 'permanent', medical: 'temporary', preference: 'durable', routine: 'temporary',
  relationship: 'durable', event: 'permanent', milestone: 'permanent', document: 'durable',
  observation: 'temporary', ai_suggestion: 'temporary',
}
const STALE_DAYS: Record<Permanence, number | undefined> = { permanent: undefined, durable: 730, temporary: 180 }
function freshnessFor(m: ProposedMemory, observedAt: string): Freshness {
  const permanence = m.permanence ?? DEFAULT_PERMANENCE[m.memoryType]
  return { permanence, observedAt, staleAfterDays: STALE_DAYS[permanence] }
}
/** Is a memory stale enough to offer a review? (Connect: "this list is from 8 months ago — review?") */
export function isStale(f: Freshness, nowIso: string): boolean {
  if (f.staleAfterDays == null) return false
  return (new Date(nowIso).getTime() - new Date(f.observedAt).getTime()) / 86_400_000 > f.staleAfterDays
}

/* ── Presentation helpers ────────────────────────────────────────────────────── */
const TITLES: Record<AssetType, string> = {
  medical_report: 'Medical report', prescription: 'Prescription', lab_report: 'Lab report',
  insurance_document: 'Insurance document', invoice: 'Invoice', id_proof: 'ID proof',
  general_document: 'Document', photo: 'Photo', voice_note: 'Voice note', video: 'Video',
  visit_summary: 'Visit summary', message: 'Message', email: 'Email',
  calendar_event: 'Calendar event', whatsapp_export: 'Chat export', unknown: 'Upload',
}
const titleFor = (t: AssetType) => TITLES[t] ?? 'Upload'
const retrievalText = (u: Understanding): string =>
  [u.summary, ...u.extractions.map((e) => `${e.field}: ${e.value}`)].filter(Boolean).join('\n')

function buildGraph(asset: Asset, u: Understanding, verifiedMemories: MemoryCandidate[], lovedOneId: string | null): KnowledgeGraphUpdate {
  const nodes: GraphNode[] = []
  const edges: GraphEdge[] = []
  const assetNode = `asset:${asset.id}`
  nodes.push({ id: assetNode, type: 'asset', label: titleFor(u.assetType), props: { assetType: u.assetType } })
  if (lovedOneId) {
    const person = `person:${lovedOneId}`
    edges.push({ from: person, to: assetNode, type: 'has_asset' })
    verifiedMemories.forEach((m, i) => {
      const factNode = `fact:${asset.id}:${i}`
      nodes.push({ id: factNode, type: m.memoryType, label: m.statement })
      edges.push({ from: person, to: factNode, type: 'known' })
      edges.push({ from: factNode, to: assetNode, type: 'evidenced_by' })
    })
  }
  return { nodes, edges }
}
