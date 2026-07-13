// CloseEye Connect · Resource Router.
//
// Maps a Safety-Engine result (action + crisis category) to REGIONAL resources loaded from a
// config pack. No phone numbers are hardcoded here or in the Safety Engine — a new country is
// a new ResourcePack, never a code change. Provider-agnostic + country-extensible.

import type { CrisisCategory, RecommendedAction } from './safety-engine.ts'

export interface CrisisResource {
  label: string
  number: string
  note?: string
}

export interface ResourcePack {
  /** ISO region, e.g. "IN". */
  region: string
  /** Emergency services (ambulance) for EMERGENCY_SERVICES actions. */
  emergency: CrisisResource
  /** Helplines keyed by crisis category. */
  helplines: Partial<Record<CrisisCategory, CrisisResource[]>>
  /** A human fallback (e.g. the CloseEye care team) when a helpline isn't configured. */
  humanFallback?: CrisisResource
}

export interface RoutedResources {
  action: RecommendedAction
  /** The primary thing to surface (emergency number OR the lead helpline). May be null if a
   *  region hasn't configured a resource for this category — the caller degrades honestly. */
  primary: CrisisResource | null
  /** Any additional helplines for this crisis. */
  helplines: CrisisResource[]
  /** Whether to loop in a human (Presence Manager / care team). */
  escalateToHuman: boolean
}

/**
 * The Resource Router — the single mapping from a Safety-Engine decision to regional
 * resources. Pure + synchronous; the pack is the only source of numbers.
 */
export function routeResources(
  action: RecommendedAction,
  category: CrisisCategory,
  pack: ResourcePack,
  escalateToHuman = true,
): RoutedResources {
  if (action === 'EMERGENCY_SERVICES') {
    return { action, primary: pack.emergency, helplines: [], escalateToHuman }
  }
  const lines = pack.helplines[category] ?? []
  return { action, primary: lines[0] ?? pack.humanFallback ?? null, helplines: lines, escalateToHuman }
}

/**
 * Human escalation interface — provider-agnostic contract. The concrete implementation
 * (Presence Manager routing / care-team alert via sendCareTeamAlert) is wired in ask-health;
 * the Safety Engine only signals THAT a human is needed, never HOW.
 */
export interface HumanEscalation {
  escalate(input: {
    category: CrisisCategory
    severity: string
    signal: string
    lovedOneId?: string | null
    userId: string
  }): Promise<{ delivered: boolean }>
}
