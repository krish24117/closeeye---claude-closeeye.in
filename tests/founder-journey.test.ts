// Founder Program pre-launch journey (Phase 3) — pure helpers. The waitlist form
// must never let a lead through half-formed (name + city + a way to reach them),
// the waitlist row must match the real table shape, and the profile patch must
// stamp the durable founder marker correctly.
//
// Run: node --test tests/founder-journey.test.ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  founderWaitlistError,
  waitlistRowFor,
  founderProfilePatch,
  tidy,
  FOUNDER_SERVICE_CITY,
} from '../closeeye-next/lib/founder-journey.ts'

test('founderWaitlistError: accepts a complete form (email OR phone is enough)', () => {
  assert.equal(founderWaitlistError({ name: 'Asha', city: 'Chennai', email: 'a@b.com' }), null)
  assert.equal(founderWaitlistError({ name: 'Asha', city: 'Chennai', phone: '+91 90000 00000' }), null)
})

test('founderWaitlistError: blocks missing name / city / all contact / bad email', () => {
  assert.match(founderWaitlistError({ name: '  ', city: 'Pune', email: 'a@b.com' })!, /name/i)
  assert.match(founderWaitlistError({ name: 'Ravi', city: '', email: 'a@b.com' })!, /city/i)
  assert.match(founderWaitlistError({ name: 'Ravi', city: 'Pune' })!, /email or a mobile/i)
  assert.match(founderWaitlistError({ name: 'Ravi', city: 'Pune', email: 'not-an-email' })!, /email/i)
})

test('waitlistRowFor: trims and maps to the real waitlist columns', () => {
  const row = waitlistRowFor({ name: '  Ravi Kumar ', city: ' Pune ', email: ' r@k.com ', phone: ' 99 ' })
  assert.deepEqual(row, {
    full_name: 'Ravi Kumar',
    email: 'r@k.com',
    whatsapp_number: '99',
    loved_one_city: 'Pune',
    urgency: 'exploring',
    support_needed: 'Founder Program — loved one outside Hyderabad',
  })
})

test('waitlistRowFor: empty optional contact becomes null (never empty string)', () => {
  const row = waitlistRowFor({ name: 'Ravi', city: 'Pune', email: 'r@k.com' })
  assert.equal(row.whatsapp_number, null)
  assert.equal(row.email, 'r@k.com')
})

test('founderProfilePatch: stamps the durable marker; ref tidied; area defaults to Hyderabad', () => {
  const patch = founderProfilePatch({ ref: '  hyd-krishna ', nowIso: '2026-07-11T10:00:00.000Z' })
  assert.equal(patch.founder_prelaunch, true)
  assert.equal(patch.founder_ref, 'hyd-krishna')
  assert.equal(patch.founder_registered_at, '2026-07-11T10:00:00.000Z')
  assert.equal(patch.founder_service_area, FOUNDER_SERVICE_CITY)
})

test('founderProfilePatch: empty ref → null; explicit service area respected', () => {
  const patch = founderProfilePatch({ ref: '', nowIso: '2026-07-11T10:00:00.000Z', serviceArea: 'Secunderabad' })
  assert.equal(patch.founder_ref, null)
  assert.equal(patch.founder_service_area, 'Secunderabad')
})

test('tidy: trims; empty → null', () => {
  assert.equal(tidy('  x '), 'x')
  assert.equal(tidy('   '), null)
  assert.equal(tidy(undefined), null)
})
