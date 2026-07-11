/**
 * Founder Program — pre-launch account journey (Phase 3), pure helpers.
 *
 * Kept dependency-free (no `@/` imports, no Date/Random) so the logic is unit
 * testable in isolation, exactly like lib/launch.ts. The React pages and the DB
 * layer import these; timestamps are passed IN so nothing here is impure.
 */

export const FOUNDER_SERVICE_CITY = 'Hyderabad'

export type ServiceArea = 'hyderabad' | 'outside'

const blank = (v?: string | null): boolean => !((v ?? '').trim().length)

/** A trimmed value or null — for optional text columns. */
export function tidy(v?: string | null): string | null {
  const t = (v ?? '').trim()
  return t.length ? t : null
}

export interface WaitlistInput {
  name: string
  email?: string
  phone?: string
  city: string
}

/**
 * Validate the outside-Hyderabad waitlist form: a name, a city, and at least one
 * way to reach the family. Returns a human message, or null when it's good to
 * submit. Losing a lead to a silently-rejected form is a real failure mode
 * (see the feedback-form blocker) — so the caller must block on this, not the DB.
 */
export function founderWaitlistError(input: WaitlistInput): string | null {
  if (blank(input.name)) return 'Please enter your name.'
  if (blank(input.city)) return 'Please tell us which city your loved one is in.'
  if (blank(input.email) && blank(input.phone)) return 'Add an email or a mobile number so we can reach you.'
  const email = (input.email ?? '').trim()
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'That email address doesn’t look right.'
  return null
}

/** Build the exact `waitlist` insert row (matches the waitlist-signup edge fn). */
export function waitlistRowFor(input: WaitlistInput): {
  full_name: string
  email: string | null
  whatsapp_number: string | null
  loved_one_city: string | null
  urgency: string
  support_needed: string
} {
  return {
    full_name: input.name.trim(),
    email: tidy(input.email),
    whatsapp_number: tidy(input.phone),
    loved_one_city: tidy(input.city),
    urgency: 'exploring',
    // Tag the lead by area so /admin/leads reads truthfully (a Hyderabad
    // hand-raiser is NOT an "outside Hyderabad" waitlist entry).
    support_needed:
      (input.city ?? '').trim().toLowerCase() === 'hyderabad'
        ? 'Founder Program — Hyderabad'
        : 'Founder Program — loved one outside Hyderabad',
  }
}

/**
 * Build the `profiles` patch that MARKS a family as a pre-launch Founder
 * registrant — the durable gate authority. `nowIso` is injected (caller passes
 * new Date().toISOString()) to keep this pure.
 */
export function founderProfilePatch(input: { ref?: string | null; nowIso: string; serviceArea?: string }): {
  founder_prelaunch: true
  founder_ref: string | null
  founder_registered_at: string
  founder_service_area: string
} {
  return {
    founder_prelaunch: true,
    founder_ref: tidy(input.ref),
    founder_registered_at: input.nowIso,
    founder_service_area: (input.serviceArea ?? FOUNDER_SERVICE_CITY).trim() || FOUNDER_SERVICE_CITY,
  }
}
