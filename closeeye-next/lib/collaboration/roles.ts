/**
 * Role competence — which life domain/space a collaboration role can be trusted with, BEFORE Family
 * Policy is applied. A doctor belongs to health, a lawyer to legal, a CA to finance, a Guardian to
 * Trusted Presence. This is CloseEye-owned platform logic; the Family Policy Engine then decides what a
 * given family actually permits. Provider-independent, deterministic.
 */
import type { Domain, Space } from '@/lib/understanding/types'
import type { CollaborationRole } from './types'

export function roleCompetentFor(role: CollaborationRole, ref: { domain: Domain; space?: Space }): boolean {
  switch (role) {
    case 'owner': return true
    case 'doctor': return ref.domain === 'health'
    case 'lawyer': return ref.domain === 'legal'
    case 'chartered_accountant':
    case 'financial_advisor': return ref.domain === 'finance'
    case 'guardian': return ref.domain === 'trusted_presence'
    case 'presence_manager': return ref.domain === 'trusted_presence' || ref.domain === 'health'
    case 'business_partner': return ref.space === 'business'
    // Family sees family life — not the owner's private legal/identity by default (policy can widen).
    case 'family_member': return ref.space !== 'business' && ref.domain !== 'legal' && ref.domain !== 'identity'
    // A guest only ever accesses a single, explicitly-shared object — never a whole domain.
    case 'guest': return false
  }
}
