/**
 * Phase 4 gate — LocaleService.
 *
 * India renders byte-identically to the hand-rolled `toLocaleXString('en-IN', …)` it
 * replaces. Other locales format the SAME instant their own way — that's the point.
 */
import { describe, it, expect } from 'vitest'
import { formatTime, formatDate, formatNumber } from './locale'

const D = new Date('2026-07-18T13:56:00+05:30')

describe('India is byte-identical to the en-IN it replaced', () => {
  const timeOpts: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit', hour12: true }
  const dateOpts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }

  it('time matches toLocaleTimeString("en-IN", …) exactly', () => {
    expect(formatTime(D, 'IN', timeOpts)).toBe(D.toLocaleTimeString('en-IN', timeOpts))
  })
  it('date matches toLocaleDateString("en-IN", …) exactly', () => {
    expect(formatDate(D, 'IN', dateOpts)).toBe(D.toLocaleDateString('en-IN', dateOpts))
  })
  it('number grouping matches en-IN', () => {
    expect(formatNumber(100000, 'IN')).toBe((100000).toLocaleString('en-IN')) // '1,00,000'
  })
})

describe('locale-aware: the same instant, formatted per region', () => {
  const dateOpts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long' }
  it('German writes the month differently from English', () => {
    expect(formatDate(D, 'DE', dateOpts)).toMatch(/Juli/)
    expect(formatDate(D, 'GB', dateOpts)).toMatch(/July/)
  })
  it('an unknown region falls back coherently, never a crash', () => {
    expect(typeof formatDate(D, 'atlantis', dateOpts)).toBe('string')
  })
})

describe('timezone is caller-controlled (default = viewer device)', () => {
  it('no timeZone opt → uses the runtime default, as before (India-identical path)', () => {
    // Same call shape space.ts uses; must equal the raw call it replaced.
    expect(formatTime(D, 'IN', { hour: 'numeric', minute: '2-digit', hour12: true }))
      .toBe(D.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true }))
  })
})
