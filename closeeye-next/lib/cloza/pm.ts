/**
 * The Presence Manager role provider — Cloza for the PM console. Same engine, same UI, same honesty
 * rules as Founder; only the snapshot, questions and analysis differ. It reads the PM's own live
 * caseload (RLS already scopes it to their families) and answers about attention, today's schedule,
 * escalations and Guardians — with navigate actions into the console it summarizes. Never fabricates:
 * anything not tracked (per-Guardian load) is an honest "unavailable".
 */
import type { ConsoleOverview, ActiveIncident, ConsoleGuardianLive } from '@/lib/db/console'
import type { ClozaAnswer, ClozaQuestion, ClozaSegment, ClozaAction, ClozaScope, ClozaIntent } from './types'
import type { CapabilityKeywords } from './intent'

export interface PresenceSnapshot {
  name: string
  overview: ConsoleOverview
  incidents: ActiveIncident[]
  guardians: ConsoleGuardianLive[]
}

const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s)
const fact = (text: string): ClozaSegment => ({ kind: 'fact', text })
const rec = (text: string): ClozaSegment => ({ kind: 'recommendation', text })
const na = (text: string): ClozaSegment => ({ kind: 'unavailable', text })
const nav = (label: string, href: string): ClozaAction => ({ kind: 'navigate', label, href, available: true })
const taskA = (label: string, command: string): ClozaAction => ({ kind: 'task', label, command, available: false })
const SOURCE = 'Live Close Eye data'

export const PM_QUESTIONS: ClozaQuestion[] = [
  { id: 'briefing', label: 'Brief me on my day' },
  { id: 'caseload', label: 'Who needs attention?' },
  { id: 'today', label: 'What’s on today?' },
  { id: 'escalations', label: 'Open escalations' },
  { id: 'guardians', label: 'Guardian status' },
]

export const PM_KEYWORDS: CapabilityKeywords = [
  [/escalat|incident|urgent|emergency/i, 'escalations'],
  [/guardian|staff|team|overload|available|free/i, 'guardians'],
  [/today|schedul|visit|appoint/i, 'today'],
  [/caseload|famil|attention|need|who/i, 'caseload'],
  [/brief|summar|how.*(day|things)|overall|my day/i, 'briefing'],
]

const needsAttention = (s: PresenceSnapshot) =>
  s.overview.families.filter((f) => f.needsVisitAttention || f.awaitingReply || f.urgentQuestion)

export function presenceBriefing(s: PresenceSnapshot): ClozaAnswer {
  const fams = s.overview.families.length
  const need = needsAttention(s).length
  const visits = s.overview.schedule.length
  const open = s.incidents.length
  const segs: ClozaSegment[] = [
    fact(`You’re holding ${fams} ${fams === 1 ? 'family' : 'families'}${need > 0 ? `, ${need} needing attention` : ' — all steady'}.`),
    fact(`${visits} ${visits === 1 ? 'visit' : 'visits'} on the schedule, ${open} open ${open === 1 ? 'escalation' : 'escalations'}.`),
    open > 0 ? rec(`Clear the ${open} open ${open === 1 ? 'escalation' : 'escalations'} first.`)
      : need > 0 ? rec(`Reach the ${need} ${need === 1 ? 'family' : 'families'} awaiting you.`)
      : rec('Nothing urgent — a good moment for proactive check-ins.'),
  ]
  return { title: 'Your day', segments: segs, source: `${SOURCE} · today`, capability: 'briefing', actions: [nav('Open console', '/pm')] }
}

