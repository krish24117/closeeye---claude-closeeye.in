/**
 * Family Space — mock data.
 * This is the single backend-swap boundary: replace these exports with real API
 * calls (or server components fetching a DB) and every screen keeps working.
 * All content is warm, human, and reassurance-first by design.
 */

export type VisitStatus = 'upcoming' | 'completed' | 'cancelled'
export type Mood = 'Good' | 'Calm' | 'Cheerful' | 'Tired' | 'Low'
export type MedicationState = 'Completed' | 'Pending' | 'Not required'

export interface EmergencyContact {
  name: string
  relation: string
  phone: string
}

export interface Personality {
  emoji: string
  label: string
}

export interface Member {
  id: string
  name: string
  relationship: string
  age: number
  city: string
  initials: string
  statusLine: string
  mood: Mood
  personality: Personality[]
  medicalNotes: string[]
  preferences: string[]
  emergencyContacts: EmergencyContact[]
  guardianName: string
}

export interface WellbeingObservation {
  label: string
  value: string
}

export interface Visit {
  id: string
  memberId: string
  memberName: string
  serviceName: string
  status: VisitStatus
  dateLabel: string
  dayLabel: string
  timeLabel: string
  guardianName: string
  summary: string
  arrival?: string
  departure?: string
  durationLabel?: string
  photoCount?: number
  mood?: Mood
  conversation?: string
  wellbeing?: WellbeingObservation[]
  medication?: MedicationState
  recommendations?: string[]
  guardianNotes?: string
  pmReview?: string
  followUp?: string
  hasVoiceNote?: boolean
}

export interface Message {
  id: string
  from: 'family' | 'pm'
  author: string
  kind: 'text' | 'voice' | 'photo' | 'document'
  text: string
  timeLabel: string
}

export interface DocumentItem {
  name: string
  meta: string
  dateLabel: string
}
export interface DocumentGroup {
  category: string
  icon: 'shield' | 'stethoscope' | 'pill' | 'idcard' | 'phone' | 'file'
  items: DocumentItem[]
}

export interface TrustFactor {
  label: string
  value: number
  note: string
}

export const RELATIONSHIPS = ['Father', 'Mother', 'Grandparents', 'Spouse', 'Sibling', 'Friend', 'Other'] as const

export const CURRENT_USER = {
  firstName: 'Ananya',
  fullName: 'Ananya Rao',
  location: 'Toronto',
  email: 'ananya@email.com',
}

export const PRESENCE_MANAGER = {
  name: 'Priya Menon',
  initials: 'PM',
  role: 'Your Presence Manager',
  intro:
    'I look after your family personally — coordinating every visit and making sure you always know how they are. Think of me as your one point of contact, here for you anytime.',
  blurb:
    'I look after your family personally — coordinating every visit and making sure you always know how they are. Reach me anytime.',
  online: true,
  availability: 'Available now · Mon–Sat, 8am–8pm IST',
  responseTime: 'usually replies within an hour',
  avgResponse: 'Under 1 hour',
  yearsWith: 'With your family since March 2026',
  phone: '+91 90002 21261',
}

export const MEMBERS: Member[] = [
  {
    id: 'ramesh',
    name: 'Ramesh Rao',
    relationship: 'Father',
    age: 74,
    city: 'Hyderabad',
    initials: 'RR',
    statusLine: 'Doing well today',
    mood: 'Good',
    personality: [
      { emoji: '📖', label: 'Reads the newspaper every morning' },
      { emoji: '🌿', label: 'Loves his morning garden walk' },
      { emoji: '🏏', label: 'Can talk cricket for hours' },
      { emoji: '🎵', label: 'Favourite devotional songs' },
    ],
    medicalNotes: ['Blood pressure — monitored', 'Knee mobility — uses a walking stick'],
    preferences: ['Prefers Telugu', 'Morning visits', 'Enjoys a walk in the garden'],
    emergencyContacts: [
      { name: 'Ananya Rao', relation: 'Daughter', phone: '+1 416 555 0142' },
      { name: 'Dr. Suresh', relation: 'Family physician', phone: '+91 90000 12345' },
    ],
    guardianName: 'Arjun K.',
  },
  {
    id: 'lakshmi',
    name: 'Lakshmi Rao',
    relationship: 'Mother',
    age: 69,
    city: 'Hyderabad',
    initials: 'LR',
    statusLine: 'Cheerful and rested',
    mood: 'Cheerful',
    personality: [
      { emoji: '🌸', label: 'Loves gardening — proud of her jasmine' },
      { emoji: '☕', label: 'Evening tea at 5, without fail' },
      { emoji: '📺', label: 'Enjoys family video calls' },
      { emoji: '🍲', label: 'Makes the best pappu' },
    ],
    medicalNotes: ['Diabetes — diet managed', 'Annual check-up due next month'],
    preferences: ['Loves gardening', 'Evening tea at 5', 'Enjoys family video calls'],
    emergencyContacts: [{ name: 'Ananya Rao', relation: 'Daughter', phone: '+1 416 555 0142' }],
    guardianName: 'Arjun K.',
  },
]

