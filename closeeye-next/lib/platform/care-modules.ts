/**
 * Phase 6 — Modular Care. Each Care module, described once.
 *
 * Until now a Care module was a bare boolean in a region's config (`care: { presence: true }`)
 * — a switch with no idea what it turns on or who runs it. This catalog extracts each module
 * into a first-class thing: a family-facing identity and the staff role(s) that fulfil it.
 * Presence Manager, Guardian and Hospital Companion — the operational backbone — now appear
 * declaratively as the operators of specific modules, rather than being implied by scattered
 * code.
 *
 * "Connect orchestrates; Care fulfils." A module is one unit of fulfilment. A region switches
 * modules on independently (the `care` flags in regions.ts); this catalog says what each one
 * IS. The staff console that runs these modules stays ONE backbone across every region and
 * front door — see staff-console-serves-both.test.ts. Nothing here is region- or host-aware.
 *
 * ARCHITECTURE ONLY (this phase): descriptive metadata, consumed by no runtime path yet — so
 * India's behaviour is byte-identical. Rendering these names on the family and staff surfaces
 * is the next, deliberate increment, exactly as regions.ts was extracted before it was wired.
 */
import { regionFor, type CareModuleId } from './regions'

/**
 * The staff roles that fulfil Care in the field and oversee it. Platform concepts, kept
 * independent of the auth role strings (profiles.role / admin_role) so the catalog describes
 * the operating model without coupling to how login happens to encode it today.
 */
export type StaffRole = 'guardian' | 'presence_manager' | 'hospital_companion'

export interface CareModule {
  id: CareModuleId
  /** Family-facing name — what a family would call this help. */
  name: string
  /** One honest line: what actually happens when this module is used. */
  summary: string
  /** Which staff role(s) fulfil this module. The named operators of the Care backbone. */
  operatedBy: StaffRole[]
}

/**
 * Every Care module the platform can offer, described once. A region offers a SUBSET of these
 * (its `care` flags); this map is what each ID means, regardless of where it is live.
 */
export const CARE_MODULES: Record<CareModuleId, CareModule> = {
  presence: {
    id: 'presence',
    name: 'In-person presence',
    summary: 'A trusted Guardian visits your family member in person; a Presence Manager oversees every visit.',
    operatedBy: ['guardian', 'presence_manager'],
  },
  hospital: {
    id: 'hospital',
    name: 'Hospital companion',
    summary: 'A Hospital Companion accompanies your family member to hospital and stays with them through it.',
    operatedBy: ['hospital_companion', 'presence_manager'],
  },
  financial: {
    id: 'financial',
    name: 'Everyday money tasks',
    summary: 'A Guardian helps in person with bills, banking and paperwork.',
    operatedBy: ['guardian'],
  },
  insurance: {
    id: 'insurance',
    name: 'Insurance help',
    summary: 'A Guardian helps in person with claims, renewals and insurance paperwork.',
    operatedBy: ['guardian'],
  },
  property: {
    id: 'property',
    name: 'Property & home',
    summary: 'A Guardian helps in person with home and property matters.',
    operatedBy: ['guardian'],
  },
  community: {
    id: 'community',
    name: 'Company & community',
    summary: 'A Guardian visits for companionship and to keep your family member connected.',
    operatedBy: ['guardian'],
  },
}

/** The stable display order for Care modules wherever they are listed. */
export const CARE_MODULE_ORDER: CareModuleId[] = ['presence', 'hospital', 'financial', 'insurance', 'property', 'community']

/** Look up one module's definition. */
export function moduleById(id: CareModuleId): CareModule {
  return CARE_MODULES[id]
}

/**
 * The Care modules LIVE in a region, as full descriptors in display order. Combines the
 * region's `care` flags (which are on) with this catalog (what each one is). A Connect-only
 * region returns [] — it fulfils nothing physical, and the UI shows no Care module.
 */
export function careModulesFor(code: string | null | undefined): CareModule[] {
  const care = regionFor(code).care
  return CARE_MODULE_ORDER.filter((id) => care[id] === true).map((id) => CARE_MODULES[id])
}

/** Every distinct staff role needed to fulfil the modules live in a region. */
export function staffRolesFor(code: string | null | undefined): StaffRole[] {
  const roles = new Set<StaffRole>()
  for (const m of careModulesFor(code)) for (const r of m.operatedBy) roles.add(r)
  return [...roles]
}
