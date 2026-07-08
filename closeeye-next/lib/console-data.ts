/**
 * Presence Manager Console — operational mock data (the single backend-swap boundary).
 *
 * This is the operational brain, NOT a CRM. Health is a Relationship & Service Health
 * indicator (green / yellow / red), never a medical score. The console is connected to
 * the rest of the ecosystem: the Rao family, Guardian Arjun and PM Priya are the same
 * people as Modules 3–4, and live signals (completed reports, family requests) are read
 * from the shared stores at runtime (see `useLiveFamilies`).
 */
import { PRESENCE_MANAGER } from '@/lib/family-data'

export { PRESENCE_MANAGER }

export type HealthStatus = 'green' | 'yellow' | 'red'

export const PM = {
  name: PRESENCE_MANAGER.name,
  firstName: PRESENCE_MANAGER.name.split(' ')[0]!,
  initials: PRESENCE_MANAGER.initials,
  role: 'Presence Manager',
  city: 'Hyderabad',
  phone: PRESENCE_MANAGER.phone,
}

/* ── Guardians ───────────────────────────────────────────────────────────── */

export type GuardianStatus = 'on-visit' | 'available' | 'off'
export type CareRole = 'guardian' | 'companion'
export interface ConsoleGuardian {
  id: string
  name: string
  initials: string
  phone: string
  city: string
  area: string
  role: CareRole
  status: GuardianStatus
  availabilityLabel: string
  rating: number
  visitsToday: number
  onTimeRate: string
  experience: string
  /** Certifications for Guardians; service skills for Companions. */
  training: string[]
  currentFamily?: string
}

/** The Care Team — Guardians (medical-trained) and Companions (social support). */
export const GUARDIANS: ConsoleGuardian[] = [
  { id: 'g-arjun', name: 'Arjun Kumar', initials: 'AK', phone: '+91 90005 51142', city: 'Hyderabad', area: 'Jubilee Hills', role: 'guardian', status: 'on-visit', availabilityLabel: 'On a visit · Jubilee Hills', rating: 4.9, visitsToday: 4, onTimeRate: '98%', experience: '3 years', training: ['Elder care & first aid', 'CPR certified'], currentFamily: 'Rao family' },
  { id: 'g-ravi', name: 'Ravi Teja', initials: 'RT', phone: '+91 90005 51188', city: 'Hyderabad', area: 'Banjara Hills', role: 'guardian', status: 'on-visit', availabilityLabel: 'On a visit · Banjara Hills', rating: 4.8, visitsToday: 3, onTimeRate: '96%', experience: '2 years', training: ['Elder care & first aid'], currentFamily: 'Reddy family' },
  { id: 'g-meena', name: 'Meena Iyer', initials: 'MI', phone: '+91 90005 51190', city: 'Hyderabad', area: 'Madhapur', role: 'guardian', status: 'available', availabilityLabel: 'Available now', rating: 4.9, visitsToday: 2, onTimeRate: '99%', experience: '4 years', training: ['Elder care & first aid', 'CPR certified', 'Dementia care'] },
  { id: 'g-sana', name: 'Sana Sheikh', initials: 'SS', phone: '+91 90005 51166', city: 'Hyderabad', area: 'Tolichowki', role: 'guardian', status: 'available', availabilityLabel: 'Available in 30 min', rating: 4.7, visitsToday: 2, onTimeRate: '95%', experience: '1 year', training: ['Elder care & first aid'] },
  { id: 'g-karthik', name: 'Karthik Rao', initials: 'KR', phone: '+91 90005 51150', city: 'Hyderabad', area: 'Gachibowli', role: 'guardian', status: 'on-visit', availabilityLabel: 'On a visit · Gachibowli', rating: 4.6, visitsToday: 3, onTimeRate: '92%', experience: '2 years', training: ['Elder care & first aid'], currentFamily: 'Nair family' },
  { id: 'g-priyanka', name: 'Priyanka Das', initials: 'PD', phone: '+91 90005 51177', city: 'Hyderabad', area: 'Kondapur', role: 'guardian', status: 'off', availabilityLabel: 'Off today', rating: 4.8, visitsToday: 0, onTimeRate: '97%', experience: '3 years', training: ['Elder care & first aid', 'CPR certified'] },
  { id: 'c-anita', name: 'Anita Rao', initials: 'AR', phone: '+91 90005 51201', city: 'Hyderabad', area: 'Kukatpally', role: 'companion', status: 'available', availabilityLabel: 'Available now', rating: 4.9, visitsToday: 2, onTimeRate: '98%', experience: '2 years', training: ['Conversation', 'Reading', 'Shopping Assistance'] },
  { id: 'c-vikram', name: 'Vikram Shetty', initials: 'VS', phone: '+91 90005 51202', city: 'Hyderabad', area: 'Jubilee Hills', role: 'companion', status: 'on-visit', availabilityLabel: 'On a visit · Jubilee Hills', rating: 4.8, visitsToday: 3, onTimeRate: '96%', experience: '3 years', training: ['Conversation', 'Walk', 'Hospital Companion'], currentFamily: 'Sheikh family' },
  { id: 'c-fatima', name: 'Fatima Begum', initials: 'FB', phone: '+91 90005 51203', city: 'Hyderabad', area: 'Banjara Hills', role: 'companion', status: 'off', availabilityLabel: 'Off today', rating: 4.7, visitsToday: 0, onTimeRate: '97%', experience: '1 year', training: ['Conversation', 'Walk', 'Reading'] },
]

