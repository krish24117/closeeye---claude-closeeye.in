/**
 * The seed validation corpus — representative scenarios per life bucket. This is the START of the
 * 500-per-domain suite the CTO specified; it grows over time, and every provider change re-runs it. Each
 * scenario asserts what the PLATFORM should conclude, independent of which model is wired underneath.
 */
import type { Scenario } from './harness'

const AMMA = [{ id: 'lo1', name: 'Amma' }]

export const SEED_CORPUS: Scenario[] = [
  // Family — questions about a loved one.
  { id: 'fam-1', bucket: 'Family', input: { text: 'What medicines is Amma taking?' }, lovedOnes: AMMA, expect: { domain: 'health', subjectType: 'person', subjectId: 'lo1', intent: 'answer', clarifies: false } },
  { id: 'fam-2', bucket: 'Family', input: { text: 'How is Amma doing lately?' }, lovedOnes: AMMA, expect: { subjectType: 'person', subjectId: 'lo1', intent: 'answer', clarifies: false } },

  // Health — a prescription (asset): classify, link, place the medical memory.
  { id: 'health-1', bucket: 'Health', input: { text: 'Amma takes Metformin 500mg twice daily. Diagnosis: Type 2 diabetes.', modality: 'pdf' }, lovedOnes: AMMA, expect: { assetType: 'prescription', domain: 'health', subjectType: 'person', subjectId: 'lo1', memories: ['Amma takes Metformin'], actions: ['share', 'compare_knowledge'] } },

  // Legal — ambiguous vs resolved space.
  { id: 'legal-1', bucket: 'Legal', input: { text: 'I need a lawyer' }, expect: { domain: 'legal', clarifies: true } },
  { id: 'legal-2', bucket: 'Legal', input: { text: 'book a corporate lawyer' }, expect: { domain: 'legal', space: 'business', clarifies: false } },

  // Property — a tax doc resolves space, domain, reminder.
  { id: 'property-1', bucket: 'Property', input: { text: 'Property tax due for the Hyderabad house' }, expect: { space: 'property', domain: 'finance', intent: 'remind' } },

  // Finance.
  { id: 'finance-1', bucket: 'Finance', input: { text: 'Show my bank loan statement' }, expect: { space: 'finance', domain: 'finance' } },

  // Identity — whose passport? + classify an ID doc.
  { id: 'identity-1', bucket: 'Identity', input: { text: 'renew passport' }, expect: { domain: 'identity', intent: 'remind', clarifies: true } },
  { id: 'identity-2', bucket: 'Identity', input: { text: 'Passport No M1234567. Republic of India. Date of expiry 12/2030.', modality: 'pdf' }, expect: { assetType: 'id_proof', domain: 'identity' } },

  // Business — a board doc belongs to the business space + a company subject.
  { id: 'business-1', bucket: 'Business', input: { text: 'Board meeting minutes — Acme company, Q3 2026 revenue review.', modality: 'pdf' }, expect: { space: 'business', assetType: 'general_document', subjectType: 'entity' } },

  // Travel.
  { id: 'travel-1', bucket: 'Travel', input: { text: 'Book a hotel in Goa for the trip' }, expect: { space: 'travel' } },

  // Household.
  { id: 'household-1', bucket: 'Household', input: { text: 'Pay the electricity bill this week' }, expect: { space: 'household' } },

  // Hallucination guard — a doc with nothing about a person must NOT invent a memory.
  { id: 'guard-1', bucket: 'Household', input: { text: 'General notice about society parking rules.', modality: 'pdf' }, expect: { noMemories: true } },
]
