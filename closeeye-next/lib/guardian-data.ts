/**
 * Guardian App — mock data. The single backend-swap boundary.
 * Connected to Modules 2–3: same Presence Manager (Priya) and the same families
 * (the Raos). A completed visit here is what becomes a report in Family Space.
 */
import { PRESENCE_MANAGER } from '@/lib/family-data'

export { PRESENCE_MANAGER }

export type GuardianVisitStatus = 'upcoming' | 'en-route' | 'in-progress' | 'completed'

export interface EmergencyContact {
  name: string
  relation: string
  phone: string
}

export interface GuardianVisit {
  id: string
  familyName: string
  memberName: string
  memberInitials: string
  relationship: string
  age: number
  service: string
  address: string
  area: string
  timeLabel: string
  windowLabel: string
  durationLabel: string
  distanceLabel: string
  driveLabel: string
  status: GuardianVisitStatus
  specialNotes: string
  medicalNotes: string[]
  preferences: string[]
  familyInstructions: string[]
  conversationSuggestions: string[]
  thingsToObserve: string[]
  emergencyContacts: EmergencyContact[]
  previousSummary?: string
}

export const GUARDIAN = {
  name: 'Arjun Kumar',
  firstName: 'Arjun',
  initials: 'AK',
  id: 'CE-G-0142',
  role: 'Verified Guardian',
  city: 'Hyderabad',
  since: 'Verified since Jan 2026',
  experienceLabel: '3 years of care experience',
  rating: 4.9,
  visitsCompleted: 214,
  onTimeRate: '98%',
  phone: '+91 90005 51142',
  availability: 'Available · Mon–Sat',
  certifications: ['Elder care & first aid', 'Background verified', 'CPR certified', 'Close Eye trained'],
  languages: ['Telugu', 'Hindi', 'English'],
}

/** Today's route — one already done, three ahead. Same Rao family as Modules 2–3. */
export const TODAY_VISITS: GuardianVisit[] = [
  {
    id: 'gv-0',
    familyName: 'Reddy family',
    memberName: 'Gopal Reddy',
    memberInitials: 'GR',
    relationship: 'Father',
    age: 78,
    service: 'Home Wellbeing Visit',
    address: 'Flat 4B, Green Meadows, Banjara Hills',
    area: 'Banjara Hills',
    timeLabel: '8:00 AM',
    windowLabel: 'Morning',
    durationLabel: '45 min',
    distanceLabel: 'Completed',
    driveLabel: '',
    status: 'completed',
    specialNotes: 'Prefers to sit in the balcony for morning sun.',
    medicalNotes: ['Diabetes — check he has eaten before meds'],
    preferences: ['Speaks Telugu', 'Enjoys old film songs'],
    familyInstructions: ['Son calls at 8:30 — please hand him the phone'],
    conversationSuggestions: ['Ask about his garden', 'His grandson’s cricket match'],
    thingsToObserve: ['Appetite', 'Mood', 'Any swelling in the feet'],
    emergencyContacts: [{ name: 'Suresh Reddy', relation: 'Son', phone: '+91 90000 22222' }],
    previousSummary: 'Cheerful last week, walked in the garden, ate well.',
  },
  {
    id: 'gv-1',
    familyName: 'Rao family',
    memberName: 'Ramesh Rao',
    memberInitials: 'RR',
    relationship: 'Father',
    age: 74,
    service: 'Home Wellbeing Visit',
    address: '12-3, Road No 4, Jubilee Hills',
    area: 'Jubilee Hills',
    timeLabel: '9:30 AM',
    windowLabel: 'Morning',
    durationLabel: '60–90 min',
    distanceLabel: '2.4 km',
    driveLabel: '8 min drive',
    status: 'upcoming',
    specialNotes: 'Loves a slow morning walk in the garden. Ananya (daughter) is in Toronto and follows every update closely.',
    medicalNotes: ['Blood pressure — take a reading today (family asked)', 'Knee mobility — uses a walking stick'],
    preferences: ['Prefers Telugu', 'Morning visits', 'Enjoys cricket talk'],
    familyInstructions: ['Please take a BP reading and note it', 'Encourage the garden walk'],
    conversationSuggestions: ['His old cricket days', 'The December family visit', 'The monsoon'],
    thingsToObserve: ['Mood & alertness', 'Steadiness while walking', 'Appetite at breakfast'],
    emergencyContacts: [
      { name: 'Ananya Rao', relation: 'Daughter', phone: '+1 416 555 0142' },
      { name: 'Dr. Suresh', relation: 'Physician', phone: '+91 90000 12345' },
    ],
    previousSummary: 'In good spirits last week — tea together, short garden walk, asked about the grandchildren.',
  },
  {
    id: 'gv-2',
    familyName: 'Rao family',
    memberName: 'Lakshmi Rao',
    memberInitials: 'LR',
    relationship: 'Mother',
    age: 69,
    service: 'Home Wellbeing Visit',
    address: '12-3, Road No 4, Jubilee Hills',
    area: 'Jubilee Hills',
    timeLabel: '11:15 AM',
    windowLabel: 'Late morning',
    durationLabel: '60 min',
    distanceLabel: 'Same home as Ramesh',
    driveLabel: 'next door',
    status: 'upcoming',
    specialNotes: 'Proud of her jasmine garden — let her show you. Evening tea person, but happy any time.',
    medicalNotes: ['Diabetes — diet managed, no sweets please'],
    preferences: ['Loves gardening', 'Enjoys family video calls'],
    familyInstructions: ['A quick video call with Ananya would make her day'],
    conversationSuggestions: ['Her jasmine and garden', 'Her cooking — the pappu'],
    thingsToObserve: ['Mood', 'Hydration', 'Blood-sugar-appropriate snacks'],
    emergencyContacts: [{ name: 'Ananya Rao', relation: 'Daughter', phone: '+1 416 555 0142' }],
    previousSummary: 'Cheerful, showed off the new jasmine, long chat over tea.',
  },
  {
    id: 'gv-3',
    familyName: 'Sheikh family',
    memberName: 'Fatima Sheikh',
    memberInitials: 'FS',
    relationship: 'Grandmother',
    age: 82,
    service: 'Hospital Companion',
    address: 'Apollo Hospitals, Jubilee Hills',
    area: 'Jubilee Hills',
    timeLabel: '2:00 PM',
    windowLabel: 'Afternoon',
    durationLabel: 'Half day',
    distanceLabel: '3.1 km',
    driveLabel: '10 min drive',
    status: 'upcoming',
    specialNotes: 'Routine cardiology follow-up. Stay with her through the appointment; keep the family updated.',
    medicalNotes: ['Cardiology follow-up', 'Slight hearing difficulty — speak clearly, face her'],
    preferences: ['Speaks Urdu and Hindi', 'Prefers a calm, quiet presence'],
    familyInstructions: ['Collect the prescription and share a photo with the family'],
    conversationSuggestions: ['Reassure her before the appointment', 'Her grandchildren'],
    thingsToObserve: ['Anxiety level', 'What the doctor advises', 'Next appointment date'],
    emergencyContacts: [{ name: 'Imran Sheikh', relation: 'Grandson', phone: '+91 90000 33333' }],
    previousSummary: 'First hospital visit with us — she was nervous but settled quickly.',
  },
]

