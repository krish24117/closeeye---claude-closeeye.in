/**
 * Phase 1 guardrail — Navigation Law 4: every notification opens inside the Workspace.
 *
 * A notification target must be a /space-rooted URL and must never point back into the
 * retiring /family tree. As new notification types appear, they inherit this by construction;
 * this test fails the moment a target escapes the Workspace.
 */
import { describe, it, expect } from 'vitest'
import { notificationTarget } from './notifications'

const TYPES = [
  'visit_completed', 'visit_booked', 'guardian_assigned', 'guardian_arrived',
  'booking_paid', 'membership_activated', 'query_response', 'system', 'unknown_future_type', '',
]

describe('every notification opens inside the Workspace (Nav Law 4)', () => {
  for (const type of TYPES) {
    it(`type "${type}" targets the Workspace`, () => {
      const t = notificationTarget(type)
      expect(t.startsWith('/space')).toBe(true)
      expect(t.startsWith('/family')).toBe(false)
    })
  }
})