export function guardianById(id: string) {
  return GUARDIANS.find((g) => g.id === id)
}
export const GUARDIAN_MEMBERS = GUARDIANS.filter((g) => g.role === 'guardian')
export const COMPANION_MEMBERS = GUARDIANS.filter((g) => g.role === 'companion')

/* ── Families (Relationship & Service Health) ────────────────────────────── */

export interface ConsoleFamily {
  id: string
  familyName: string
  memberName: string // primary member — the join key to visit-reports / family-requests
  memberInitials: string
  relationship: string
  age: number
  city: string
  area: string
  phone: string
  guardianId: string
  status: HealthStatus
  reason: string
  lastVisitLabel: string
  nextVisitLabel: string
  wellnessTrend: 'up' | 'flat' | 'down'
  satisfaction: number
}

export const FAMILIES: ConsoleFamily[] = [
  { id: 'f-rao', familyName: 'Rao family', memberName: 'Ramesh Rao', memberInitials: 'RR', relationship: 'Father', age: 74, city: 'Hyderabad', area: 'Jubilee Hills', phone: '+91 90000 22261', guardianId: 'g-arjun', status: 'green', reason: 'On track — daughter Ananya follows closely', lastVisitLabel: 'Today, 9:40 AM', nextVisitLabel: 'Fri, 10 Jul', wellnessTrend: 'up', satisfaction: 98 },
  { id: 'f-lakshmi', familyName: 'Rao family', memberName: 'Lakshmi Rao', memberInitials: 'LR', relationship: 'Mother', age: 69, city: 'Hyderabad', area: 'Jubilee Hills', phone: '+91 90000 22261', guardianId: 'g-arjun', status: 'yellow', reason: 'Lower energy noted for 3 visits', lastVisitLabel: 'Mon, 6 Jul', nextVisitLabel: 'Wed, 9 Jul', wellnessTrend: 'down', satisfaction: 95 },
  { id: 'f-reddy', familyName: 'Reddy family', memberName: 'Gopal Reddy', memberInitials: 'GR', relationship: 'Father', age: 78, city: 'Hyderabad', area: 'Banjara Hills', phone: '+91 90000 22222', guardianId: 'g-ravi', status: 'green', reason: 'Cheerful, walked in the garden', lastVisitLabel: 'Today, 8:45 AM', nextVisitLabel: 'Thu, 9 Jul', wellnessTrend: 'flat', satisfaction: 97 },
  { id: 'f-sheikh', familyName: 'Sheikh family', memberName: 'Fatima Sheikh', memberInitials: 'FS', relationship: 'Grandmother', age: 82, city: 'Hyderabad', area: 'Jubilee Hills', phone: '+91 90000 33333', guardianId: 'g-arjun', status: 'red', reason: 'Cardiology follow-up today · family anxious', lastVisitLabel: 'Wed, 3 Jul', nextVisitLabel: 'Today, 2:00 PM', wellnessTrend: 'down', satisfaction: 91 },
  { id: 'f-nair', familyName: 'Nair family', memberName: 'Shankar Nair', memberInitials: 'SN', relationship: 'Father', age: 71, city: 'Hyderabad', area: 'Gachibowli', phone: '+91 90000 44444', guardianId: 'g-karthik', status: 'green', reason: 'Steady, enjoys the crossword', lastVisitLabel: 'Yesterday', nextVisitLabel: 'Fri, 10 Jul', wellnessTrend: 'up', satisfaction: 96 },
  { id: 'f-mehta', familyName: 'Mehta family', memberName: 'Sunita Mehta', memberInitials: 'SM', relationship: 'Mother', age: 76, city: 'Hyderabad', area: 'Madhapur', phone: '+91 90000 55555', guardianId: 'g-meena', status: 'yellow', reason: 'Family asked for a BP reading', lastVisitLabel: 'Yesterday', nextVisitLabel: 'Today, 4:30 PM', wellnessTrend: 'flat', satisfaction: 94 },
  { id: 'f-khan', familyName: 'Khan family', memberName: 'Yusuf Khan', memberInitials: 'YK', relationship: 'Grandfather', age: 84, city: 'Hyderabad', area: 'Tolichowki', phone: '+91 90000 66666', guardianId: 'g-sana', status: 'yellow', reason: 'Missed morning call — following up', lastVisitLabel: 'Mon, 6 Jul', nextVisitLabel: 'Today, 5:15 PM', wellnessTrend: 'flat', satisfaction: 93 },
  { id: 'f-menon', familyName: 'Menon family', memberName: 'Radha Menon', memberInitials: 'RM', relationship: 'Mother', age: 68, city: 'Hyderabad', area: 'Kukatpally', phone: '+91 90000 77777', guardianId: 'g-karthik', status: 'green', reason: 'Doing well, loves the video calls', lastVisitLabel: 'Today, 10:10 AM', nextVisitLabel: 'Sat, 11 Jul', wellnessTrend: 'up', satisfaction: 99 },
]

