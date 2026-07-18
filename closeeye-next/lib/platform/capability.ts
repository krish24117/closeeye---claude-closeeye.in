/**
 * Phase 5 — CapabilityService. What can a family in this region actually do?
 *
 * The UI asks `can(region, capability)` and adapts — it never branches on a country. Connect
 * is global (always true); Care and its modules (presence / guardian / hospital / financial)
 * are true only where they are live. A Canadian family simply never sees "Book a visit"; a
 * family in India sees everything, exactly as today.
 *
 *   India   → connect ✓  care ✓  presence/guardian ✓  financial ✓
 *   Canada  → connect ✓  care ✗  presence/guardian ✗
 *   Japan   → connect ✓  care ✗
 *
 * India-identical today: every family's region_code is 'IN' (care enabled), so every Care
 * surface shows exactly as before. The adaptation only appears once a family has a non-IN
 * region — which is the whole point of building it now.
 */
import { regionFor, careEnabled, type CareModuleId } from './regions'

export type Capability = 'connect' | 'care' | CareModuleId | 'guardian'

export function can(code: string | null | undefined, capability: Capability): boolean {
  // Connect is the global platform — never gated. Constitution: Connect never depends on
  // human operations; this is that principle, made queryable.
  if (capability === 'connect') return true
  // "care" = does ANY Care module exist here? (the gate for care-in-general surfaces)
  if (capability === 'care') return Object.values(regionFor(code).care).some(Boolean)
  // A Guardian is who performs a presence visit — same availability as presence.
  if (capability === 'guardian') return careEnabled(code, 'presence')
  return careEnabled(code, capability)
}

/** Every capability live in a region — for a capability-driven UI or a region admin view. */
export function capabilitiesFor(code: string | null | undefined): Capability[] {
  const out: Capability[] = ['connect']
  const r = regionFor(code)
  for (const m of Object.keys(r.care) as CareModuleId[]) if (r.care[m]) out.push(m)
  if (can(code, 'care')) out.push('care')
  if (can(code, 'guardian')) out.push('guardian')
  return out
}
