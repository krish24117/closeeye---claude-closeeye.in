// Canonical time format: "9am", "9:30am", "12pm" — no space, lowercase, drops :00 for whole hours.
// All time rendering in the app must go through one of these two functions.

// Takes a slot string like "09:30" or "14:00" → "9:30am" / "2pm"
export function formatSlot(slotStr: string): string {
  const h = +slotStr.slice(0, 2)
  const m = +slotStr.slice(3, 5)
  const ampm = h < 12 ? 'am' : 'pm'
  const h12 = h % 12 || 12
  return m === 0 ? `${h12}${ampm}` : `${h12}:${String(m).padStart(2, '0')}${ampm}`
}

// Takes an ISO timestamp (with any timezone offset) → "9:30am" in IST
export function formatIsoTime(iso: string): string {
  const d = new Date(iso)
  const parts = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata',
  }).formatToParts(d)
  const hour   = parts.find(p => p.type === 'hour')!.value
  const minute = parts.find(p => p.type === 'minute')!.value
  const period = parts.find(p => p.type === 'dayPeriod')!.value.toLowerCase()
  return minute === '00' ? `${hour}${period}` : `${hour}:${minute}${period}`
}
