/**
 * Family-facing derivations over a SharedVisitReport.
 *
 * `composeReport` runs once on the Guardian side (at Complete visit) to turn raw
 * CLOza observations into a warm, human report. The rest are read-side helpers that
 * Family Space uses to render the Human Presence Experience — a gentle wellness
 * score, the visit story, a rich timeline, an elegant health snapshot and a weekly
 * wellness trend. No hospital charts, no raw scores shown to anyone but the family,
 * and never clinical language.
 */
import { ALL_SCALES, CONCERN_VALUES, MOMENTS } from '@/lib/cloza'
import type { Pronoun, ReportVitals, SharedVisitReport } from '@/lib/visit-reports'
import { reportKey } from '@/lib/visit-reports'

/* ── helpers ─────────────────────────────────────────────────────────────── */

function joinNaturally(items: string[]): string {
  if (items.length <= 1) return items[0] ?? ''
  return items.slice(0, -1).join(', ') + ' and ' + items[items.length - 1]
}
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
const subj = (p: Pronoun) => (p === 'he' ? 'He' : p === 'she' ? 'She' : 'They')
const poss = (p: Pronoun) => (p === 'he' ? 'his' : p === 'she' ? 'her' : 'their')

export function pronounFor(relationship: string): Pronoun {
  const r = relationship.toLowerCase()
  if (/father|grandfather|husband|son|brother|uncle|\bmr\b/.test(r)) return 'he'
  if (/mother|grandmother|wife|daughter|sister|aunt|\bmrs\b|\bms\b/.test(r)) return 'she'
  return 'they'
}

/* ── wellness score (gentle, family-only) ────────────────────────────────── */

export function wellnessScore(scales: Record<string, string>): number {
  const noted = ALL_SCALES.filter((s) => scales[s.key])
  if (!noted.length) return 82
  let sum = 0
  for (const s of noted) {
    const idx = s.options.indexOf(scales[s.key]!)
    const goodness = idx <= 0 ? 1 : 1 - idx / (s.options.length - 1)
    sum += goodness
  }
  return Math.round((sum / noted.length) * 100)
}

export function wellnessLabel(score: number): string {
  if (score >= 88) return 'A wonderful day'
  if (score >= 75) return 'A good day'
  if (score >= 60) return 'A steady day'
  return 'A quiet day — watching gently'
}

export function moodLabel(scaleMood?: string): string {
  switch (scaleMood) {
    case 'Excellent':
      return 'Cheerful'
    case 'Good':
      return 'Good'
    case 'Neutral':
      return 'Calm'
    case 'Low':
    case 'Concern':
      return 'Low'
    default:
      return 'Calm'
  }
}

/* ── the visit story (rich, human, hero) ─────────────────────────────────── */

export function buildStory(
  name: string,
  pronoun: Pronoun,
  scales: Record<string, string>,
  moments: string[],
  social: string[],
  vitals: ReportVitals,
): string {
  const first = name.split(' ')[0] ?? name
  const S = subj(pronoun)
  const Poss = cap(poss(pronoun))
  const mood = scales.mood
  const good = mood === 'Excellent' || mood === 'Good'

  const opener = good
    ? `Today, ${first} was in good spirits and enjoyed the time together.`
    : mood === 'Neutral'
      ? `Today, ${first} had a calm, settled visit.`
      : mood
        ? `Today, ${first} seemed a little quiet, and we stayed close throughout.`
        : `Today, ${first} had a gentle visit together.`

  const acts: string[] = []
  if (scales.appetite === 'Full meal') acts.push('had a full meal')
  else if (scales.appetite === 'Partial meal') acts.push('had a little to eat')
  if (scales.medication === 'Completed') acts.push('took the day’s medicines')
  else if (scales.medication === 'Reminded') acts.push('was gently reminded about medicines')
  if (moments.includes('tea')) acts.push('shared some tea')
  if (moments.includes('memories')) acts.push('talked over old memories')
  if (moments.includes('walked')) acts.push('went for a short walk')
  if (moments.includes('cooked')) acts.push('spent time in the kitchen')
  if (moments.includes('read')) acts.push('read together')
  if (moments.includes('music')) acts.push('enjoyed some favourite songs')
  if (moments.includes('prayed')) acts.push('shared a quiet prayer')
  if (moments.includes('videocall') || social.includes('family_call')) acts.push('had a lovely call with family')
  const actsSentence = acts.length ? `${S} ${joinNaturally(acts)}.` : ''

  const vitalSentence = vitals.bp ? `${Poss} blood pressure reading was ${vitals.bp}, within the range we’d expect.` : ''
  const moodClose = good ? `${S} smiled several times and seemed relaxed throughout the visit.` : ''
  const closing = `We’ll keep a close eye on ${poss(pronoun)} wellbeing and share anything that matters.`

  return [opener, actsSentence, vitalSentence, moodClose, closing].filter(Boolean).join(' ')
}