export const VISITS: Visit[] = [
  {
    id: 'v-104',
    memberId: 'ramesh',
    memberName: 'Ramesh Rao',
    serviceName: 'Home Wellbeing Visit',
    status: 'upcoming',
    dateLabel: 'Fri, 10 Jul',
    dayLabel: 'Friday',
    timeLabel: 'Morning · 9:30 AM',
    guardianName: 'Arjun K.',
    summary: 'Weekly wellbeing check-in and a short morning walk.',
  },
  {
    id: 'v-103',
    memberId: 'ramesh',
    memberName: 'Ramesh Rao',
    serviceName: 'Home Wellbeing Visit',
    status: 'completed',
    dateLabel: 'Wed, 8 Jul',
    dayLabel: 'Yesterday',
    timeLabel: 'Morning · 9:40 AM',
    guardianName: 'Arjun K.',
    summary:
      'Ramesh was in good spirits. We had tea together, went for a short walk in the garden, and he asked about the grandchildren.',
    arrival: '9:40 AM',
    departure: '10:55 AM',
    durationLabel: '1h 15m',
    photoCount: 3,
    mood: 'Good',
    hasVoiceNote: true,
    conversation:
      'We spoke about the monsoon and his old cricket days. He was happy to hear Ananya is visiting in December and asked us to remind her to carry a warm shawl for Lakshmi.',
    wellbeing: [
      { label: 'Mood', value: 'Good, talkative' },
      { label: 'Appetite', value: 'Ate a full breakfast' },
      { label: 'Mobility', value: 'Walked 15 minutes with his stick' },
      { label: 'Sleep', value: 'Rested well last night' },
    ],
    medication: 'Completed',
    recommendations: [
      'Continue morning walks — they lift his mood noticeably.',
      'A follow-up BP reading later this week would be reassuring.',
    ],
    guardianNotes:
      'Ramesh is doing genuinely well. He lights up talking about family — the December visit is clearly something to look forward to.',
    pmReview:
      'Reviewed and shared. Everything looks steady this week. I’ll schedule the BP reading into Friday’s visit. — Priya',
    followUp: 'Add a blood-pressure reading to Friday’s visit.',
  },
  {
    id: 'v-102',
    memberId: 'lakshmi',
    memberName: 'Lakshmi Rao',
    serviceName: 'Home Wellbeing Visit',
    status: 'completed',
    dateLabel: 'Mon, 6 Jul',
    dayLabel: 'Monday',
    timeLabel: 'Evening · 5:15 PM',
    guardianName: 'Arjun K.',
    summary:
      'Lakshmi was cheerful and proud to show the new jasmine in her garden. Evening tea together and a long chat.',
    arrival: '5:15 PM',
    departure: '6:20 PM',
    durationLabel: '1h 5m',
    photoCount: 4,
    mood: 'Cheerful',
    wellbeing: [
      { label: 'Mood', value: 'Cheerful, chatty' },
      { label: 'Diet', value: 'Sugar-appropriate snacks' },
      { label: 'Activity', value: 'Tended the garden' },
    ],
    medication: 'Not required',
    recommendations: ['Keep encouraging the gardening — it’s wonderful for her.'],
    guardianNotes: 'A lovely visit. Lakshmi sends her love to Ananya.',
    pmReview: 'Shared with the family. All well. — Priya',
  },
  {
    id: 'v-101',
    memberId: 'ramesh',
    memberName: 'Ramesh Rao',
    serviceName: 'Home Wellbeing Visit',
    status: 'cancelled',
    dateLabel: 'Thu, 3 Jul',
    dayLabel: 'Thursday',
    timeLabel: 'Morning',
    guardianName: 'Arjun K.',
    summary: 'Rescheduled at the family’s request — moved to the following morning.',
  },
]

