/**
 * The Guardian role provider — Cloza for the person on the ground. Same engine, same UI, same honesty
 * rules; the snapshot is just the Guardian's own visits (RLS-scoped). It answers about today's work,
 * the next stop, and the run of upcoming visits, with a navigate action into the visit list. Nothing
 * is invented — no visits means it says so.
 */
import type { GuardianVisit } from '@/lib/db/guardian'
import type { ClozaAnswer, ClozaQuestion, ClozaSegment, ClozaAction, ClozaScope, ClozaIntent } from './types'
import type { CapabilityKeywords } from './intent'

export interface GuardianSnapshot {
  name: string
  visits: GuardianVisit[]
}

const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s)
const fact = (text: string): ClozaSegment => ({ kind: 'fact', text })
const rec = (text: string): ClozaSegment => ({ kind: 'recommendation', text })
const na = (text: string): ClozaSegment => ({ kind: 'unavailable', text })
const nav = (label: string, href: string): ClozaAction => ({ kind: 'navigate', label, href, available: true })
const SOURCE = 'Live Close Eye data'

export const GUARDIAN_QUESTIONS: ClozaQuestion[] = [
  { id: 'today', label: 'What’s on today?' },
  { id: 'next', label: 'My next visit' },
  { id: 'schedule', label: 'My upcoming visits' },
  { id: 'briefing', label: 'Brief me on my day' },
]

export const GUARDIAN_KEYWORDS: CapabilityKeywords = [
  [/next|upcoming|after this/i, 'next'],
  [/schedul|all|week|list|coming up/i, 'schedule'],
  [/today|now|left/i, 'today'],
  [/brief|summar|my day|how.*day/i, 'briefing'],
]

const fmtTime = (iso: string | null) => (iso ? new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true }) : 'time TBC')
const fmtDay = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }) : 'a date TBC')
const isActive = (v: GuardianVisit) => v.status !== 'cancelled' && v.status !== 'completed'
const isToday = (iso: string | null) => !!iso && new Date(iso).toDateString() === new Date().toDateString()
const upcoming = (visits: GuardianVisit[]) =>
  visits.filter((v) => isActive(v) && v.scheduledAt).sort((a, b) => new Date(a.scheduledAt!).getTime() - new Date(b.scheduledAt!).getTime())

export function guardianBriefing(s: GuardianSnapshot): ClozaAnswer {
  const today = s.visits.filter((v) => isActive(v) && isToday(v.scheduledAt))
  const up = upcoming(s.visits)
  const segs: ClozaSegment[] = [
    today.length ? fact(`You have ${today.length} ${today.length === 1 ? 'visit' : 'visits'} today.`) : fact('No visits scheduled today.'),
  ]
  if (up[0]) segs.push(fact(`Next: ${up[0].memberName} at ${fmtTime(up[0].scheduledAt)}${up[0].address ? `, ${up[0].address}` : ''}.`))
  segs.push(rec(today.length ? 'Check each address and set off in good time.' : up[0] ? `Your next visit is ${fmtDay(up[0].scheduledAt)}.` : 'Nothing scheduled — enjoy the break.'))
  return { title: 'Your day', segments: segs, source: `${SOURCE} · today`, capability: 'briefing', actions: [nav('Open visits', '/guardian')] }
}

function capabilityAnswer(s: GuardianSnapshot, id: string): ClozaAnswer {
  switch (id) {
    case 'briefing':
      return guardianBriefing(s)

    case 'today': {
      const today = s.visits.filter((v) => isActive(v) && isToday(v.scheduledAt))
      const segs = today.length
        ? today.map((v) => fact(`${fmtTime(v.scheduledAt)} — ${v.memberName} · ${v.service}${v.address ? ` · ${v.address}` : ''}.`))
        : [fact('No visits scheduled today.')]
      return { title: 'Today', segments: segs, source: SOURCE, capability: id, actions: [nav('Open visits', '/guardian')] }
    }

    case 'next': {
      const next = upcoming(s.visits)[0]
      const segs = next
        ? [fact(`${next.memberName} · ${next.service}.`), fact(`${fmtDay(next.scheduledAt)} at ${fmtTime(next.scheduledAt)}${next.address ? ` · ${next.address}` : ''}.`)]
        : [fact('You have no upcoming visits.')]
      return { title: 'Next visit', segments: segs, source: SOURCE, capability: id, actions: next ? [nav('Open visit', `/guardian/visits/${next.id}`)] : [] }
    }

    case 'schedule': {
      const up = upcoming(s.visits)
      const segs = up.length ? up.slice(0, 6).map((v) => fact(`${fmtDay(v.scheduledAt)} ${fmtTime(v.scheduledAt)} — ${v.memberName} · ${v.service}.`)) : [fact('No upcoming visits.')]
      return { title: 'Upcoming visits', segments: segs, source: SOURCE, capability: id, actions: [nav('Open visits', '/guardian')] }
    }

    default:
      return unknownAnswer()
  }
}

export function guardianRespond(s: GuardianSnapshot, scope: ClozaScope, intent: ClozaIntent): ClozaAnswer {
  const base = intent.capability === 'unknown'
    ? unknownAnswer()
    : intent.breakdown === 'city'
    ? { title: 'Can’t break that down', segments: [na('Your visits carry a full address but aren’t tagged by city, so I can’t split them that way.')], source: SOURCE, capability: intent.capability }
    : capabilityAnswer(s, intent.capability)
  return { ...base, scopeNote: [cap(scope.role.replace(/_/g, ' ')), scope.dateRange?.label ?? 'today'].join(' · ') }
}

function unknownAnswer(): ClozaAnswer {
  return { title: 'I can’t answer that yet', segments: [na('I answer about your visits — try a suggested question, or ask what’s on today, or about your next visit.')], source: SOURCE, capability: 'unknown' }
}