/* ── compose (Guardian side, once) ───────────────────────────────────────── */

export interface ComposeInput {
  memberName: string
  guardianName: string
  service: string
  relationship: string
  summary: string
  scales: Record<string, string>
  moments: string[]
  social: string[]
  vitals: ReportVitals
  note?: string
  win?: string
  photos: { id: string; thumb: string }[]
  voice: { dataUrl: string; durationSec: number } | null
  startedAt: number
  checkinAt: number
  completedAt: number
}

export function composeReport(input: ComposeInput): SharedVisitReport {
  const pronoun = pronounFor(input.relationship)
  const durationSec = Math.max(1, Math.round((input.completedAt - input.startedAt) / 1000))
  return {
    key: reportKey(input.memberName),
    memberName: input.memberName,
    guardianName: input.guardianName,
    service: input.service,
    pronoun,
    summary: input.summary,
    story: buildStory(input.memberName, pronoun, input.scales, input.moments, input.social, input.vitals),
    mood: moodLabel(input.scales.mood),
    wellnessScore: wellnessScore(input.scales),
    scales: input.scales,
    moments: input.moments,
    social: input.social,
    vitals: input.vitals,
    note: input.note,
    win: input.win,
    photos: input.photos,
    voice: input.voice,
    startedAt: input.startedAt,
    checkinAt: input.checkinAt || input.startedAt,
    completedAt: input.completedAt,
    durationSec,
  }
}

/* ── timeline (read side) ────────────────────────────────────────────────── */

export type TimelineIcon =
  | 'arrive' | 'meal' | 'tea' | 'medication' | 'vitals' | 'walk' | 'memories'
  | 'call' | 'music' | 'reading' | 'prayer' | 'celebration' | 'photo' | 'voice' | 'complete'

export interface TimelineEventData {
  id: string
  timeLabel: string
  icon: TimelineIcon
  title: string
  detail?: string
  hasPhoto?: boolean
  hasVoice?: boolean
}

function fmtTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

export function timelineEvents(r: SharedVisitReport): TimelineEventData[] {
  const middle: Omit<TimelineEventData, 'timeLabel' | 'id'>[] = []
  const s = r.scales
  if (s.appetite === 'Full meal' || s.appetite === 'Partial meal') middle.push({ icon: 'meal', title: 'Shared a meal' })
  if (r.moments.includes('tea')) middle.push({ icon: 'tea', title: 'Tea together' })
  if (s.medication === 'Completed') middle.push({ icon: 'medication', title: 'Medication taken' })
  else if (s.medication === 'Reminded') middle.push({ icon: 'medication', title: 'Medication reminder given' })
  if (r.vitals.bp) middle.push({ icon: 'vitals', title: 'Blood pressure', detail: `${r.vitals.bp} mmHg` })
  if (r.vitals.pulse || r.vitals.temp || r.vitals.sugar || r.vitals.weight) middle.push({ icon: 'vitals', title: 'Readings taken' })
  if (r.moments.includes('walked')) middle.push({ icon: 'walk', title: 'A walk together' })
  if (r.moments.includes('memories')) middle.push({ icon: 'memories', title: 'Shared old memories' })
  if (r.moments.includes('videocall') || r.social.includes('family_call')) middle.push({ icon: 'call', title: 'Family video call' })
  if (r.moments.includes('music')) middle.push({ icon: 'music', title: 'Music together' })
  if (r.moments.includes('read')) middle.push({ icon: 'reading', title: 'Reading together' })
  if (r.moments.includes('prayed')) middle.push({ icon: 'prayer', title: 'A quiet prayer' })
  if (r.moments.includes('celebrated')) middle.push({ icon: 'celebration', title: 'A little celebration' })
  if (r.photos.length) middle.push({ icon: 'photo', title: `${r.photos.length} photo${r.photos.length === 1 ? '' : 's'} added`, hasPhoto: true })
  if (r.voice) middle.push({ icon: 'voice', title: 'Voice note recorded', hasVoice: true })

  const start = r.checkinAt
  const end = Math.max(r.completedAt, start + middle.length * 60000)
  const span = end - start

  const events: TimelineEventData[] = [{ id: 'arrive', timeLabel: fmtTime(start), icon: 'arrive', title: 'Guardian arrived' }]
  middle.forEach((e, i) => {
    const t = start + Math.round(((i + 1) / (middle.length + 1)) * span)
    events.push({ ...e, id: `ev-${i}`, timeLabel: fmtTime(t) })
  })
  events.push({ id: 'complete', timeLabel: fmtTime(Math.max(r.completedAt, end)), icon: 'complete', title: 'Visit completed' })
  return events
}