export function familyById(id: string) {
  return FAMILIES.find((f) => f.id === id)
}

/* ── Today's visits (live) ───────────────────────────────────────────────── */

export type VisitStatus = 'scheduled' | 'upcoming' | 'en-route' | 'on-site' | 'completed' | 'delayed' | 'cancelled' | 'rescheduled' | 'missed'
export type VisitType = 'wellbeing' | 'hospital' | 'companion' | 'emergency' | 'video' | 'birthday'
export interface ConsoleVisit {
  id: string
  guardianId: string
  familyId: string
  memberName: string
  timeLabel: string
  status: VisitStatus
  visitType: VisitType
  etaLabel: string
  checkinLabel?: string
  gpsLabel?: string
  durationLabel?: string
  priority: 'normal' | 'high'
  aiStatus: string
  mediaCount: number
  delayLabel?: string
  cancelReason?: string
  rescheduledTo?: string
}

export const TODAY_VISITS: ConsoleVisit[] = [
  { id: 'cv-1', guardianId: 'g-arjun', familyId: 'f-reddy', memberName: 'Gopal Reddy', timeLabel: '8:00 AM', status: 'completed', visitType: 'wellbeing', etaLabel: '—', checkinLabel: '8:02 AM', gpsLabel: 'Verified · ±8 m', durationLabel: '45 min', priority: 'normal', aiStatus: 'Good spirits · full report shared', mediaCount: 3 },
  { id: 'cv-2', guardianId: 'g-arjun', familyId: 'f-rao', memberName: 'Ramesh Rao', timeLabel: '9:30 AM', status: 'on-site', visitType: 'wellbeing', etaLabel: 'On site', checkinLabel: '9:38 AM', gpsLabel: 'Verified · ±10 m', durationLabel: '32 min so far', priority: 'high', aiStatus: 'BP reading requested by family', mediaCount: 2 },
  { id: 'cv-3', guardianId: 'g-ravi', familyId: 'f-menon', memberName: 'Radha Menon', timeLabel: '10:00 AM', status: 'completed', visitType: 'video', etaLabel: '—', checkinLabel: '10:04 AM', gpsLabel: 'Verified · ±6 m', durationLabel: '50 min', priority: 'normal', aiStatus: 'Cheerful · video call done', mediaCount: 4 },
  { id: 'cv-4', guardianId: 'g-karthik', familyId: 'f-nair', memberName: 'Shankar Nair', timeLabel: '11:15 AM', status: 'en-route', visitType: 'wellbeing', etaLabel: 'ETA 9 min', priority: 'normal', aiStatus: 'Awaiting check-in', mediaCount: 0 },
  { id: 'cv-5', guardianId: 'g-sana', familyId: 'f-khan', memberName: 'Yusuf Khan', timeLabel: '12:00 PM', status: 'delayed', visitType: 'wellbeing', etaLabel: 'ETA 20 min', priority: 'high', aiStatus: 'Guardian running late — traffic', mediaCount: 0, delayLabel: '15 min behind' },
  { id: 'cv-6', guardianId: 'g-meena', familyId: 'f-mehta', memberName: 'Sunita Mehta', timeLabel: '4:30 PM', status: 'upcoming', visitType: 'wellbeing', etaLabel: 'Scheduled', priority: 'normal', aiStatus: 'BP reading on the plan', mediaCount: 0 },
  { id: 'cv-7', guardianId: 'c-vikram', familyId: 'f-sheikh', memberName: 'Fatima Sheikh', timeLabel: '2:00 PM', status: 'upcoming', visitType: 'hospital', etaLabel: 'Scheduled', priority: 'high', aiStatus: 'Hospital companion · cardiology', mediaCount: 0 },
  { id: 'cv-8', guardianId: 'c-anita', familyId: 'f-menon', memberName: 'Radha Menon', timeLabel: '3:00 PM', status: 'cancelled', visitType: 'companion', etaLabel: '—', priority: 'normal', aiStatus: 'Cancelled by family', mediaCount: 0, cancelReason: 'Family unavailable' },
  { id: 'cv-9', guardianId: 'g-arjun', familyId: 'f-lakshmi', memberName: 'Lakshmi Rao', timeLabel: '9:30 AM', status: 'rescheduled', visitType: 'wellbeing', etaLabel: '—', priority: 'normal', aiStatus: 'Moved at family’s request', mediaCount: 0, rescheduledTo: 'Tomorrow · 10:00 AM' },
]