export const MESSAGES: Message[] = [
  { id: 'm1', from: 'pm', author: 'Priya', kind: 'text', text: 'Good morning Ananya! Ramesh had a lovely visit yesterday — I’ve shared the full update. 💚', timeLabel: 'Yesterday, 11:04 AM' },
  { id: 'm2', from: 'pm', author: 'Priya', kind: 'photo', text: 'A few photos from the garden walk.', timeLabel: 'Yesterday, 11:05 AM' },
  { id: 'm3', from: 'family', author: 'Ananya', kind: 'text', text: 'This means the world to me, thank you Priya. He looks so happy 🥹', timeLabel: 'Yesterday, 9:20 PM' },
  { id: 'm4', from: 'pm', author: 'Priya', kind: 'text', text: 'He truly is. I’ve added a BP reading to Friday’s visit so we stay ahead of it.', timeLabel: 'Yesterday, 9:41 PM' },
  { id: 'm5', from: 'pm', author: 'Priya', kind: 'voice', text: 'Voice note · 0:24', timeLabel: 'Today, 8:15 AM' },
]

export const DOCUMENTS: DocumentGroup[] = [
  {
    category: 'Insurance',
    icon: 'shield',
    items: [{ name: 'Health insurance policy', meta: 'Star Health · PDF', dateLabel: 'Valid to Mar 2027' }],
  },
  {
    category: 'Medical records',
    icon: 'stethoscope',
    items: [
      { name: 'Cardiology summary', meta: 'Apollo · PDF', dateLabel: 'Jun 2026' },
      { name: 'Blood work — full panel', meta: 'PDF', dateLabel: 'May 2026' },
    ],
  },
  {
    category: 'Prescriptions',
    icon: 'pill',
    items: [{ name: 'Current medication list', meta: 'PDF', dateLabel: 'Updated Jul 2026' }],
  },
  {
    category: 'Identity',
    icon: 'idcard',
    items: [{ name: 'Aadhaar — Ramesh Rao', meta: 'Secured', dateLabel: '' }],
  },
  {
    category: 'Emergency contacts',
    icon: 'phone',
    items: [{ name: 'Family & physician contacts', meta: 'Card', dateLabel: 'Updated Jun 2026' }],
  },
  {
    category: 'Visit reports',
    icon: 'file',
    items: [
      { name: 'Wellbeing report — 8 Jul', meta: 'PDF', dateLabel: 'This week' },
      { name: 'Wellbeing report — 6 Jul', meta: 'PDF', dateLabel: 'This week' },
    ],
  },
]

export const MEMBERSHIP = {
  plan: 'Family Care',
  status: 'Active',
  memberSince: 'March 2026',
  renewalLabel: 'Renews 1 March 2027',
  visitsIncluded: 8,
  visitsUsed: 3,
  benefits: [
    'Up to 8 wellbeing visits a month',
    'A dedicated Presence Manager',
    'Same-day WhatsApp updates & reports',
    'Priority emergency response',
    'Secure family document vault',
  ],
  invoices: [
    { id: 'INV-2026-06', dateLabel: '1 Jun 2026', amount: '₹8,000', status: 'Paid' },
    { id: 'INV-2026-05', dateLabel: '1 May 2026', amount: '₹8,000', status: 'Paid' },
    { id: 'INV-2026-04', dateLabel: '1 Apr 2026', amount: '₹8,000', status: 'Paid' },
  ],
}

export const TRUST_SCORE = {
  overall: 96,
  label: 'Your family is in trusted, consistent hands',
  factors: [
    { label: 'Guardian consistency', value: 100, note: 'Same Guardian, Arjun, for 12 weeks' },
    { label: 'Visit completion', value: 95, note: '19 of 20 visits completed on time' },
    { label: 'Family satisfaction', value: 98, note: 'Based on your feedback' },
    { label: 'Communication quality', value: 94, note: 'Updates shared same-day' },
    { label: 'Response time', value: 92, note: 'Presence Manager replies within the hour' },
  ] as TrustFactor[],
}

export interface Notification {
  id: string
  text: string
  timeLabel: string
  unread: boolean
}
export const NOTIFICATIONS: Notification[] = [
  { id: 'n1', text: 'Your Presence Manager shared today’s update for Ramesh.', timeLabel: '2h ago', unread: true },
  { id: 'n2', text: 'Lakshmi enjoyed her evening visit — 4 new photos.', timeLabel: 'Mon', unread: true },
  { id: 'n3', text: 'Your next visit is on Friday morning.', timeLabel: 'Mon', unread: false },
]

export const todayStatus = () => {
  const father = MEMBERS[0]!
  const lastVisit = VISITS.find((v) => v.memberId === father.id && v.status === 'completed')
  const nextVisit = VISITS.find((v) => v.status === 'upcoming')
  return {
    member: father,
    headline: `${father.name.split(' ')[0]} is doing well today`,
    lastVisitLabel: lastVisit?.dayLabel ?? '—',
    mood: lastVisit?.mood ?? father.mood,
    medication: lastVisit?.medication ?? 'Completed',
    nextVisitLabel: nextVisit?.dayLabel ?? '—',
    lastVisit,
    nextVisit,
  }
}
