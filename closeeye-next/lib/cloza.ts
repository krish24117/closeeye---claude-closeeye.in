/**
 * CLOza Index — Foundation (data collection layer).
 *
 * Close Eye's Family Presence Intelligence System. NOT a medical or diagnostic
 * score — a Human Presence Index that notices meaningful change over time through
 * consistent human observation.
 *
 * Rules this module enforces:
 *  • The Guardian answers intuitive questions; they NEVER see or calculate scores.
 *  • Every observation is stored as its own STRUCTURED, queryable field — never a
 *    single text blob. This is what future AI analysis (Module 7) reads.
 *  • The family never receives raw data — only warm, human language.
 *
 * This file defines the structured schema + a deterministic "AI processing"
 * placeholder that turns observations into human outputs. Swap `processVisit`
 * for the real model later; the structured shape stays the same.
 */

import type { PhotoAttachment, VoiceAttachment } from './guardian-uploads'

export type ObservationGroup = 'wellbeing' | 'home' | 'social'

export interface ObservationScale {
  key: string
  label: string
  /** Ordered best → concern. Index carries meaning internally (never shown). */
  options: string[]
  group: ObservationGroup
}

/* ── The observation scales (intuitive questions, quick chips) ──────────── */

export const WELLBEING_SCALES: ObservationScale[] = [
  { key: 'mood', label: 'Mood', options: ['Excellent', 'Good', 'Neutral', 'Low', 'Concern'], group: 'wellbeing' },
  { key: 'energy', label: 'Energy', options: ['High', 'Steady', 'A little tired', 'Tired'], group: 'wellbeing' },
  { key: 'conversation', label: 'Conversation', options: ['Very engaged', 'Normal', 'Quiet', 'Withdrawn'], group: 'wellbeing' },
  { key: 'mobility', label: 'Mobility', options: ['Independent', 'Slight support', 'Walking stick', 'Assisted', 'Wheelchair'], group: 'wellbeing' },
  { key: 'appetite', label: 'Appetite', options: ['Full meal', 'Partial meal', 'Snacks only', 'Poor appetite'], group: 'wellbeing' },
  { key: 'hydration', label: 'Hydration', options: ['Well hydrated', 'Some fluids', 'Needs reminding'], group: 'wellbeing' },
  { key: 'medication', label: 'Medication', options: ['Completed', 'Reminded', 'Missed', 'Unsure', 'Not required'], group: 'wellbeing' },
  { key: 'sleep', label: 'Sleep last night', options: ['Restful', 'Interrupted', 'Poor'], group: 'wellbeing' },
  { key: 'hygiene', label: 'Personal hygiene', options: ['Independent', 'Slight support', 'Needs support'], group: 'wellbeing' },
  { key: 'memory', label: 'Memory', options: ['Sharp', 'Occasional lapses', 'Needs prompts'], group: 'wellbeing' },
  { key: 'orientation', label: 'Orientation', options: ['Fully oriented', 'Mostly oriented', 'Confused at times'], group: 'wellbeing' },
  { key: 'emotional', label: 'Emotional wellbeing', options: ['Content', 'Calm', 'Anxious', 'Lonely'], group: 'wellbeing' },
  { key: 'engagement', label: 'Social engagement', options: ['Actively social', 'Some', 'Kept to self'], group: 'wellbeing' },
]

export const HOME_SCALES: ObservationScale[] = [
  { key: 'cleanliness', label: 'Cleanliness', options: ['Clean', 'Ok', 'Needs help'], group: 'home' },
  { key: 'safety', label: 'Safety', options: ['Safe', 'Minor concern', 'Flag to PM'], group: 'home' },
  { key: 'lighting', label: 'Lighting', options: ['Good', 'Dim', 'Poor'], group: 'home' },
  { key: 'food', label: 'Food available', options: ['Well stocked', 'Some', 'Low'], group: 'home' },
  { key: 'water', label: 'Water available', options: ['Yes', 'Low'], group: 'home' },
  { key: 'comfort', label: 'General comfort', options: ['Comfortable', 'Ok', 'Needs attention'], group: 'home' },
]

export const ALL_SCALES = [...WELLBEING_SCALES, ...HOME_SCALES]

/* ── Emotional moments — tap-to-mark (become the emotional timeline) ────── */

export interface Moment {
  key: string
  label: string
  emoji: string
}
export const MOMENTS: Moment[] = [
  { key: 'celebrated', label: 'Celebrated', emoji: '🎉' },
  { key: 'smiled', label: 'Smiled often', emoji: '😊' },
  { key: 'memories', label: 'Shared memories', emoji: '💭' },
  { key: 'prayed', label: 'Prayed together', emoji: '🙏' },
  { key: 'walked', label: 'Walked together', emoji: '🚶' },
  { key: 'cooked', label: 'Cooked together', emoji: '🍲' },
  { key: 'read', label: 'Read together', emoji: '📖' },
  { key: 'videocall', label: 'Family video call', emoji: '📱' },
  { key: 'tea', label: 'Tea together', emoji: '☕' },
  { key: 'music', label: 'Music / songs', emoji: '🎵' },
]

