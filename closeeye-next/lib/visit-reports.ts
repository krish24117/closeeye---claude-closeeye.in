/**
 * Shared visit reports — the bridge from the Guardian App to Family Space.
 *
 * When a Guardian completes a visit, the full structured report (a warm story,
 * mood, the observation scales, moments, vitals, photos and a voice note) is written
 * here, keyed by the loved one's name. Family Space reads it and turns it into a
 * Human Presence Experience — never raw scores. This localStorage store stands in
 * for the shared backend; swap it for the existing Supabase visit tables and both
 * apps keep working (see Product-Bible → Data).
 */

export interface ReportPhoto {
  id: string
  thumb: string // compressed JPEG data URL
}

export interface ReportVoice {
  dataUrl: string
  durationSec: number
}

export interface ReportVitals {
  bp?: string
  pulse?: string
  temp?: string
  sugar?: string
  weight?: string
}

export type Pronoun = 'he' | 'she' | 'they'

export interface SharedVisitReport {
  key: string
  memberName: string
  guardianName: string
  service: string
  pronoun: Pronoun
  summary: string // one line (existing bridge)
  story: string // the rich, human hero story
  mood?: string
  wellnessScore: number // 0–100, gentle, family-facing only (Guardians never see it)
  scales: Record<string, string>
  moments: string[]
  social: string[]
  vitals: ReportVitals
  note?: string
  win?: string
  photos: ReportPhoto[]
  voice: ReportVoice | null
  startedAt: number
  checkinAt: number
  completedAt: number
  durationSec: number
}

const STORAGE_KEY = 'ce_visit_reports'

/** Join key between a Guardian visit and a Family member — their name. */
export function reportKey(name: string): string {
  return name.trim().toLowerCase()
}

function readAll(): Record<string, SharedVisitReport> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Record<string, SharedVisitReport>) : {}
  } catch {
    return {}
  }
}

export function saveReport(report: SharedVisitReport): void {
  if (typeof window === 'undefined') return
  try {
    const all = readAll()
    all[report.key] = report
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
  } catch {
    /* quota / private mode — the visit still completes; media just won't surface */
  }
}

export function getReport(key: string): SharedVisitReport | null {
  return readAll()[key] ?? null
}
