// B1 regression — the per-visit logistics the family enters must reach the
// Guardian: the booked visit address wins over the profile, and the arrival
// block lists the family's landmark / access / on-site contact.
//
// Run: node --test tests/guardian-visit-details.test.ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  resolveVisitAddress,
  visitLogisticsLines,
  safeMapLink,
} from '../closeeye-next/lib/db/guardian-visit-details.ts'

test('resolveVisitAddress: the booked visit address wins over the profile', () => {
  assert.equal(
    resolveVisitAddress('12 MG Road, Flat 3B, Bengaluru 560001', 'Old profile address', 'Bengaluru'),
    '12 MG Road, Flat 3B, Bengaluru 560001',
  )
})

test('resolveVisitAddress: falls back to profile address, then city (regression for legacy bookings)', () => {
  assert.equal(resolveVisitAddress(null, '  221B Baker Street  ', 'London'), '221B Baker Street')
  assert.equal(resolveVisitAddress('   ', '', 'Hyderabad'), 'Hyderabad')
  assert.equal(resolveVisitAddress(null, null, null), '')
})

test('resolveVisitAddress: the exact bug — no booked address means the Guardian only got the city', () => {
  // Before B1 the Guardian was dispatched to the profile city; now, when the
  // family entered a full address for the visit, that is what is used.
  const profileOnlyCity = resolveVisitAddress(null, null, 'Pune')
  const withBookedAddress = resolveVisitAddress('Kothrud, Lane 5, Pune 411038', null, 'Pune')
  assert.equal(profileOnlyCity, 'Pune')
  assert.notEqual(withBookedAddress, 'Pune')
  assert.match(withBookedAddress, /Lane 5/)
})

test('visitLogisticsLines: surfaces the details the Guardian used to never receive', () => {
  const lines = visitLogisticsLines({
    timeWindow: 'Morning (8am – 12pm)',
    landmark: 'Opposite the temple',
    accessInstructions: '3rd floor, no lift. Ring bell twice.',
    contactName: 'Ramesh',
    contactPhone: '9876543210',
  })
  assert.deepEqual(lines, [
    'Preferred time: Morning (8am – 12pm)',
    'Landmark: Opposite the temple',
    'Access: 3rd floor, no lift. Ring bell twice.',
    'On-site contact: Ramesh · 9876543210',
  ])
})

test('visitLogisticsLines: empty/whitespace fields are dropped (no blank rows)', () => {
  assert.deepEqual(visitLogisticsLines({}), [])
  assert.deepEqual(visitLogisticsLines({ landmark: '   ', contactName: '', contactPhone: null }), [])
  assert.deepEqual(visitLogisticsLines({ contactName: 'Asha' }), ['On-site contact: Asha'])
})

test('safeMapLink: only a real http(s) URL becomes a link', () => {
  assert.equal(safeMapLink('https://maps.app.goo.gl/abc'), 'https://maps.app.goo.gl/abc')
  assert.equal(safeMapLink('http://osm.org/x'), 'http://osm.org/x')
  assert.equal(safeMapLink('javascript:alert(1)'), null)
  assert.equal(safeMapLink('not a url'), null)
  assert.equal(safeMapLink(''), null)
  assert.equal(safeMapLink(null), null)
})
