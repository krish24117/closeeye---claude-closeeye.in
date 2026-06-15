export const LANGUAGES = ['Telugu', 'Hindi', 'English']

export const SKILLS = ['Medical assistance', 'Companionship', 'Mobility support', 'Errands']

export const AVAILABILITY_OPTIONS = [
  { value: 'full_time', label: 'Full time' },
  { value: 'part_time', label: 'Part time' },
  { value: 'weekends', label: 'Weekends' },
]

export const AVAILABILITY_LABELS: Record<string, string> = {
  full_time: 'Full time',
  part_time: 'Part time',
  weekends: 'Weekends',
}

export const COMPANION_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-50 text-yellow-700',
  approved: 'bg-green-50 text-green-700',
  rejected: 'bg-red-50 text-red-700',
}