/* ── Social connection — tap-to-mark ───────────────────────────────────── */

export interface SocialItem {
  key: string
  label: string
}
export const SOCIAL_ITEMS: SocialItem[] = [
  { key: 'family_call', label: 'Family call completed' },
  { key: 'neighbours', label: 'Neighbours visited' },
  { key: 'friends', label: 'Friends contacted' },
  { key: 'visitors', label: 'Visitors today' },
  { key: 'community', label: 'Community engagement' },
]

/* ── The structured observation record (queryable — one field each) ─────── */

export interface VisitObservations {
  scales: Record<string, string> // observation key → chosen option
  moments: string[] // emotional-moment keys
  social: string[] // social-connection keys
  win?: string // a small win / achievement (optional, one line)
  familyRequest?: string // a family request handled or raised (optional)
  concern?: string // optional caregiver concern (free text, one field)
  note?: string // one optional free-text note (unexpected / anything else)
  photos: PhotoAttachment[] // compressed, uploaded photos from the visit
  voiceNote: VoiceAttachment | null // one recorded voice note
}

export function emptyObservations(): VisitObservations {
  return { scales: {}, moments: [], social: [], photos: [], voiceNote: null }
}

/* ── Intelligence outputs (generated automatically; no scores exposed) ──── */

export interface VisitIntelligence {
  summary: string // warm, human, family-safe
  positiveMoments: string[]
  riskFlags: string[] // for the Presence Manager, not the family
  followUps: string[]
  recommendations: string[]
}

export const CONCERN_VALUES = new Set([
  'Low', 'Concern', 'Tired', 'Withdrawn', 'Wheelchair', 'Assisted', 'Poor appetite',
  'Needs reminding', 'Missed', 'Unsure', 'Poor', 'Needs support', 'Needs prompts',
  'Confused at times', 'Anxious', 'Lonely', 'Kept to self', 'Needs help', 'Minor concern',
  'Flag to PM', 'Low', 'Needs attention', 'Confused at times',
])

/**
 * Deterministic stand-in for the CLOza engine. Reads STRUCTURED observations and
 * produces human-language outputs — a summary the family can read, plus flags and
 * follow-ups for the Presence Manager. Never returns a numeric score.
 */
export function processVisit(obs: VisitObservations, name: string): VisitIntelligence {
  const first = name.split(' ')[0] ?? 'They'
  const val = (k: string) => obs.scales[k]

  const positiveMoments: string[] = []
  MOMENTS.forEach((m) => obs.moments.includes(m.key) && positiveMoments.push(`${m.emoji} ${m.label.toLowerCase()}`))
  if (obs.social.includes('family_call')) positiveMoments.push('📞 spoke with family')

  const riskFlags: string[] = []
  const followUps: string[] = []
  ALL_SCALES.forEach((s) => {
    const v = val(s.key)
    if (v && CONCERN_VALUES.has(v)) {
      riskFlags.push(`${s.label}: ${v}`)
    }
  })
  if (val('medication') === 'Missed') followUps.push(`Confirm ${first}'s medication was taken later today.`)
  if (val('safety') === 'Flag to PM' || val('safety') === 'Minor concern') followUps.push('Review a home-safety concern raised during the visit.')
  if (obs.concern) followUps.push(obs.concern)

  const recommendations: string[] = []
  if (val('mood') === 'Low' || val('mood') === 'Concern') recommendations.push('A short daily check-in call may lift their spirits.')
  if (val('mobility') && ['Assisted', 'Wheelchair', 'Walking stick'].includes(val('mobility')!)) recommendations.push('Keep encouraging gentle, supported movement.')
  if (val('hydration') === 'Needs reminding') recommendations.push('Leave water within easy reach and remind gently.')
  if (!recommendations.length) recommendations.push('Continue the current rhythm of visits — it’s working well.')

  // Warm, human summary — the family-safe voice.
  const mood = val('mood')
  const good = mood === 'Excellent' || mood === 'Good'
  const opener = good
    ? `${first} was in good spirits today.`
    : mood === 'Neutral'
      ? `${first} had a settled, quiet day today.`
      : `${first} seemed a little low today, and I stayed close.`
  const bits: string[] = []
  if (obs.moments.includes('walked')) bits.push('we went for a short walk together')
  if (obs.moments.includes('tea')) bits.push('shared some tea')
  if (obs.moments.includes('memories')) bits.push('talked over old memories')
  if (val('appetite') === 'Full meal') bits.push(`${first} ate well`)
  if (obs.social.includes('family_call')) bits.push('had a lovely call with family')
  const middle = bits.length ? ` ${capitalize(joinNaturally(bits))}.` : ''
  const photoBit = obs.photos.length ? ` I've added ${obs.photos.length} photo${obs.photos.length === 1 ? '' : 's'} from today.` : ''
  const summary = `${opener}${middle}${photoBit} I'll keep a close eye and share anything that needs attention.`

  return { summary, positiveMoments, riskFlags, followUps, recommendations }
}

function joinNaturally(items: string[]): string {
  if (items.length <= 1) return items[0] ?? ''
  return items.slice(0, -1).join(', ') + ' and ' + items[items.length - 1]
}
function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
