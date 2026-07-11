/**
 * Global search — one index across the whole application, built from data that
 * already exists (no new storage). Families, care team, invoices, visits, reports,
 * memberships, care tickets, operations, plus a small doctor/medicine directory.
 */
import { FAMILIES, GUARDIANS } from '@/lib/console-data'
import { INVOICES, PLANS, fmtINR } from '@/lib/admin-data'
import { VISITS } from '@/lib/family-data'

export type EntityType =
  | 'Family' | 'Guardian' | 'Companion' | 'Invoice' | 'Visit' | 'Report'
  | 'Doctor' | 'Medicine' | 'Membership' | 'Care ticket' | 'Operations'

export interface SearchItem {
  id: string
  type: EntityType
  title: string
  sub: string
  href: string
  keywords: string
}

const DOCTORS: SearchItem[] = [
  { id: 'doc-1', type: 'Doctor', title: 'Dr. Suresh Rao', sub: 'Cardiologist · Apollo Hospitals', href: '/pm/families/f-sheikh', keywords: 'heart cardiology physician' },
  { id: 'doc-2', type: 'Doctor', title: 'Dr. Meera Nair', sub: 'General physician · panel', href: '/pm', keywords: 'gp physician family doctor' },
]
const MEDICINES: SearchItem[] = [
  { id: 'med-1', type: 'Medicine', title: 'Amlodipine 5mg', sub: 'Blood pressure · Ramesh Rao', href: '/pm/families/f-rao', keywords: 'bp hypertension' },
  { id: 'med-2', type: 'Medicine', title: 'Metformin 500mg', sub: 'Diabetes · Lakshmi Rao', href: '/pm/families/f-lakshmi', keywords: 'sugar diabetic adherence' },
]
const TICKETS: SearchItem[] = [
  { id: 'tk-1', type: 'Care ticket', title: 'Medicine coordination', sub: 'Rao family · resolved today', href: '/admin/insights', keywords: 'pharmacy medicine care team' },
  { id: 'tk-2', type: 'Care ticket', title: 'Hospital appointment support', sub: 'Sheikh family · open', href: '/admin/insights', keywords: 'cardiology hospital escort' },
  { id: 'tk-3', type: 'Care ticket', title: 'Lab test scheduling', sub: 'Mehta family · pending', href: '/admin/insights', keywords: 'blood test diagnostics' },
]
const OPERATIONS: SearchItem[] = [
  { id: 'op-1', type: 'Operations', title: 'Live visit monitor', sub: 'Today’s visits, check-ins & GPS', href: '/pm/visits', keywords: 'operations live monitor visits today' },
  { id: 'op-2', type: 'Operations', title: 'Cancellation center', sub: 'Reasons, trend & recovery', href: '/admin/operations', keywords: 'cancellations refunds' },
  { id: 'op-3', type: 'Operations', title: 'Coverage & zones', sub: 'Cities, pincodes, supply health', href: '/admin/coverage', keywords: 'zones hyderabad west coverage gap' },
  { id: 'op-4', type: 'Operations', title: 'Escalations', sub: 'Anything needing a decision', href: '/pm/escalations', keywords: 'escalation priority urgent' },
]

let cache: SearchItem[] | null = null
export function index(): SearchItem[] {
  if (cache) return cache
  const items: SearchItem[] = []
  for (const f of FAMILIES) items.push({ id: `fam-${f.id}`, type: 'Family', title: f.memberName, sub: `${f.familyName} · ${f.relationship} · ${f.area}`, href: `/pm/families/${f.id}`, keywords: `${f.familyName} ${f.area} ${f.status}` })
  for (const g of GUARDIANS) items.push({ id: `gd-${g.id}`, type: g.role === 'companion' ? 'Companion' : 'Guardian', title: g.name, sub: `${g.role === 'companion' ? 'Companion' : 'Guardian'} · ${g.area} · ${g.rating}★`, href: '/admin/care-team', keywords: `${g.training.join(' ')} ${g.availabilityLabel}` })
  for (const inv of INVOICES) items.push({ id: `inv-${inv.id}`, type: 'Invoice', title: inv.id, sub: `${inv.family} · ${inv.plan} · ${fmtINR(inv.amount, false)}`, href: '/admin/finance', keywords: `${inv.status} payment invoice ${inv.family}` })
  for (const v of VISITS) {
    items.push({ id: `vis-${v.id}`, type: 'Visit', title: `${v.memberName} · ${v.dayLabel}`, sub: `${v.serviceName} · ${v.dateLabel} · ${v.guardianName}`, href: `/family/visits/${v.id}`, keywords: `${v.status} visit` })
    if (v.status === 'completed') items.push({ id: `rep-${v.id}`, type: 'Report', title: `Report · ${v.memberName}`, sub: `${v.dateLabel} · ${v.mood ?? 'wellbeing'}`, href: `/family/visits/${v.id}`, keywords: `report story photos ${v.memberName}` })
  }
  for (const p of PLANS) items.push({ id: `mem-${p.name}`, type: 'Membership', title: `${p.name} plan`, sub: `${fmtINR(p.price, false)}${p.period} · ${p.members} members`, href: '/admin/memberships', keywords: 'membership plan pricing renewal' })
  items.push(...DOCTORS, ...MEDICINES, ...TICKETS, ...OPERATIONS)
  cache = items
  return items
}

export const AI_SUGGESTIONS = [
  'Families needing follow-up',
  'Failed payments',
  'Guardians with the highest ratings',
  'Cancelled visits this week',
  'Pending renewals',
  'Companion availability',
]

export const ENTITY_ORDER: EntityType[] = ['Family', 'Guardian', 'Companion', 'Visit', 'Report', 'Invoice', 'Membership', 'Care ticket', 'Doctor', 'Medicine', 'Operations']

export function search(query: string): { type: EntityType; items: SearchItem[] }[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  const matched = index().filter((it) => `${it.title} ${it.sub} ${it.type} ${it.keywords}`.toLowerCase().includes(q))
  return ENTITY_ORDER
    .map((type) => ({ type, items: matched.filter((it) => it.type === type).slice(0, 6) }))
    .filter((g) => g.items.length > 0)
}
