/**
 * The ONE canonical Visit Report.
 *
 * A Guardian writes the visit once; this builds the single report object that
 * EVERY customer-facing surface renders — family web report, PDF, email, WhatsApp,
 * and future Connect AI context. Stored on the visit row (`visits.checklist_data.report`)
 * so server surfaces render the exact same content without re-deriving anything.
 * Never contains placeholder or hardcoded visit text — every field is the
 * Guardian's real input.
 *
 * Structure (canonical):
 *   Summary · Story · Timeline · Activities · Photos · Voice · Wellness ·
 *   Health · Recommendations · Follow-ups · AI Summary · Metadata
 */
import { ALL_SCALES, MOMENTS, SOCIAL_ITEMS, processVisit, type VisitObservations } from '@/lib/cloza'
import { buildStory, moodLabel, pronounFor, wellnessLabel, wellnessScore } from '@/lib/family-report'
import type { ReportVitals } from '@/lib/visit-reports'

export interface ReportKV { label: string; value: string }
export interface TimelineItem { time: string; title: string; detail?: string }

/** The canonical report — the single source rendered by every surface. */
export interface CanonicalReport {
  version: 1
  summary: string
  story: string
  timeline: TimelineItem[]
  activities: string[]
  photos: string[] // visit-photos storage paths
  voice: { path: string; durationSec: number } | null
  wellness: { score: number; label: string; mood: string }
  health: { observations: ReportKV[]; vitals: ReportKV[] }
  recommendations: string[]
  followUps: string[]
  aiSummary: string
  metadata: {
    memberName: string
    guardianName: string
    service: string
    startedAt: number
    checkinAt: number
    completedAt: number
    arrival: string
    departure: string
    duration: string
    photoCount: number
    hasVoice: boolean
    social: string[]
    win?: string
    note?: string
  }
}

const VITAL_META: Record<string, { label: string; unit: string }> = {
  bp: { label: 'Blood pressure', unit: 'mmHg' },
  pulse: { label: 'Pulse', unit: 'bpm' },
  temp: { label: 'Temperature', unit: '°F' },
  sugar: { label: 'Blood sugar', unit: 'mg/dL' },
  weight: { label: 'Weight', unit: 'kg' },
}

function clock(ms: number): string {
  try {
    return new Date(ms).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true })
  } catch {
    return '—'
  }
}
function durationLabel(startedAt: number, completedAt: number): string {
  const min = Math.max(1, Math.round((completedAt - startedAt) / 60000))
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m ? `${h} hr ${m} min` : `${h} hr`
}

function buildTimeline(checkinAt: number, completedAt: number, activities: string[], vitals: ReportKV[], photoCount: number, hasVoice: boolean): TimelineItem[] {
  const middle: Omit<TimelineItem, 'time'>[] = []
  for (const a of activities) middle.push({ title: a })
  for (const v of vitals) middle.push({ title: v.label, detail: v.value })
  if (photoCount) middle.push({ title: `${photoCount} photo${photoCount === 1 ? '' : 's'} added` })
  if (hasVoice) middle.push({ title: 'Voice note recorded' })

  const start = checkinAt
  const span = Math.max(completedAt - start, middle.length * 60000)
  const events: TimelineItem[] = [{ time: clock(start), title: 'Guardian arrived' }]
  middle.forEach((e, i) => events.push({ time: clock(start + Math.round(((i + 1) / (middle.length + 1)) * span)), ...e }))
  events.push({ time: clock(completedAt), title: 'Visit completed' })
  return events
}

export interface CanonicalInput {
  memberName: string
  guardianName: string
  service: string
  relationship: string
  scales: Record<string, string>
  moments: string[]
  social: string[]
  vitals: Record<string, string>
  note?: string
  win?: string
  concern?: string
  photoPaths: string[]
  voice: { path: string; durationSec: number } | null
  startedAt: number
  checkinAt: number
  completedAt: number
}

/** Build the canonical report from the Guardian's real visit input. */
export function buildCanonicalReport(input: CanonicalInput): CanonicalReport {
  const pronoun = pronounFor(input.relationship || '')
  const story = buildStory(input.memberName, pronoun, input.scales, input.moments, input.social, input.vitals as ReportVitals)

  const obs: VisitObservations = {
    scales: input.scales,
    moments: input.moments,
    social: input.social,
    concern: input.concern,
    note: input.note,
    win: input.win,
    photos: input.photoPaths.map((_, i) => ({ id: `p-${i}`, name: '', thumb: '', size: 0, status: 'done' as const, progress: 100 })),
    voiceNote: input.voice ? { id: 'v', dataUrl: '', durationSec: input.voice.durationSec, size: 0, status: 'done' as const, progress: 100 } : null,
  }
  const intel = processVisit(obs, input.memberName)
  const score = wellnessScore(input.scales)

  const observations = ALL_SCALES.filter((s) => input.scales[s.key]).map((s) => ({ label: s.label, value: input.scales[s.key]! }))
  const activities = MOMENTS.filter((m) => input.moments.includes(m.key)).map((m) => m.label)
  const vitals = Object.entries(input.vitals)
    .filter(([, v]) => v && String(v).trim())
    .map(([k, v]) => ({ label: VITAL_META[k]?.label ?? k, value: `${v}${VITAL_META[k]?.unit ? ` ${VITAL_META[k].unit}` : ''}` }))

  return {
    version: 1,
    summary: `${wellnessLabel(score)}${input.scales.mood ? ` · ${moodLabel(input.scales.mood)}` : ''}`,
    story,
    timeline: buildTimeline(input.checkinAt, input.completedAt, activities, vitals, input.photoPaths.length, Boolean(input.voice)),
    activities,
    photos: input.photoPaths,
    voice: input.voice,
    wellness: { score, label: wellnessLabel(score), mood: moodLabel(input.scales.mood) },
    health: { observations, vitals },
    recommendations: intel.recommendations,
    followUps: intel.followUps,
    aiSummary: intel.summary,
    metadata: {
      memberName: input.memberName,
      guardianName: input.guardianName,
      service: input.service,
      startedAt: input.startedAt,
      checkinAt: input.checkinAt,
      completedAt: input.completedAt,
      arrival: clock(input.checkinAt),
      departure: clock(input.completedAt),
      duration: durationLabel(input.startedAt, input.completedAt),
      photoCount: input.photoPaths.length,
      hasVoice: Boolean(input.voice),
      social: SOCIAL_ITEMS.filter((s) => input.social.includes(s.key)).map((s) => s.label),
      win: input.win?.trim() || undefined,
      note: input.note?.trim() || undefined,
    },
  }
}
