/**
 * The Domain Engine — organises all family knowledge into life DOMAINS (health, legal, property,
 * finance, identity, education, household, memories, trusted presence, …) so every stage of reasoning,
 * storage and retrieval is domain-aware. The taxonomy and the mapping are CloseEye-owned platform
 * architecture: a model classifies an asset's TYPE, and this engine decides which life domain that
 * belongs to. Provider-independent — deterministic by default, and stable no matter which AI is wired.
 */
import type { AssetType, Domain, MemoryType } from './types'

export interface DomainEngine {
  readonly name: string
  forAssetType(t: AssetType): Domain
  forMemoryType(t: MemoryType): Domain
}

const ASSET_DOMAIN: Record<AssetType, Domain> = {
  medical_report: 'health', prescription: 'health', lab_report: 'health',
  visit_summary: 'trusted_presence',
  insurance_document: 'finance', invoice: 'finance',
  id_proof: 'identity',
  photo: 'memories', video: 'memories', voice_note: 'memories',
  calendar_event: 'household',
  message: 'general', email: 'general', whatsapp_export: 'general',
  general_document: 'general', unknown: 'general',
}

const MEMORY_DOMAIN: Record<MemoryType, Domain> = {
  identity: 'identity', medical: 'health', routine: 'household',
  preference: 'general', relationship: 'general',
  event: 'memories', milestone: 'memories',
  document: 'general', observation: 'general', ai_suggestion: 'general',
}

export const defaultDomainEngine: DomainEngine = {
  name: 'default',
  forAssetType: (t) => ASSET_DOMAIN[t] ?? 'general',
  forMemoryType: (t) => MEMORY_DOMAIN[t] ?? 'general',
}
