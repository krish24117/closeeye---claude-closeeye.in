/**
 * The REFERENCE providers — deterministic, keyword-driven implementations of the Classifier + Reasoning
 * interfaces. They are not the production AI; they exist so the Validation Harness produces real metrics
 * TODAY (a baseline the platform is measured against) with zero deploy. When the Claude-backed providers
 * land behind the same interfaces, the same harness grades them — a green baseline first, then the model.
 */
import type {
  UnderstandingProviders, AssetClassifierProvider, DocumentUnderstandingProvider, ReasoningProvider,
  VisionProvider, OcrProvider, SpeechToTextProvider,
} from '../providers'
import type { AssetType, Confidence, DetectedEvent, ProposedMemory, SubjectLink } from '../types'

const c = (band: Confidence['band']): Confidence => ({ band })
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ')

const CLASSIFY: [RegExp, AssetType][] = [
  [/prescription|\brx\b|\d+\s?mg\b|twice daily|dosage|tablet/i, 'prescription'],
  [/lab report|blood test|hba1c|haemoglobin|cholesterol|lab result/i, 'lab_report'],
  [/\bmri\b|x-?ray|\bscan\b|medical report|discharge summary|diagnos/i, 'medical_report'],
  [/insurance|policy no\.?|sum insured|premium|mediclaim/i, 'insurance_document'],
  [/passport|aadhaar|\bpan\b|driving licen|voter id|id proof/i, 'id_proof'],
  [/invoice|\bgst\b|amount due|\btax\b|\bbill\b/i, 'invoice'],
  [/visit summary|wellbeing visit|guardian visited/i, 'visit_summary'],
  [/board meeting|minutes|company|agreement|contract|sale deed/i, 'general_document'],
]

export const refClassifier: AssetClassifierProvider = {
  name: 'reference',
  async classify({ text }) {
    for (const [re, t] of CLASSIFY) if (re.test(text)) return { assetType: t, confidence: c('high') }
    return { assetType: 'general_document', confidence: c('medium') }
  },
}

export const refDocument: DocumentUnderstandingProvider = {
  name: 'reference',
  async understand({ text, assetType }) {
    const summary = (text.split(/[.\n]/).find((s) => s.trim().length > 3) ?? '').trim().slice(0, 120)
    return { summary: summary || cap(assetType), extractions: [] }
  },
}

export const refReasoning: ReasoningProvider = {
  name: 'reference',
  async reason({ text, assetType, lovedOnes }) {
    const t = text.toLowerCase()
    let subject: SubjectLink = { lovedOneId: null, displayName: 'your family', confidence: c('low'), reason: 'no clear subject' }
    for (const lo of lovedOnes) if (lo.name && t.includes(lo.name.toLowerCase())) { subject = { lovedOneId: lo.id, displayName: lo.name, confidence: c('high'), reason: `named in the ${cap(assetType).toLowerCase()}` }; break }

    const memories: ProposedMemory[] = []
    const m = text.match(/\btakes?\s+([A-Za-z0-9 ]+?)(?:[.,]|$)/i)
    if (subject.lovedOneId && m) memories.push({ statement: `${subject.displayName} takes ${m[1]!.trim()}`, memoryType: 'medical', confidence: c('high') })

    const events: DetectedEvent[] = []
    if (/expir|renew|\bdue\b/i.test(t)) events.push({ kind: 'renewal', title: `${cap(assetType)} renewal`, at: '2026-08-01', forReminder: true, confidence: c('high') })

    return { subject, memories, events }
  },
}

const passVision: VisionProvider = { name: 'reference', async describeImage() { return { description: '', labels: [], confidence: c('low') } } }
const passOcr: OcrProvider = { name: 'reference', async extractText({ text }) { return { text: text ?? '', confidence: c('low') } } }
const passSpeech: SpeechToTextProvider = { name: 'reference', async transcribe({ text }) { return { transcript: text ?? '', confidence: c('low') } } }

export function referenceProviders(): UnderstandingProviders {
  return {
    classifier: refClassifier, vision: passVision, ocr: passOcr, document: refDocument, speech: passSpeech, reasoning: refReasoning,
    translation: null, medical: null, video: null, embedding: null, recommendation: null, notification: null,
  }
}