function capabilityAnswer(s: PresenceSnapshot, id: string): ClozaAnswer {
  switch (id) {
    case 'briefing':
      return presenceBriefing(s)

    case 'caseload': {
      const need = needsAttention(s)
      const segs: ClozaSegment[] = [fact(`${s.overview.families.length} families in your care; ${need.length} need attention.`)]
      need.slice(0, 4).forEach((f) => segs.push(rec(`${f.name}${f.city ? ` (${f.city})` : ''} — ${f.urgentQuestion ? 'urgent question' : f.awaitingReply ? 'awaiting your reply' : 'visit attention'}.`)))
      if (need.length === 0) segs.push(fact('No family needs attention right now.'))
      return { title: 'Caseload', segments: segs, source: SOURCE, capability: id, actions: [nav('Open families', '/pm/families')] }
    }

    case 'today': {
      const sched = s.overview.schedule
      const segs = sched.length ? sched.slice(0, 6).map((v) => fact(`${v.timeLabel} — ${v.memberName}${v.guardianName ? ` with ${v.guardianName}` : ''} (${v.status}).`)) : [fact('Nothing on the schedule.')]
      return { title: 'Today’s schedule', segments: segs, source: SOURCE, capability: id, actions: [nav('Open schedule', '/pm/schedule')] }
    }

    case 'escalations': {
      const inc = s.incidents
      const segs = inc.length ? inc.slice(0, 6).map((i) => rec(`${i.memberName}: ${i.question}${i.acknowledgedAt ? '' : ' (unacknowledged)'}.`)) : [fact('No open escalations.')]
      return { title: 'Open escalations', segments: segs, source: SOURCE, capability: id, actions: [nav('Open escalations', '/pm/escalations'), taskA('Assign to a Guardian', 'assign-guardian')] }
    }

    case 'guardians': {
      const g = s.guardians
      const active = g.filter((x) => ['approved', 'active'].includes((x.status ?? '').toLowerCase()))
      return {
        title: 'Guardians',
        segments: [
          fact(`${g.length} ${g.length === 1 ? 'Guardian' : 'Guardians'} on your roster, ${active.length} active.`),
          na('Per-Guardian load and availability aren’t tracked yet — overload detection needs assignment history.'),
        ],
        source: SOURCE, capability: id, actions: [nav('Open Guardians', '/pm/guardians')],
      }
    }

    default:
      return unknownAnswer()
  }
}

function groupCount(cities: (string | null)[]): { city: string; count: number }[] {
  const m = new Map<string, number>()
  cities.forEach((c) => { const k = c || 'Unknown'; m.set(k, (m.get(k) ?? 0) + 1) })
  return Array.from(m.entries()).map(([city, count]) => ({ city, count })).sort((a, b) => b.count - a.count)
}

function cityBreakdown(s: PresenceSnapshot, intent: ClozaIntent): ClozaAnswer {
  const id = intent.capability
  let title: string
  let rows: { city: string; count: number }[]
  if (id === 'caseload') { title = 'Families by city'; rows = groupCount(s.overview.families.map((f) => f.city)) }
  else if (id === 'guardians') { title = 'Guardians by city'; rows = groupCount(s.guardians.map((g) => g.city)) }
  else return { title: 'Can’t break that down yet', segments: [na(`A by-city breakdown isn’t available for “${id}”.`)], source: SOURCE, capability: id }

  if (intent.compare && intent.compare.length >= 2) {
    const segs = intent.compare.map((c) => {
      const r = rows.find((x) => x.city.toLowerCase() === c.toLowerCase())
      return r ? fact(`${r.city}: ${r.count}.`) : na(`No ${title.toLowerCase()} for ${c} yet.`)
    })
    return { title: `${title} — comparison`, segments: segs, source: SOURCE, capability: id }
  }
  const segs = rows.length ? rows.map((r) => fact(`${r.city}: ${r.count}.`)) : [na('No city-level data yet.')]
  return { title, segments: segs, source: SOURCE, capability: id }
}

export function presenceRespond(s: PresenceSnapshot, scope: ClozaScope, intent: ClozaIntent): ClozaAnswer {
  const base = intent.capability === 'unknown'
    ? unknownAnswer()
    : intent.breakdown === 'city'
    ? cityBreakdown(s, intent)
    : capabilityAnswer(s, intent.capability)
  return { ...base, scopeNote: [cap(scope.role.replace(/_/g, ' ')), scope.dateRange?.label ?? 'today', intent.city ?? scope.city ?? 'all cities'].join(' · ') }
}

function unknownAnswer(): ClozaAnswer {
  return { title: 'I can’t answer that yet', segments: [na('I answer from your live console — try a suggested question, or ask about your caseload, today’s visits, escalations or Guardians.')], source: SOURCE, capability: 'unknown' }
}