export function visitsForFamily(familyId: string) {
  return TODAY_VISITS.filter((v) => v.familyId === familyId)
}

/* ── Escalations ─────────────────────────────────────────────────────────── */

export type EscalationPriority = 'low' | 'medium' | 'high' | 'critical'
export interface Escalation {
  id: string
  familyId: string
  guardianId?: string
  priority: EscalationPriority
  issue: string
  assignedTo: string
  createdLabel: string
  recommendedAction: string
  status: 'open' | 'in-progress' | 'resolved'
}

export const ESCALATIONS: Escalation[] = [
  { id: 'e-1', familyId: 'f-sheikh', guardianId: 'g-arjun', priority: 'high', issue: 'Family anxious about today’s cardiology follow-up', assignedTo: 'Priya Menon', createdLabel: '35 min ago', recommendedAction: 'Call the family before the 2 PM appointment to reassure them', status: 'open' },
  { id: 'e-2', familyId: 'f-lakshmi', guardianId: 'g-arjun', priority: 'medium', issue: 'Lower energy noted for 3 consecutive visits', assignedTo: 'Priya Menon', createdLabel: '2 hours ago', recommendedAction: 'Schedule a wellbeing review; suggest a short daily check-in call', status: 'in-progress' },
  { id: 'e-3', familyId: 'f-khan', guardianId: 'g-sana', priority: 'medium', issue: 'Guardian delayed — visit running 15 min behind', assignedTo: 'Operations', createdLabel: '10 min ago', recommendedAction: 'Notify the family of the new ETA; offer Meena as backup', status: 'open' },
  { id: 'e-4', familyId: 'f-mehta', priority: 'low', issue: 'Pending family request: blood pressure reading', assignedTo: 'Priya Menon', createdLabel: 'Yesterday', recommendedAction: 'Confirm the BP reading is added to today’s 4:30 PM visit', status: 'resolved' },
]

