/**
 * The Context Resolution Engine — the keystone that makes CloseEye a LIFE Intelligence Platform.
 *
 * Before any reasoning, every interaction (text, voice, image, PDF, video) resolves four questions:
 *   • Space   — where does this belong? (personal / family / business / property / household / …)
 *   • Subject — who or what is this about? (me / Mom / my company / the Hyderabad house / …)
 *   • Intent  — what does the family want? (Intent Engine)
 *   • Domain  — which knowledge domain? (Domain Engine)
 *
 * It resolves automatically when confident, asks CONCISE clarifications when not, and carries a
 * structured ConversationContext so a later reference resolves ("find that lawyer we discussed"). This
 * is what lets CloseEye remember CONTEXT, not just conversations — and it is completely provider-
 * independent: a model may later propose a resolution, but this engine owns the questions and the
 * clarify-rather-than-guess policy.
 */
import type {
  AssetType, ClarifyingQuestion, Confidence, ContextSubject, ConversationContext, Domain,
  IntentKind, ResolvedContext, Space,
} from './types'
import { defaultIntentEngine } from './intent'
import { defaultDomainEngine } from './domains'

export interface ContextSignal {
  text?: string
  assetType?: AssetType
  lovedOnes: { id: string; name: string }[]
}

export interface ContextResolutionEngine {
  readonly name: string
  resolve(signal: ContextSignal, conversation?: ConversationContext): ResolvedContext
  /** Apply a clarification answer so the next turn of the conversation inherits it (continuity). */
  advance(conversation: ConversationContext, answer: { dimension: 'space' | 'subject' | 'domain' | 'intent'; value: string }): ConversationContext
}

const conf = (band: Confidence['band']): Confidence => ({ band })

// Space cues in free text — override the domain default when present.
const SPACE_CUES: [RegExp, Space][] = [
  [/\b(company|corporate|business|office|board\s*meeting|client|startup|firm)\b/i, 'business'],
  [/\b(house|home|flat|apartment|property|\bland\b|plot|rent|tenant|property\s*tax)\b/i, 'property'],
  [/\b(flight|hotel|trip|travel|visa|itinerary)\b/i, 'travel'],
  [/\b(bank|loan|\bemi\b|mutual\s*fund|investment|salary|tax\s*return)\b/i, 'finance'],
  [/\b(grocer|electricity\s*bill|water\s*bill|maid|cook|household|kitchen)\b/i, 'household'],
]

const DOMAIN_SPACE: Record<Domain, Space> = {
  health: 'family', legal: 'personal', property: 'property', finance: 'finance', identity: 'personal',
  education: 'family', household: 'household', memories: 'family', trusted_presence: 'family', general: 'personal',
}

/** Intents whose meaning REQUIRES a subject ("renew passport" — whose?). */
const SUBJECT_REQUIRED = new Set<IntentKind>(['remind', 'book', 'schedule', 'find', 'compare'])

function resolveSpace(text: string, domain: Domain, conv?: ConversationContext): { value: Space; confidence: Confidence; ask: boolean } {
  for (const [re, sp] of SPACE_CUES) if (re.test(text)) return { value: sp, confidence: conf('high'), ask: false }
  if (conv?.space) return { value: conv.space, confidence: conf('medium'), ask: false }
  // legal/finance asks (a lawyer, an insurance) are genuinely business-or-personal → ask rather than guess.
  const ambiguous = domain === 'legal' || domain === 'finance'
  return { value: DOMAIN_SPACE[domain], confidence: ambiguous ? conf('low') : conf('medium'), ask: ambiguous }
}

function resolveSubject(text: string, lovedOnes: { id: string; name: string }[], conv?: ConversationContext): ContextSubject {
  const t = text.toLowerCase()
  for (const lo of lovedOnes) if (lo.name && t.includes(lo.name.toLowerCase())) return { type: 'person', id: lo.id, displayName: lo.name, confidence: conf('high') }
  if (/\b(company|corporate|business|firm|startup|board)\b/.test(t)) return { type: 'entity', id: null, displayName: 'your company', entityKind: 'company', confidence: conf('medium') }
  if (/\b(house|property|flat|apartment|\bland\b|plot)\b/.test(t)) return { type: 'entity', id: null, displayName: 'a property', entityKind: 'property', confidence: conf('medium') }
  if (/\b(partner|co-?founder)\b/.test(t)) return { type: 'entity', id: null, displayName: 'a business partner', entityKind: 'partner', confidence: conf('medium') }
  if (/\b(my|myself|mine)\b/.test(t)) return { type: 'self', id: null, displayName: 'you', confidence: conf('medium') }
  if (conv?.subject) return conv.subject
  return { type: 'self', id: null, displayName: 'unknown', confidence: conf('low') }
}

function inferDomainFromText(text: string): Domain {
  const t = text.toLowerCase()
  // Substring-friendly (so "medicines"/"diabetic" match), with word-boundaries only where a short token
  // would over-match. Validation caught the earlier \b(medicine)\b which missed the plural.
  if (/lawyer|legal|court|notary|\bwill\b|agreement|contract/.test(t)) return 'legal'
  if (/doctor|medicine|medication|prescription|\bhealth|hospital|\bbp\b|sugar|diabet/.test(t)) return 'health'
  if (/\btax\b|\bbank|\bloan|insurance|invoice|payment|finance/.test(t)) return 'finance'
  if (/house|property|\bland\b|\brent\b|flat\b/.test(t)) return 'property'
  if (/passport|aadhaar|\bpan\b|licen[cs]e/.test(t)) return 'identity'
  return 'general'
}

export const defaultContextEngine: ContextResolutionEngine = {
  name: 'heuristic',
  resolve(signal, conversation): ResolvedContext {
    const text = (signal.text ?? '').trim()
    const intent = defaultIntentEngine.understand({ text: signal.text })
    const domain = signal.assetType ? defaultDomainEngine.forAssetType(signal.assetType) : (conversation?.domain ?? inferDomainFromText(text))
    const space = resolveSpace(text, domain, conversation)
    const subject = resolveSubject(text, signal.lovedOnes, conversation)

    const clarifications: ClarifyingQuestion[] = []
    if (intent.clarification) clarifications.push(intent.clarification)
    if (space.ask) clarifications.push({ question: 'Is this for business or personal?', options: ['Business', 'Personal'] })
    if (SUBJECT_REQUIRED.has(intent.kind) && subject.confidence.band === 'low') clarifications.push({ question: 'Who is this about?' })

    return {
      space: { value: space.value, confidence: space.confidence },
      subject, intent, domain, clarifications, resolved: clarifications.length === 0,
    }
  },
  advance(conversation, answer): ConversationContext {
    const next: ConversationContext = { ...conversation }
    if (answer.dimension === 'space') next.space = answer.value as Space
    else if (answer.dimension === 'domain') next.domain = answer.value as Domain
    else if (answer.dimension === 'intent') next.intentKind = answer.value as IntentKind
    else if (answer.dimension === 'subject') next.subject = { type: 'entity', id: null, displayName: answer.value, entityKind: 'other', confidence: conf('high') }
    return next
  },
}
