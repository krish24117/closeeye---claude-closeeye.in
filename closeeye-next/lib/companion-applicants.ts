/**
 * Companion applicants — stored separately from operational data (no admin
 * recruitment module in V1). localStorage stands in for the applicants table;
 * swap for a Supabase `companion_applicants` insert.
 */
export interface CompanionApplicant {
  id: string
  name: string
  phone: string
  city: string
  skills: string[]
  why: string
  createdAt: number
  status: 'applied'
}

const STORAGE_KEY = 'ce_companion_applicants'

function uid() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

export function addApplicant(data: Omit<CompanionApplicant, 'id' | 'createdAt' | 'status'>): CompanionApplicant {
  const applicant: CompanionApplicant = { ...data, id: uid(), createdAt: Date.now(), status: 'applied' }
  if (typeof window === 'undefined') return applicant
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const list: CompanionApplicant[] = raw ? JSON.parse(raw) : []
    localStorage.setItem(STORAGE_KEY, JSON.stringify([applicant, ...list]))
  } catch {
    /* quota / private mode */
  }
  return applicant
}