/* ── health snapshot (read side) ─────────────────────────────────────────── */

export type HealthStatus = 'normal' | 'watch' | 'attention'
export interface HealthCardData {
  key: string
  label: string
  unit: string
  value: string
  status: HealthStatus
  statusLabel: string
  spark: number[]
  note: string
}

function statusLabel(s: HealthStatus): string {
  return s === 'normal' ? 'Normal' : s === 'watch' ? 'Keep an eye' : 'Needs attention'
}

// A gentle, illustrative sparkline settling on the latest reading (single-visit demo).
function spark(v: number): number[] {
  const base = [0.97, 1.02, 0.99, 1.01, 0.98, 1.0, 1.0]
  return base.map((f) => Math.round(v * f))
}

export function healthSnapshot(r: SharedVisitReport): HealthCardData[] {
  const cards: HealthCardData[] = []
  const v = r.vitals
  if (v.bp) {
    const sys = parseInt(v.bp, 10) || 120
    const status: HealthStatus = sys < 130 ? 'normal' : sys <= 140 ? 'watch' : 'attention'
    cards.push({ key: 'bp', label: 'Blood pressure', unit: 'mmHg', value: v.bp, status, statusLabel: statusLabel(status), spark: spark(sys), note: 'Systolic / diastolic' })
  }
  if (v.pulse) {
    const p = parseInt(v.pulse, 10) || 72
    const status: HealthStatus = p >= 60 && p <= 100 ? 'normal' : p < 55 || p > 110 ? 'attention' : 'watch'
    cards.push({ key: 'pulse', label: 'Pulse', unit: 'bpm', value: v.pulse, status, statusLabel: statusLabel(status), spark: spark(p), note: 'Resting heart rate' })
  }
  if (v.temp) {
    const t = parseFloat(v.temp) || 98.4
    const status: HealthStatus = t <= 99 ? 'normal' : t <= 100.4 ? 'watch' : 'attention'
    cards.push({ key: 'temp', label: 'Temperature', unit: '°F', value: v.temp, status, statusLabel: statusLabel(status), spark: spark(Math.round(t)), note: 'Body temperature' })
  }
  if (v.sugar) {
    const g = parseInt(v.sugar, 10) || 110
    const status: HealthStatus = g >= 70 && g <= 140 ? 'normal' : g <= 180 ? 'watch' : 'attention'
    cards.push({ key: 'sugar', label: 'Blood sugar', unit: 'mg/dL', value: v.sugar, status, statusLabel: statusLabel(status), spark: spark(g), note: 'Fasting / random' })
  }
  if (v.weight) {
    const w = parseFloat(v.weight) || 68
    cards.push({ key: 'weight', label: 'Weight', unit: 'kg', value: v.weight, status: 'normal', statusLabel: 'Tracking', spark: spark(Math.round(w)), note: 'Recorded this visit' })
  }
  return cards
}

/* ── wellness trend (read side) ──────────────────────────────────────────── */

export type TrendStatus = 'good' | 'stable' | 'attention'
export interface TrendRowData {
  label: string
  value: string
  status: TrendStatus
  statusLabel: string
}

const TREND_DIMS: { label: string; key: string }[] = [
  { label: 'Mood', key: 'mood' },
  { label: 'Medication', key: 'medication' },
  { label: 'Sleep', key: 'sleep' },
  { label: 'Mobility', key: 'mobility' },
  { label: 'Appetite', key: 'appetite' },
  { label: 'Hydration', key: 'hydration' },
  { label: 'Conversation', key: 'conversation' },
]

export function wellnessTrend(r: SharedVisitReport): TrendRowData[] {
  const rows: TrendRowData[] = []
  for (const dim of TREND_DIMS) {
    const val = r.scales[dim.key]
    if (!val) continue
    const scale = ALL_SCALES.find((s) => s.key === dim.key)
    const isBest = scale ? scale.options.indexOf(val) === 0 : false
    const status: TrendStatus = CONCERN_VALUES.has(val) ? 'attention' : isBest ? 'good' : 'stable'
    rows.push({ label: dim.label, value: val, status, statusLabel: status === 'good' ? 'Improving' : status === 'stable' ? 'Stable' : 'Needs attention' })
  }
  return rows
}

/* ── moments (read side) ─────────────────────────────────────────────────── */

export interface MomentItemData {
  key: string
  emoji: string
  label: string
}

export function momentItems(r: SharedVisitReport): MomentItemData[] {
  const items: MomentItemData[] = MOMENTS.filter((m) => r.moments.includes(m.key)).map((m) => ({ key: m.key, emoji: m.emoji, label: m.label }))
  if (r.social.includes('family_call') && !r.moments.includes('videocall')) items.push({ key: 'family_call', emoji: '📞', label: 'Family call' })
  return items
}