export function visitById(id: string): GuardianVisit | undefined {
  return TODAY_VISITS.find((v) => v.id === id)
}

/* The structured visit-report / observation capture lives in `lib/cloza.ts` —
   the CLOza Index foundation (queryable observations, no exposed scores). */

/* ── Guardian messages (PM · Operations · Emergency broadcast) ─────────── */
export interface GuardianThread {
  id: string
  title: string
  subtitle: string
  kind: 'pm' | 'ops' | 'emergency'
  unread: number
  last: string
  time: string
}
export const GUARDIAN_THREADS: GuardianThread[] = [
  { id: 't-pm', title: PRESENCE_MANAGER.name, subtitle: 'Your Presence Manager', kind: 'pm', unread: 2, last: 'Please take Ramesh’s BP reading today 🙏', time: '8:40 AM' },
  { id: 't-ops', title: 'Close Eye Operations', subtitle: 'Scheduling & support', kind: 'ops', unread: 0, last: 'Your 2 PM visit address is confirmed.', time: 'Yesterday' },
  { id: 't-em', title: 'Emergency broadcast', subtitle: 'Team-wide alerts', kind: 'emergency', unread: 0, last: 'No active alerts in your area.', time: '2 days ago' },
]

export const GUARDIAN_ALERTS = [
  { id: 'a1', kind: 'priority' as const, text: 'Family asked for a BP reading during Ramesh’s visit today.' },
  { id: 'a2', kind: 'info' as const, text: 'Lakshmi’s daughter would love a quick video call.' },
]

export type NotificationKind = 'priority' | 'family' | 'schedule' | 'approval'
export interface GuardianNotification {
  id: string
  kind: NotificationKind
  title: string
  text: string
  time: string
  unread: boolean
}
export const GUARDIAN_NOTIFICATIONS: GuardianNotification[] = [
  { id: 'n1', kind: 'priority', title: 'Care request', text: 'Please take a BP reading during Ramesh’s visit.', time: '8:40 AM', unread: true },
  { id: 'n2', kind: 'family', title: 'From the Rao family', text: 'Ananya would love a short video call with Lakshmi today.', time: '8:15 AM', unread: true },
  { id: 'n3', kind: 'schedule', title: 'Visit confirmed', text: 'Your 2:00 PM at Apollo Hospitals is confirmed.', time: 'Yesterday', unread: false },
  { id: 'n4', kind: 'approval', title: 'Report approved', text: 'Priya approved and shared yesterday’s report for Gopal.', time: 'Yesterday', unread: false },
]