export function escalationsForFamily(familyId: string) {
  return ESCALATIONS.filter((e) => e.familyId === familyId)
}

/* ── Recent activity ─────────────────────────────────────────────────────── */

export type ActivityKind = 'checkin' | 'completed' | 'voice' | 'photo' | 'request' | 'story' | 'escalation' | 'appointment' | 'delay'
export interface ActivityItem {
  id: string
  kind: ActivityKind
  text: string
  timeLabel: string
}

export const ACTIVITY: ActivityItem[] = [
  { id: 'a-1', kind: 'checkin', text: 'Arjun checked in at the Rao family', timeLabel: '9:38 AM' },
  { id: 'a-2', kind: 'story', text: 'AI story generated for Radha Menon', timeLabel: '10:56 AM' },
  { id: 'a-3', kind: 'photo', text: '4 photos uploaded from Radha Menon’s visit', timeLabel: '10:52 AM' },
  { id: 'a-4', kind: 'completed', text: 'Visit completed · Gopal Reddy', timeLabel: '8:47 AM' },
  { id: 'a-5', kind: 'request', text: 'Rao family asked for a BP reading', timeLabel: '8:40 AM' },
  { id: 'a-6', kind: 'delay', text: 'Sana running 15 min behind for Yusuf Khan', timeLabel: '11:48 AM' },
  { id: 'a-7', kind: 'voice', text: 'Voice note uploaded from Gopal Reddy’s visit', timeLabel: '8:44 AM' },
  { id: 'a-8', kind: 'escalation', text: 'Escalation raised · Sheikh family (cardiology)', timeLabel: '11:15 AM' },
]

/* ── KPIs ────────────────────────────────────────────────────────────────── */

export const KPIS = {
  families: FAMILIES.length,
  todaysVisits: TODAY_VISITS.length,
  guardianAvailability: `${GUARDIANS.filter((g) => g.status !== 'off').length}/${GUARDIANS.length}`,
  pendingFollowUps: ESCALATIONS.filter((e) => e.status !== 'resolved').length,
  avgResponse: 'Under 1 hr',
  satisfaction: '97%',
  completionRate: '96%',
}

export const STATS = {
  families: FAMILIES.length,
  activeVisits: TODAY_VISITS.filter((v) => v.status === 'on-site' || v.status === 'en-route' || v.status === 'delayed').length,
  upcomingVisits: TODAY_VISITS.filter((v) => v.status === 'upcoming').length,
  highPriority: ESCALATIONS.filter((e) => (e.priority === 'high' || e.priority === 'critical') && e.status !== 'resolved').length,
}

/* ── AI Operations Assistant (human language, never raw AI) ──────────────── */

export type RecTone = 'info' | 'positive' | 'warning'
export interface AIRecommendation {
  id: string
  tone: RecTone
  text: string
  action?: { label: string; href: string }
}

export const AI_RECOMMENDATIONS: AIRecommendation[] = [
  { id: 'r-1', tone: 'warning', text: 'Three families need a follow-up today — Sheikh, Lakshmi Rao and Yusuf Khan. The Sheikh family is most time-sensitive.', action: { label: 'Review escalations', href: '/console/escalations' } },
  { id: 'r-2', tone: 'warning', text: 'Mrs Lakshmi has shown lower energy for three consecutive visits. A wellbeing review may be worth scheduling.', action: { label: 'Open her profile', href: '/console/families/f-lakshmi' } },
  { id: 'r-3', tone: 'info', text: 'Sana is running 15 minutes behind for Yusuf Khan. Meena is available nearby if you’d like a backup.', action: { label: 'View guardians', href: '/console/guardians' } },
  { id: 'r-4', tone: 'positive', text: 'Arjun has completed every visit on time today. Gopal Reddy and Radha Menon both had wonderful mornings.' },
]
