/**
 * The Family Policy Engine — CloseEye's owned privacy, sharing, retention and memory rules, enforced
 * BEFORE any reasoning, storage or action. This is what makes the platform's behaviour uniquely the
 * family's, not the model's: a family can turn off AI inference for a domain, keep identity private,
 * set retention, or restrict what a Guardian may ever see — and the pipeline obeys, regardless of
 * which AI provider is wired. Provider-independent and deterministic.
 */
import type { Domain, Sharing } from './types'

export interface DomainPolicy {
  /** May AI reason over this domain at all? */
  allowInference: boolean
  /** May we store derived memories/graph facts for this domain? */
  allowStore: boolean
  /** Auto-expire stored knowledge after N days (null = keep). */
  retentionDays: number | null
  /** Who this domain's knowledge may reach. */
  sharing: Sharing
}

export interface FamilyPolicy {
  defaults: DomainPolicy
  domains: Partial<Record<Domain, DomainPolicy>>
}

export type PolicyAction = 'reason' | 'store' | 'share' | 'link'
export interface PolicyDecision { allow: boolean; reason: string }

const allow = (reason: string): PolicyDecision => ({ allow: true, reason })
const deny = (reason: string): PolicyDecision => ({ allow: false, reason })

/** The effective policy for a domain (its override, else the family's default). */
export function policyFor(policy: FamilyPolicy, domain: Domain): DomainPolicy {
  return policy.domains[domain] ?? policy.defaults
}

/** Evaluate whether an action is permitted for a domain, with a human reason. */
export function evaluatePolicy(policy: FamilyPolicy, action: PolicyAction, domain: Domain): PolicyDecision {
  const p = policyFor(policy, domain)
  switch (action) {
    case 'reason': return p.allowInference ? allow('AI inference is permitted for this domain') : deny('the family has turned off AI inference for this domain')
    case 'store': return p.allowStore ? allow('storage is permitted') : deny('the family does not store this domain')
    case 'link': return p.allowStore ? allow('linking is permitted') : deny('storage is off, so nothing is linked')
    case 'share': return p.sharing === 'private' ? deny('this domain is private to the account') : allow(`shared with ${p.sharing}`)
  }
}

export interface FamilyPolicyEngine {
  readonly name: string
  policyFor(policy: FamilyPolicy, domain: Domain): DomainPolicy
  evaluate(policy: FamilyPolicy, action: PolicyAction, domain: Domain): PolicyDecision
}

export const defaultPolicyEngine: FamilyPolicyEngine = { name: 'default', policyFor, evaluate: evaluatePolicy }

/**
 * The privacy-first default policy every family starts from: family-only by default, inference and
 * storage on, nothing auto-shared beyond the family — with the sensitive domains tightened (identity
 * and legal private; trusted-presence shared with Guardians who need it to help). A family can relax
 * or tighten any of this; the engine simply enforces whatever they've chosen.
 */
export const PRIVACY_FIRST_POLICY: FamilyPolicy = {
  defaults: { allowInference: true, allowStore: true, retentionDays: null, sharing: 'family' },
  domains: {
    identity: { allowInference: true, allowStore: true, retentionDays: null, sharing: 'private' },
    legal: { allowInference: true, allowStore: true, retentionDays: null, sharing: 'private' },
    finance: { allowInference: true, allowStore: true, retentionDays: null, sharing: 'family' },
    health: { allowInference: true, allowStore: true, retentionDays: null, sharing: 'family' },
    trusted_presence: { allowInference: true, allowStore: true, retentionDays: null, sharing: 'guardians' },
  },
}
