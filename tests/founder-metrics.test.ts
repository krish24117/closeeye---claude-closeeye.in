// Founder Activation Dashboard (Phase 4) — the numbers must be derived correctly
// from real rows: IST day bucketing, plan split, activation queue, and an honest
// (capped) conversion rate.
//
// Run: node --test tests/founder-metrics.test.ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  istDayKey,
  last7DayKeys,
  shortLabel,
  deriveFounderMetrics,
} from '../closeeye-next/lib/founder-metrics.ts'

test('istDayKey: buckets by the IST calendar day (not UTC)', () => {
  assert.equal(istDayKey('2026-07-11T10:00:00Z'), '2026-07-11') // 15:30 IST
  assert.equal(istDayKey('2026-07-11T20:00:00Z'), '2026-07-12') // 01:30 IST next day
  assert.equal(istDayKey('nonsense'), '')
})

test('last7DayKeys + shortLabel: 7 days ending today, oldest first', () => {
  const keys = last7DayKeys('2026-07-11T12:00:00+05:30')
  assert.equal(keys.length, 7)
  assert.equal(keys[0], '2026-07-05')
  assert.equal(keys[6], '2026-07-11')
  assert.equal(shortLabel('2026-07-11'), '11 Jul')
})

const NOW = '2026-07-11T12:00:00+05:30'

test('deriveFounderMetrics: totals, plan split, activation queue, daily, conversion', () => {
  const m = deriveFounderMetrics({
    registrations: [
      { service_area: 'Hyderabad', registered_at: '2026-07-11T09:00:00+05:30' }, // today
      { service_area: 'hyderabad', registered_at: '2026-07-11T20:00:00+05:30' }, // today (still IST 11th)
      { service_area: 'Hyderabad', registered_at: '2026-07-10T09:00:00+05:30' }, // yesterday
      { service_area: 'Bengaluru', registered_at: '2026-07-05T09:00:00+05:30' }, // 6 days ago, non-Hyd
    ],
    subs: [
      { plan_id: 'trust', status: 'created' },
      { plan_id: 'trust', status: 'active' },
      { plan_id: 'companion', status: 'created' },
    ],
    waitlist: 5,
    landingViews: 10,
    whatsappClicks: 4,
    nowIso: NOW,
  })

  assert.equal(m.totalRegistrations, 4)
  assert.equal(m.hyderabadFamilies, 3) // case-insensitive; Bengaluru excluded
  assert.equal(m.registrationsToday, 2)
  assert.equal(m.careSelected, 2)
  assert.equal(m.connectSelected, 1)
  assert.equal(m.activationQueue, 3) // total 4 − 1 activated
  assert.equal(m.careSharePct, 67) // 2 of 3 choices
  assert.equal(m.waitlist, 5)
  assert.equal(m.whatsappClicks, 4)
  assert.equal(m.landingViews, 10)
  assert.equal(m.conversionPct, 40) // 4 / 10

  assert.equal(m.daily.length, 7)
  assert.deepEqual(m.daily[0], { label: '5 Jul', value: 1 })
  assert.deepEqual(m.daily[5], { label: '10 Jul', value: 1 })
  assert.deepEqual(m.daily[6], { label: '11 Jul', value: 2 })
})

test('deriveFounderMetrics: empty → zeros; conversion/careShare null', () => {
  const m = deriveFounderMetrics({ registrations: [], subs: [], waitlist: 0, landingViews: 0, whatsappClicks: 0, nowIso: NOW })
  assert.equal(m.totalRegistrations, 0)
  assert.equal(m.activationQueue, 0)
  assert.equal(m.conversionPct, null)
  assert.equal(m.careSharePct, null)
  assert.equal(m.daily.length, 7)
  assert.equal(m.daily.every((d) => d.value === 0), true)
})

test('deriveFounderMetrics: conversion is capped at 100% (direct entries)', () => {
  const m = deriveFounderMetrics({
    registrations: [{ registered_at: NOW }, { registered_at: NOW }, { registered_at: NOW }],
    subs: [],
    waitlist: 0,
    landingViews: 1,
    whatsappClicks: 0,
    nowIso: NOW,
  })
  assert.equal(m.conversionPct, 100)
})
