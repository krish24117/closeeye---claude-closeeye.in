import { describe, it, expect } from 'vitest'
import { resolveSubject, type LovedOneRef } from './answer'
import type { Understanding } from './comprehension'

// The Memory Integrity resolution matrix (FAT-2 point 6), validated deterministically — no model call.
// A family should never feel Connect forgot who they are: "my mother/father/wife/son" must land on the
// right person, and specific relationships must win over generic ones.

const U = (who: string, relationship = ''): Understanding =>
  ({ subject: { who, relationship } } as unknown as Understanding)
const LO = (id: string, full_name: string, relationship: string | null): LovedOneRef => ({ id, full_name, relationship })

describe('resolveSubject — family-first relationship resolution', () => {
  it('single loved one → any personal reference resolves to them', () => {
    const fam = [LO('a', 'Lakshmi', 'Parent')]
    expect(resolveSubject(U('my mother', 'mother'), fam)?.id).toBe('a')
    expect(resolveSubject(U('my mom', 'mother'), fam)?.id).toBe('a')
    expect(resolveSubject(U('her', 'unknown'), fam)?.id).toBe('a')
  })

  it('specific relationship beats a generic "Parent" bridge', () => {
    const fam = [LO('mum', 'Lakshmi', 'Parent'), LO('dad', 'Ramesh', 'Father')]
    expect(resolveSubject(U('my father', 'father'), fam)?.id).toBe('dad')   // specific wins
    expect(resolveSubject(U('my mother', 'mother'), fam)?.id).toBe('mum')   // broad → the Parent
  })

  it('never resolves a gendered term to the opposite specific relationship', () => {
    const fam = [LO('dad', 'Ramesh', 'Father'), LO('mum', 'Priya', 'Mother')]
    expect(resolveSubject(U('my mother', 'mother'), fam)?.id).toBe('mum')
    expect(resolveSubject(U('my father', 'father'), fam)?.id).toBe('dad')
  })

  it('spouse — wife/husband/spouse all resolve to a stored Spouse', () => {
    const fam = [LO('s', 'Priya', 'Spouse')]
    expect(resolveSubject(U('my wife', 'wife'), fam)?.id).toBe('s')
    expect(resolveSubject(U('my husband', 'husband'), fam)?.id).toBe('s')
  })

  it('child — son/daughter resolve to the right one', () => {
    const fam = [LO('son', 'Arjun', 'Son'), LO('dtr', 'Meera', 'Daughter')]
    expect(resolveSubject(U('my son', 'son'), fam)?.id).toBe('son')
    expect(resolveSubject(U('my daughter', 'daughter'), fam)?.id).toBe('dtr')
  })

  it('a real name in the question resolves directly', () => {
    const fam = [LO('a', 'Lakshmi', 'Parent'), LO('b', 'Ramesh', 'Father')]
    expect(resolveSubject(U('Lakshmi', 'unknown'), fam)?.id).toBe('a')
  })

  it('no plausible match with several people → null (never a wrong guess)', () => {
    const fam = [LO('a', 'Lakshmi', 'Mother'), LO('b', 'Ramesh', 'Father')]
    expect(resolveSubject(U('my sister', 'sister'), fam)).toBeNull()
  })

  it('empty family → null', () => {
    expect(resolveSubject(U('my mother', 'mother'), [])).toBeNull()
  })
})
