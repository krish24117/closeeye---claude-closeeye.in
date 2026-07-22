import { describe, it, expect } from 'vitest'
import { sanitize } from './analytics'

// Privacy guarantee (founder requirement): analytics may carry only non-PII product signals.
// The sanitizer is the deterministic gate — verified here so a careless call site can never leak
// a name, email, phone, address, question text, or health content to PostHog.

describe('analytics sanitize — no PII ever leaves', () => {
  it('drops PII / sensitive keys', () => {
    const out = sanitize({
      full_name: 'Lakshmi', name: 'Anita', email: 'a@b.com', phone: '+91999',
      address: 'Hyderabad', question: 'how is my mother', text: 'she is unwell',
      body: 'symptoms', content: 'x', note: 'private', city: 'Hyderabad', dob: '1950',
      token: 'secret', mobile: '999',
    })
    expect(Object.keys(out)).toHaveLength(0)
  })

  it('keeps safe product signals as scalars', () => {
    const out = sanitize({ relationship: 'Parent', kind: 'answer', grounded: true, items: 3 })
    expect(out).toEqual({ relationship: 'Parent', kind: 'answer', grounded: true, items: 3 })
  })

  it('truncates long strings and drops non-scalars', () => {
    const out = sanitize({ relationship: 'x'.repeat(200), weird: ({ a: 1 } as unknown) as string })
    expect((out.relationship as string).length).toBe(64)
    expect('weird' in out).toBe(false)
  })
})
