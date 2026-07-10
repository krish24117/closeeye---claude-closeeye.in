/**
 * B2 — pure view-state for the Health Profile page.
 *
 * The health form must NEVER open in an editable state after a FAILED load: a
 * blank form there is indistinguishable from "no profile yet", and saving it
 * full-row-upserts blanks over the loved one's saved allergies / medications /
 * conditions. This helper is the single decision the page renders from, and is
 * unit-tested to guarantee a load error can never resolve to `ready` (the only
 * phase that shows the editable form + Save button).
 *
 * Note: a loved one with NO profile yet is NOT an error — fetchElderProfile
 * returns an empty (but legitimately editable) form on success. Only a real
 * fetch failure sets loadError.
 */
export type HealthFormPhase = 'loading' | 'error' | 'ready'

export function healthFormPhase(input: {
  loadError: boolean
  memberResolved: boolean
  formLoaded: boolean
}): HealthFormPhase {
  if (input.loadError) return 'error' // a failed load is ALWAYS an error — never the form
  if (!input.memberResolved || !input.formLoaded) return 'loading'
  return 'ready'
}
