/**
 * Profile completeness — one honest measure of how well Close Eye knows a person.
 *
 * It counts only fields that already exist on the real schema (loved_ones + the health
 * slice of elder_profiles), each weighted equally. Address + phone are deliberately in the
 * set: they are what turn on Close Eye Care (a Guardian can't reach a door with only a
 * city). Nothing here writes — it reads structured columns the family already owns and
 * turns them into a percentage the People page can show and the profile form can fill.
 */
import { supabase } from '@/lib/supabase'
import type { LovedOne } from '@/lib/db/types'

const filled = (v?: string | null): boolean => !!(v && v.trim())

/** The health fields that count toward completeness (kept minimal + batchable). */
export interface HealthLite {
  medical_conditions: string
  allergies: string
  current_medications: string[]
}
export const EMPTY_HEALTH: HealthLite = { medical_conditions: '', allergies: '', current_medications: [] }

export interface Completeness {
  filled: number
  total: number
  pct: number
  /** Human labels for what's still missing — for gentle nudges. */
  missing: string[]
}

/** The ten things that make a profile complete enough to understand and to act on. */
export function computeCompleteness(lo: Pick<LovedOne,
  'relationship' | 'age' | 'city' | 'address' | 'phone_number' | 'emergency_contact_name' | 'emergency_contact_phone' | 'doctor_name'>,
  h: HealthLite): Completeness {
  const checks: [string, boolean][] = [
    ['Relationship', filled(lo.relationship)],
    ['Age', lo.age != null],
    ['City', filled(lo.city)],
    ['Address', filled(lo.address)],
    ['Phone', filled(lo.phone_number)],
    ['Health', filled(h.medical_conditions)],
    ['Allergies', filled(h.allergies)],
    ['Medicines', h.current_medications.length > 0],
    ['Someone nearby', filled(lo.emergency_contact_name) && filled(lo.emergency_contact_phone)],
    ['Doctor', filled(lo.doctor_name)],
  ]
  const done = checks.filter(([, ok]) => ok).length
  const total = checks.length
  return {
    filled: done,
    total,
    pct: Math.round((done / total) * 100),
    missing: checks.filter(([, ok]) => !ok).map(([label]) => label),
  }
}

interface HealthRow {
  loved_one_id: string
  medical_conditions: string | null
  allergies: string | null
  current_medications: unknown
}

/** Batch-load the health slice for many people in one query (no N+1 on the People list). */
export async function fetchHealthLiteMap(ids: string[]): Promise<Record<string, HealthLite>> {
  const map: Record<string, HealthLite> = {}
  const clean = ids.filter(Boolean)
  if (!clean.length) return map
  const { data, error } = await supabase
    .from('elder_profiles')
    .select('loved_one_id, medical_conditions, allergies, current_medications')
    .in('loved_one_id', clean)
  if (error) return map // a failed health read must not break the roster — treat as "none yet"
  for (const r of (data ?? []) as HealthRow[]) {
    map[r.loved_one_id] = {
      medical_conditions: r.medical_conditions ?? '',
      allergies: r.allergies ?? '',
      current_medications: Array.isArray(r.current_medications) ? r.current_medications.map(String) : [],
    }
  }
  return map
}
