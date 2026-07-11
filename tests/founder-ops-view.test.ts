// Founder ops view logic — status derivation, filters, search, export must be
// correct: this is what tells the founder who to call next.
//
// Run: node --test tests/founder-ops-view.test.ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  registrantStatus,
  matchesFilter,
  matchesSearch,
  toCSV,
  phoneList,
  whatsappList,
  planLabel,
  type RegistrantView,
} from '../closeeye-next/lib/founder-ops-view.ts'

const NOW = '2026-07-11T12:00:00+05:30'

const base: RegistrantView = {
  fullName: 'X', email: null, phone: null, serviceArea: 'Hyderabad', relationship: null,
  planId: 'companion', subStatus: 'created', ref: null, registeredAt: NOW, followedUp: false, followedUpAt: null,
}
const mk = (o: Partial<RegistrantView>): RegistrantView => ({ ...base, ...o })

test('registrantStatus: activated > waiting(contacted) > new(today) > follow_up(older)', () => {
  assert.equal(registrantStatus(mk({ subStatus: 'active' }), NOW), 'activated')
  assert.equal(registrantStatus(mk({ followedUp: true }), NOW), 'waiting')
  assert.equal(registrantStatus(mk({ registeredAt: NOW }), NOW), 'new')
  assert.equal(registrantStatus(mk({ registeredAt: '2026-07-08T09:00:00+05:30' }), NOW), 'follow_up')
})

test('matchesFilter: date windows + plan + city + follow-up + activated', () => {
  const today = mk({ registeredAt: NOW })
  const yest = mk({ registeredAt: '2026-07-10T09:00:00+05:30' })
  const old = mk({ registeredAt: '2026-07-03T09:00:00+05:30' }) // 8 days ago
  assert.equal(matchesFilter(today, 'today', NOW), true)
  assert.equal(matchesFilter(yest, 'today', NOW), false)
  assert.equal(matchesFilter(yest, 'yesterday', NOW), true)
  assert.equal(matchesFilter(yest, 'week', NOW), true)
  assert.equal(matchesFilter(old, 'week', NOW), false)
  assert.equal(matchesFilter(mk({ planId: 'trust' }), 'care', NOW), true)
  assert.equal(matchesFilter(mk({ planId: 'companion' }), 'connect', NOW), true)
  assert.equal(matchesFilter(mk({ serviceArea: 'Hyderabad' }), 'hyderabad', NOW), true)
  assert.equal(matchesFilter(today, 'follow_up', NOW), true) // new + not contacted counts as "to call"
  assert.equal(matchesFilter(mk({ followedUp: true }), 'follow_up', NOW), false)
  assert.equal(matchesFilter(mk({ subStatus: 'active' }), 'activated', NOW), true)
})

test('matchesSearch: name/email/phone/ref/city, case-insensitive; empty matches all', () => {
  const r = mk({ fullName: 'Ravi Kumar', email: 'ravi@x.com', phone: '+91 90000', ref: 'hyd-ravi', serviceArea: 'Hyderabad' })
  assert.equal(matchesSearch(r, 'ravi'), true)
  assert.equal(matchesSearch(r, '90000'), true)
  assert.equal(matchesSearch(r, 'HYD-RAVI'), true)
  assert.equal(matchesSearch(r, 'hyder'), true)
  assert.equal(matchesSearch(r, 'zzz'), false)
  assert.equal(matchesSearch(r, ''), true)
})

test('export: CSV escapes commas; phone + whatsapp lists skip missing numbers', () => {
  const rows = [
    mk({ fullName: 'Ravi, K', phone: '+919000000000', email: 'r@x.com', planId: 'trust', registeredAt: NOW }),
    mk({ fullName: 'Asha', phone: null, planId: 'companion' }),
  ]
  const lines = toCSV(rows, NOW).split('\n')
  assert.equal(lines[0], 'Name,Mobile,Email,City,Registering for,Plan,Status,Registered,Referral,Last follow-up')
  assert.match(lines[1]!, /^"Ravi, K",\+919000000000,r@x\.com,Hyderabad,,Care,New,/)
  assert.equal(planLabel('trust'), 'Care')
  assert.equal(phoneList(rows), '+919000000000')
  assert.equal(whatsappList(rows), 'Ravi, K +919000000000')
})
