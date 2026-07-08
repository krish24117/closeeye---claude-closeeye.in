import type { GuardianVisit } from '@/lib/guardian-data'

/**
 * Small helpers that read a visit and derive what the Guardian sees — kept out of
 * the components so the "Today's objective" and "requested readings" logic has one
 * home. When the backend lands, these become server-provided fields.
 */

/** Today's objective — a short, human list drawn from the visit brief. */
export function objectiveOf(v: GuardianVisit): string[] {
  const base = v.service.toLowerCase().includes('hospital')
    ? 'Stay close and reassuring through the appointment'
    : 'A calm, unhurried wellbeing visit'
  const items = [base, ...v.familyInstructions]
  // de-dupe while preserving order, cap to keep it glanceable
  return Array.from(new Set(items)).slice(0, 5)
}

export type VitalKey = 'bp' | 'pulse' | 'temp' | 'sugar' | 'weight'

/** Which readings the family or physician actually asked for this visit. */
export function requestedVitals(v: GuardianVisit): VitalKey[] {
  const hay = [...v.medicalNotes, ...v.familyInstructions, v.specialNotes].join(' ').toLowerCase()
  const req: VitalKey[] = []
  if (/blood pressure|\bbp\b/.test(hay)) req.push('bp')
  if (/pulse|heart rate/.test(hay)) req.push('pulse')
  if (/temperature|fever/.test(hay)) req.push('temp')
  if (/sugar|diabet|glucose/.test(hay)) req.push('sugar')
  if (/weight/.test(hay)) req.push('weight')
  return req
}
