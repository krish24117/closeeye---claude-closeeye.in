/**
 * Family requests — the family prepares gentle asks before the next visit; the
 * Guardian receives them in the Guardian App (Module 4) and the Presence Manager
 * can review. localStorage stands in for the shared backend (swap for the Supabase
 * `visit_requests` table). Keyed by the loved one's name, same join key as reports.
 */

export interface FamilyRequest {
  id: string
  memberName: string
  text: string
  status: 'pending' | 'seen'
  createdAt: number
}

const STORAGE_KEY = 'ce_family_requests'

function uid(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

function readAll(): FamilyRequest[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as FamilyRequest[]) : []
  } catch {
    return []
  }
}

function writeAll(list: FamilyRequest[]): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  } catch {
    /* quota / private mode */
  }
}

function norm(name: string) {
  return name.trim().toLowerCase()
}

export function listRequests(memberName?: string): FamilyRequest[] {
  const all = readAll().sort((a, b) => b.createdAt - a.createdAt)
  return memberName ? all.filter((r) => norm(r.memberName) === norm(memberName)) : all
}

export function addRequest(memberName: string, text: string): FamilyRequest {
  const req: FamilyRequest = { id: uid(), memberName, text: text.trim(), status: 'pending', createdAt: Date.now() }
  writeAll([req, ...readAll()])
  return req
}

export function removeRequest(id: string): void {
  writeAll(readAll().filter((r) => r.id !== id))
}

export function markRequestsSeen(memberName: string): void {
  writeAll(readAll().map((r) => (norm(r.memberName) === norm(memberName) ? { ...r, status: 'seen' } : r)))
}
