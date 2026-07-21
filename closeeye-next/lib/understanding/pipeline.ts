/**
 * The unified understanding pipeline — every upload, one path:
 *
 *   understand → extract → classify confidence → gate (confirm the uncertain) → link → timeline →
 *   knowledge-graph → make retrievable
 *
 * It is pure ORCHESTRATION over the provider interfaces: it owns the family rules (confidence gating,
 * confirm-before-store, link only what's verified), never a vendor. Swap any provider and this file
 * doesn't change. The objective isn't image/document analysis — it's family understanding that stays
 * transparent (evidence attached), privacy-preserving (nothing uncertain stored) and under the
 * family's control (they confirm what gets remembered).
 */
import type {
  Asset, AssetType, ConfirmationRequest, GraphEdge, GraphNode, KnowledgeGraphUpdate,
  MemoryCandidate, PipelineResult, TimelineEntry, Understanding,
} from './types'
import type { AssetInput, UnderstandingProviders } from './providers'
import { getUnderstandingProviders } from './registry'

export interface PipelineContext {
  /** The family members the asset could belong to — reasoning LINKS to these, never invents a person. */
  lovedOnes: { id: string; name: string }[]
  /** Override the registry (tests / per-request providers). */
  providers?: UnderstandingProviders
}

const isHigh = (c: { band: string }) => c.band === 'high'

export async function understandAsset(asset: Asset, ctx: PipelineContext): Promise<PipelineResult> {
  const P = ctx.providers ?? getUnderstandingProviders()
  const input: AssetInput = { uri: asset.uri, mimeType: asset.mimeType, text: asset.text }

  // 1 — Understand content: reduce any modality to text (with a vision description for images).
  let text = asset.text ?? ''
  let language: string | undefined
  if (!text) {
    if (asset.modality === 'audio' || asset.modality === 'video') {
      const r = await P.speech.transcribe(input); text = r.transcript; language = r.language
    } else if (asset.modality === 'image') {
      const [v, o] = await Promise.all([P.vision.describeImage(input), P.ocr.extractText(input)])
      text = [o.text, v.description].filter(Boolean).join('\n'); language = o.language
    } else if (asset.modality === 'pdf' || asset.modality === 'document') {
      const o = await P.ocr.extractText(input); text = o.text; language = o.language
    }
  }

  // 2 — Extract structured information + classify what the asset IS.
  const doc = await P.document.understand({ text, hint: hintFor(asset) })

  // 3 — Reason: propose the subject link + long-term memory candidates (generative — proposes only).
  const reasoned = await P.reasoning.reason({ text, extractions: doc.extractions, lovedOnes: ctx.lovedOnes })

  const understanding: Understanding = {
    assetId: asset.id, assetType: doc.assetType, assetTypeConfidence: doc.assetTypeConfidence,
    summary: doc.summary, extractions: doc.extractions, memoryCandidates: reasoned.memoryCandidates,
    subject: reasoned.subject, language,
  }

  // 4 — Confidence gate: HIGH is verified; MEDIUM/LOW must be confirmed by the family before storing.
  const verifiedMemories = understanding.memoryCandidates.filter((m) => isHigh(m.confidence))
  const subjectVerified = !!understanding.subject.lovedOneId && isHigh(understanding.subject.confidence)

  const pending: ConfirmationRequest[] = []
  understanding.memoryCandidates.filter((m) => !isHigh(m.confidence)).forEach((m, i) =>
    pending.push({ id: `memory:${i}`, prompt: `Should I remember: “${m.statement}”?`, candidate: m, reason: `Confidence is ${m.confidence.band} — I'd rather ask than assume.` }))
  if (understanding.subject.lovedOneId && !subjectVerified)
    pending.push({ id: 'subject', prompt: `Is this about ${understanding.subject.displayName}?`, candidate: understanding.subject, reason: understanding.subject.reason })

  // 5 — Link to the family member: only the VERIFIED subject; otherwise it stays unlinked (pending).
  const lovedOneId = subjectVerified ? understanding.subject.lovedOneId : null

  // 6 — Timeline: the asset always earns a place; it's linked once the subject is verified.
  const timeline: TimelineEntry = {
    assetId: asset.id, familyId: asset.familyId, lovedOneId,
    at: reportDate(understanding) ?? asset.uploadedAt,
    title: titleFor(doc.assetType), summary: doc.summary, assetType: doc.assetType,
  }

  // 7 — Knowledge-graph update: VERIFIED facts/memories only, each edge tied back to its evidence.
  const graph = buildGraph(asset, understanding, verifiedMemories, lovedOneId)

  // 8 — Make it retrievable: embed the content for natural-language recall (if a provider exists).
  const embedding = P.embedding ? await P.embedding.embed(retrievalText(understanding)) : null

  return {
    understanding, timeline,
    verified: {
      extractions: doc.extractions.filter((e) => isHigh(e.confidence)),
      memories: verifiedMemories,
      graph,
      subject: subjectVerified ? understanding.subject : null,
    },
    pending, embedding,
  }
}

const TITLES: Record<AssetType, string> = {
  medical_report: 'Medical report', prescription: 'Prescription', lab_report: 'Lab report',
  insurance_document: 'Insurance document', photo: 'Photo', voice_note: 'Voice note',
  video: 'Video', visit_summary: 'Visit summary', message: 'Message', unknown: 'Upload',
}
const titleFor = (t: AssetType) => TITLES[t]

function hintFor(asset: Asset): AssetType | undefined {
  if (asset.modality === 'audio') return 'voice_note'
  if (asset.modality === 'image') return 'photo'
  if (asset.modality === 'video') return 'video'
  return undefined
}

const reportDate = (u: Understanding): string | undefined => u.extractions.find((e) => e.observedAt)?.observedAt

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
      nodes.push({ id: factNode, type: m.kind, label: m.statement })
      edges.push({ from: person, to: factNode, type: 'known' })
      edges.push({ from: factNode, to: assetNode, type: 'evidenced_by' })
    })
  }
  return { nodes, edges }
}
