/**
 * Phase 6 gate — Modular Care.
 *
 * Every module a region can switch on has a definition (no orphan flags). India's live modules
 * match its config exactly (byte-identical). A Connect-only region fulfils nothing. The three
 * named operators — Guardian, Presence Manager, Hospital Companion — are all real in the model.
 */
import { describe, it, expect } from 'vitest'
import { CARE_MODULES, CARE_MODULE_ORDER, careModulesFor, staffRolesFor, moduleById } from './care-modules'
import { ALL_REGIONS, regionFor, type CareModuleId } from './regions'

describe('the catalog is complete — no Care flag without a definition', () => {
  it('every ordered id has a descriptor, and order covers the whole catalog', () => {
    expect(new Set(CARE_MODULE_ORDER)).toEqual(new Set(Object.keys(CARE_MODULES) as CareModuleId[]))
  })
  it('every region flag references a module that exists in the catalog', () => {
    for (const r of ALL_REGIONS) {
      for (const id of Object.keys(r.care) as CareModuleId[]) {
        if (r.care[id]) expect(CARE_MODULES[id], `${r.code} flags unknown module ${id}`).toBeTruthy()
      }
    }
  })
  it('every module names at least one operating staff role', () => {
    for (const id of CARE_MODULE_ORDER) expect(moduleById(id).operatedBy.length).toBeGreaterThan(0)
  })
})

describe('India — live modules match config, byte-identical', () => {
  it('careModulesFor("IN") is exactly the modules IN flags on', () => {
    const flagged = (Object.keys(regionFor('IN').care) as CareModuleId[]).filter((id) => regionFor('IN').care[id])
    expect(careModulesFor('IN').map((m) => m.id).sort()).toEqual(flagged.sort())
  })
  it('India offers presence and everyday money tasks', () => {
    const ids = careModulesFor('IN').map((m) => m.id)
    expect(ids).toContain('presence')
    expect(ids).toContain('financial')
  })
  it('India needs a Guardian and a Presence Manager', () => {
    expect(staffRolesFor('IN')).toContain('guardian')
    expect(staffRolesFor('IN')).toContain('presence_manager')
  })
})

describe('a Connect-only region fulfils nothing physical', () => {
  for (const code of ['CA', 'JP', 'atlantis']) {
    it(`careModulesFor(${JSON.stringify(code)}) is empty and needs no staff`, () => {
      expect(careModulesFor(code)).toEqual([])
      expect(staffRolesFor(code)).toEqual([])
    })
  }
})

describe('the three named operators are real in the model', () => {
  it('presence is run by a Guardian, overseen by a Presence Manager', () => {
    expect(CARE_MODULES.presence.operatedBy).toEqual(expect.arrayContaining(['guardian', 'presence_manager']))
  })
  it('the hospital module is run by a Hospital Companion', () => {
    expect(CARE_MODULES.hospital.operatedBy).toContain('hospital_companion')
  })
  it('every module carries a family-facing name and an honest summary', () => {
    for (const id of CARE_MODULE_ORDER) {
      expect(moduleById(id).name.length).toBeGreaterThan(0)
      expect(moduleById(id).summary.length).toBeGreaterThan(0)
    }
  })
})
