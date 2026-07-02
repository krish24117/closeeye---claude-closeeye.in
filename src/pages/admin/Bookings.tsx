import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ui/Toast'
import { format } from 'date-fns'
import { SERVICE_NAMES } from '@/lib/booking-labels'
import { Badge, EmptyState, ErrorBox, Skeleton } from './_shared'

type Tone = 'green' | 'amber' | 'red' | 'blue' | 'purple' | 'gray'

const ALL_STATUSES = [
  'pending', 'confirmed', 'companion_assigned', 'on_the_way',
  'in_progress', 'completed', 'delayed', 'rescheduled', 'cancelled',
]

// Statuses that require a note/reschedule-time before confirming
const NEEDS_NOTE = new Set(['delayed', 'rescheduled', 'cancelled'])

function statusTone(status: string): Tone {
  switch (status) {
    case 'pending':            return 'amber'
    case 'confirmed':          return 'blue'
    case 'companion_assigned': return 'purple'
    case 'on_the_way':         return 'purple'
    case 'in_progress':        return 'green'
    case 'completed':          return 'gray'
    case 'delayed':            return 'amber'
    case 'rescheduled':        return 'amber'
    case 'cancelled':          return 'red'
    case 'requested':          return 'amber'
    case 'needs_details':      return 'amber'
    case 'needs_reschedule':   return 'red'
    case 'scheduled':          return 'blue'
    case 'companion_confirmed':return 'blue'
    case 'paid':               return 'green'
    default:                   return 'gray'
  }
}

function paymentTone(status: string): Tone {
  switch (status) {
    case 'received':
    case 'paid':    return 'green'
    case 'failed':  return 'red'
    default:        return 'amber'
  }
}

const LABEL: Record<string, string> = {
  pending:             'Pending',
  requested:           'Request received',
  needs_details:       'Needs details',
  needs_reschedule:    'Awaiting reschedule',
  confirmed:           'Confirmed',
  companion_assigned:  'Companion assigned',
  on_the_way:          'On the way',
  in_progress:         'In progress',
  completed:           'Completed',
  delayed:             'Delayed',
  rescheduled:         'Rescheduled',
  scheduled:           'Scheduled',
  companion_confirmed: 'Companion confirmed',
  paid:                'Visit confirmed',
  cancelled:           'Cancelled',
}

// ── Date/time helper ─────────────────────────────────────────────────────────

function formatScheduledAt(iso: string): { date: string; time: string } {
  const d = new Date(iso)
  return {
    date: d.toLocaleDateString('en-IN', {
      weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Asia/Kolkata',
    }),
    time: d.toLocaleTimeString('en-IN', {
      hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata',
    }),
  }
}

// ── Confirmation template ─────────────────────────────────────────────────────

function buildConfirmTemplate(r: BookingRequest & { _family_name?: string | null }): string {
  const familyName = r._family_name || 'there'
  const elderName  = r.recipient_name || 'your loved one'
  const { date, time } = r.scheduled_at
    ? formatScheduledAt(r.scheduled_at)
    : { date: '—', time: '—' }

  return [
    `Namaste ${familyName} 🌿`,
    ``,
    `This is Close Eye. We're happy to confirm your booking:`,
    ``,
    `🏠 ${r.service_name} for ${elderName}`,
    `📅 ${date}`,
    `⏰ ${time} IST`,
    `📍 ${r.recipient_address || '—'}`,
    ``,
    `Our companion will visit ${elderName} and send you a full update here on WhatsApp after the visit. If you'd like us to know anything beforehand, just reply to this message.`,
    ``,
    `Warm regards,`,
    `Team Close Eye`,
    `When you can't be there, Close Eye can.`,
  ].join('\n')
}

// ── Confirmation modal ────────────────────────────────────────────────────────

function ConfirmModal({
  request,
  onClose,
  onSent,
}: {
  request: BookingRequest & { _family_name?: string | null }
  onClose: () => void
  onSent: (id: string) => void
}) {
  const [text, setText] = useState(() => buildConfirmTemplate(request))
  const [sending, setSending] = useState(false)

  const waNumber = request.requester_whatsapp.replace(/\D/g, '')
  const hasNumber = waNumber.length >= 7

  async function handleSend() {
    if (!hasNumber) return
    setSending(true)
    // Open WhatsApp
    window.open(`https://wa.me/${waNumber}?text=${encodeURIComponent(text)}`, '_blank')
    // Update request status to confirmed
    await supabase.from('booking_requests').update({ status: 'confirmed' }).eq('id', request.id)
    setSending(false)
    onSent(request.id)
    onClose()
  }

  return (
    <>
      <div className="adm-overlay" onClick={onClose} />
      <div className="adm-slideover" style={{ display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
        <button
          onClick={onClose}
          style={{ position: 'absolute', top: 14, right: 14, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-dark)', padding: 4, fontSize: 22, lineHeight: 1 }}
        >×</button>

        {/* Header */}
        <div style={{ borderBottom: '1px solid var(--line)', padding: '16px 20px' }}>
          <p style={{ fontWeight: 700, color: 'var(--forest)' }}>Send confirmation</p>
          <p style={{ fontSize: 12, color: 'var(--gray-mid)', marginTop: 2 }}>
            To: {request.requester_whatsapp || '—'} · for {request.recipient_name}
          </p>
        </div>

        {/* Template (editable) */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-mid)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            WhatsApp message — review before sending
          </p>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            rows={18}
            className="adm-textarea"
            style={{ fontFamily: 'monospace', lineHeight: 1.6 }}
          />
          <p style={{ fontSize: 12, color: 'var(--gray-mid)', marginTop: 8 }}>
            This opens WhatsApp with the message pre-filled. Review, then tap Send in WhatsApp.
            Status will auto-update to <span style={{ fontWeight: 700 }}>Confirmed</span>.
          </p>
          {!hasNumber && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, background: '#FEF3C7', border: '1px solid #FCD34D', borderRadius: 8, padding: '8px 12px' }}>
              <span style={{ fontSize: 13, color: '#D97706', flexShrink: 0 }}>⚠</span>
              <p style={{ fontSize: 12, color: '#92400E', fontWeight: 500 }}>No WhatsApp number on this request — get it from the family before confirming.</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div style={{ borderTop: '1px solid var(--line)', padding: '16px 20px', display: 'flex', gap: 12 }}>
          <button
            onClick={handleSend}
            disabled={!hasNumber || sending}
            style={{
              flex: 1, padding: '12px 16px', borderRadius: 10, border: 'none', fontWeight: 700, fontSize: 14,
              cursor: (!hasNumber || sending) ? 'not-allowed' : 'pointer',
              background: (!hasNumber || sending) ? '#F3F4F6' : 'var(--forest)',
              color: (!hasNumber || sending) ? '#9CA3AF' : '#fff',
            }}
          >
            {sending ? 'Opening…' : 'Open in WhatsApp →'}
          </button>
          <button
            onClick={onClose}
            style={{ padding: '12px 16px', borderRadius: 10, border: '1px solid #E5E7EB', background: '#fff', color: '#6B7280', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}
          >
            Cancel
          </button>
        </div>
      </div>
    </>
  )
}

// ── CalendarPicker ────────────────────────────────────────────────────────────

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']
const DAY_NAMES   = ['Su','Mo','Tu','We','Th','Fr','Sa']

function CalendarPicker({
  value,
  onChange,
  requestedDate,
}: {
  value: Date | null
  onChange: (d: Date) => void
  requestedDate: Date | null
}) {
  const today = new Date(); today.setHours(0,0,0,0)
  const init  = value ?? requestedDate ?? today
  const [viewMonth, setViewMonth] = useState(init.getMonth())
  const [viewYear,  setViewYear]  = useState(init.getFullYear())

  const firstDay    = new Date(viewYear, viewMonth, 1).getDay()
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()

  const prevMonth = () => { if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y-1) } else setViewMonth(m => m-1) }
  const nextMonth = () => { if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y+1) } else setViewMonth(m => m+1) }

  const reqFlat = requestedDate ? new Date(requestedDate.getFullYear(), requestedDate.getMonth(), requestedDate.getDate()).getTime() : null

  return (
    <div style={{ borderRadius: 14, border: '1px solid #E5E7EB', overflow: 'hidden', background: '#fff' }}>
      {/* Month nav */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderBottom: '1px solid #F3F4F6' }}>
        <button onClick={prevMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280', padding: 4, display: 'flex', alignItems: 'center' }}>
          <ChevronLeft size={16} />
        </button>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#111' }}>{MONTH_NAMES[viewMonth]} {viewYear}</span>
        <button onClick={nextMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280', padding: 4, display: 'flex', alignItems: 'center' }}>
          <ChevronRight size={16} />
        </button>
      </div>
      {/* Day headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', padding: '8px 8px 0' }}>
        {DAY_NAMES.map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: 10, fontWeight: 600, color: '#9CA3AF', padding: '2px 0', letterSpacing: '0.04em' }}>{d}</div>
        ))}
      </div>
      {/* Day cells */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', padding: '2px 8px 10px', gap: '2px 0' }}>
        {Array.from({ length: firstDay }, (_, i) => <div key={`pad${i}`} />)}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const day     = i + 1
          const thisDay = new Date(viewYear, viewMonth, day)
          const flatTime = thisDay.getTime()
          const isPast   = flatTime < today.getTime()
          const isSel    = value ? new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime() === flatTime : false
          const isToday  = flatTime === today.getTime()
          const isReq    = reqFlat === flatTime

          return (
            <button
              key={day}
              onClick={() => !isPast && onChange(thisDay)}
              disabled={isPast}
              style={{
                width: 34, height: 34, margin: '0 auto', borderRadius: '50%',
                border: isReq && !isSel ? '2px solid #3B82F6' : isToday && !isSel ? '2px solid #0E2A1F' : '2px solid transparent',
                background: isSel ? '#0E2A1F' : 'transparent',
                color: isPast ? '#D1D5DB' : isSel ? '#A8D5B5' : isToday ? '#0E2A1F' : '#111827',
                fontSize: 13, fontWeight: isSel || isToday ? 700 : 400,
                cursor: isPast ? 'default' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 140ms ease',
              }}
            >
              {day}
            </button>
          )
        })}
      </div>
      {reqFlat !== null && (
        <p style={{ fontSize: 10, color: '#3B82F6', padding: '0 12px 8px', display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', border: '2px solid #3B82F6', display: 'inline-block', flexShrink: 0 }} />
          Family requested date
        </p>
      )}
    </div>
  )
}

// ── TimeSlots ─────────────────────────────────────────────────────────────────

const ALL_SLOTS: { h: number; m: number }[] = []
for (let h = 7; h <= 20; h++) {
  for (const m of [0, 30]) {
    if (h === 20 && m === 30) break
    ALL_SLOTS.push({ h, m })
  }
}

function fmtSlot(h: number, m: number) {
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12  = h > 12 ? h - 12 : h === 0 ? 12 : h
  return `${h12}:${m === 0 ? '00' : '30'} ${ampm}`
}

function TimeSlots({
  selectedHour, selectedMinute, requestedHour, requestedMinute,
  onChange,
}: {
  selectedHour: number; selectedMinute: number
  requestedHour: number | null; requestedMinute: number | null
  onChange: (h: number, m: number) => void
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    // Auto-scroll to selected slot
    const el = scrollRef.current?.querySelector('[data-selected]') as HTMLElement | null
    el?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' })
  }, [])

  return (
    <div ref={scrollRef} style={{ display: 'flex', gap: 6, overflowX: 'auto', padding: '2px 0 6px', scrollbarWidth: 'none' }}>
      {ALL_SLOTS.map(({ h, m }) => {
        const isSel  = selectedHour === h && selectedMinute === m
        const isReq  = requestedHour === h && requestedMinute === m
        return (
          <button
            key={`${h}:${m}`}
            data-selected={isSel ? '' : undefined}
            onClick={() => onChange(h, m)}
            style={{
              flexShrink: 0, padding: '7px 14px', borderRadius: 100,
              border: isSel ? '2px solid #0E2A1F' : isReq ? '2px solid #3B82F6' : '1.5px solid #E5E7EB',
              background: isSel ? '#0E2A1F' : 'transparent',
              color: isSel ? '#A8D5B5' : isReq ? '#2563EB' : '#374151',
              fontSize: 12, fontWeight: isSel || isReq ? 700 : 400,
              cursor: 'pointer', transition: 'all 140ms ease',
            }}
          >
            {fmtSlot(h, m)}
          </button>
        )
      })}
    </div>
  )
}

// ── ConfirmDrawer ─────────────────────────────────────────────────────────────

interface Companion { id: string; full_name: string; phone: string | null }

function ConfirmDrawer({
  request,
  onClose,
  onConfirmed,
}: {
  request: BookingRequest & { _family_name?: string | null }
  onClose: () => void
  onConfirmed: (id: string, updates: Partial<BookingRequest>) => void
}) {
  const { showToast } = useToast()

  // ── Parse the user-requested time ─────────────────────────────────────────
  const reqDate = request.scheduled_at ? new Date(request.scheduled_at) : null
  const reqH    = reqDate?.getHours() ?? null
  const reqM    = reqDate?.getMinutes() ?? null
  const reqDay  = reqDate ? new Date(reqDate.getFullYear(), reqDate.getMonth(), reqDate.getDate()) : null

  // ── State ──────────────────────────────────────────────────────────────────
  const [companions,          setCompanions]         = useState<Companion[]>([])
  const [selectedCompanion,   setSelectedCompanion]  = useState<Companion | null>(null)
  const [selectedDate,        setSelectedDate]       = useState<Date | null>(reqDay)
  const [selectedHour,        setSelectedHour]       = useState<number>(reqH ?? 10)
  const [selectedMinute,      setSelectedMinute]     = useState<number>(reqM ?? 0)
  const [amountRupees,        setAmountRupees]       = useState(
    request.amount_paise ? String(Math.round(request.amount_paise / 100)) : ''
  )
  const [availability,        setAvailability]       = useState<'idle' | 'checking' | 'available' | 'conflict'>('idle')
  const [conflictWith,        setConflictWith]       = useState<string | null>(null)
  const [saving,              setSaving]             = useState(false)

  const familyName = request._family_name || 'there'
  const elderName  = request.recipient_name || 'your loved one'
  const waNumber   = request.requester_whatsapp.replace(/\D/g, '')
  const hasWa      = waNumber.length >= 7

  // ── Load companions ────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.from('companions').select('id,full_name,phone').order('full_name')
      .then(({ data }) => setCompanions((data || []) as Companion[]))
  }, [])

  // ── Availability check ────────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedCompanion || !selectedDate) { setAvailability('idle'); return }
    const t = new Date(selectedDate); t.setHours(selectedHour, selectedMinute, 0, 0)
    const window90 = 90 * 60 * 1000
    setAvailability('checking')
    supabase.from('bookings')
      .select('id, scheduled_at, loved_ones(full_name)')
      .eq('companion_id', selectedCompanion.id)
      .gte('scheduled_at', new Date(t.getTime() - window90).toISOString())
      .lte('scheduled_at', new Date(t.getTime() + window90).toISOString())
      .not('status', 'in', '("cancelled","completed")')
      .then(({ data }) => {
        if (data?.length) {
          const elder = (data[0].loved_ones as unknown as { full_name: string } | null)?.full_name
          setConflictWith(elder ? `${elder}'s visit` : 'another visit')
          setAvailability('conflict')
        } else {
          setConflictWith(null)
          setAvailability('available')
        }
      })
  }, [selectedCompanion, selectedDate, selectedHour, selectedMinute])

  function buildWaMessage(confirmedAt: Date, companionName: string): string {
    const dateStr = confirmedAt.toLocaleDateString('en-IN', {
      weekday: 'long', day: 'numeric', month: 'long',
      hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata',
    })
    return [
      `Namaste ${familyName} 🌿`,
      ``,
      `Your Close Eye visit has been confirmed!`,
      ``,
      `🏠 ${request.service_name} for ${elderName}`,
      `📅 ${dateStr} IST`,
      `👤 Companion: ${companionName}`,
      ...(amountRupees ? [`💳 Amount: ₹${amountRupees}`] : []),
      ``,
      `To lock in your visit, open the Close Eye app and complete payment.`,
      ``,
      `Warm regards,\nTeam Close Eye`,
      `When you can't be there, Close Eye can.`,
    ].join('\n')
  }

  async function handleConfirm() {
    if (!selectedCompanion) { showToast('Select a companion', 'error'); return }
    if (!selectedDate) { showToast('Select a visit date', 'error'); return }
    setSaving(true)
    try {
      const confirmedAt = new Date(selectedDate)
      confirmedAt.setHours(selectedHour, selectedMinute, 0, 0)

      const amountPaise = amountRupees ? Math.round(parseFloat(amountRupees) * 100) : request.amount_paise
      const updates: Record<string, unknown> = {
        status:         'companion_confirmed',
        companion_name: selectedCompanion.full_name,
        confirmed_at:   new Date().toISOString(),
        scheduled_at:   confirmedAt.toISOString(),
        ...(amountPaise ? { amount_paise: amountPaise } : {}),
      }

      // Auto-link user_id if this was a guest booking — makes it visible on family dashboard
      if (!request.user_id && request.requester_whatsapp) {
        const phone = request.requester_whatsapp.replace(/\D/g, '').slice(-10)
        const { data: matched } = await supabase
          .from('profiles').select('id').ilike('whatsapp_number', `%${phone}`).limit(1).maybeSingle()
        if (matched) updates.user_id = matched.id
      }

      const { error } = await supabase.from('booking_requests').update(updates).eq('id', request.id)
      if (error) throw error

      onConfirmed(request.id, updates as Partial<BookingRequest>)
      if (hasWa) {
        window.open(`https://wa.me/${waNumber}?text=${encodeURIComponent(buildWaMessage(confirmedAt, selectedCompanion.full_name))}`, '_blank')
      }
      showToast('Booking confirmed — WhatsApp ready to send', 'success')
      onClose()
    } catch {
      showToast('Could not confirm — try again', 'error')
    } finally {
      setSaving(false)
    }
  }

  const canConfirm = !!selectedCompanion && !!selectedDate && availability !== 'conflict'
  const confirmedDateStr = selectedDate
    ? (() => {
        const d = new Date(selectedDate); d.setHours(selectedHour, selectedMinute)
        return d.toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true })
      })()
    : null

  return (
    <>
      <div className="adm-overlay" onClick={onClose} />
      <div className="adm-slideover" style={{ display: 'flex', flexDirection: 'column', maxHeight: '92vh' }}>
        {/* Close */}
        <button onClick={onClose} style={{ position: 'absolute', top: 14, right: 14, background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: 4, fontSize: 22, lineHeight: 1, zIndex: 1 }}>×</button>

        {/* Header */}
        <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid #F3F4F6' }}>
          <p style={{ fontWeight: 800, fontSize: 16, color: 'var(--forest)', margin: 0 }}>Confirm booking</p>
          <p style={{ fontSize: 12, color: '#6B7280', marginTop: 3 }}>
            {request.service_name} for {elderName}{familyName !== 'there' ? ` · ${familyName}` : ''}
          </p>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 20px' }}>

          {/* Requested time banner */}
          {reqDate && (
            <div style={{ margin: '14px 0', display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 12 }}>
              <span style={{ fontSize: 16 }}>📅</span>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#1D4ED8', margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Family requested</p>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#1E40AF', margin: '1px 0 0' }}>
                  {reqDate.toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true })}
                </p>
              </div>
            </div>
          )}

          {/* Companion */}
          <div style={{ marginBottom: 18 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', marginBottom: 6, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Companion *</p>
            <select
              value={selectedCompanion?.id || ''}
              onChange={e => {
                const c = companions.find(x => x.id === e.target.value) ?? null
                setSelectedCompanion(c)
              }}
              className="adm-input"
              style={{ width: '100%', fontSize: 14, fontWeight: selectedCompanion ? 600 : 400 }}
            >
              <option value="">Select a companion…</option>
              {companions.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
            </select>

            {/* Availability pill */}
            {availability !== 'idle' && selectedDate && (
              <div style={{
                marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 12px',
                borderRadius: 100, fontSize: 12, fontWeight: 600,
                background: availability === 'available' ? '#DCFCE7' : availability === 'conflict' ? '#FEF3C7' : '#F3F4F6',
                color: availability === 'available' ? '#15803D' : availability === 'conflict' ? '#92400E' : '#6B7280',
              }}>
                <span style={{
                  width: 7, height: 7, borderRadius: '50%', display: 'inline-block', flexShrink: 0,
                  background: availability === 'available' ? '#22C55E' : availability === 'conflict' ? '#F59E0B' : '#9CA3AF',
                  ...(availability === 'checking' ? { animation: 'pulse 1.4s infinite' } : {}),
                }} />
                {availability === 'checking'  && 'Checking availability…'}
                {availability === 'available' && `✓ Available at ${confirmedDateStr}`}
                {availability === 'conflict'  && `⚠ Conflict with ${conflictWith}`}
              </div>
            )}

            {availability === 'conflict' && (
              <div style={{ marginTop: 8, padding: '10px 14px', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 12, fontSize: 12, color: '#78350F' }}>
                {selectedCompanion?.full_name} is already assigned to {conflictWith} within 90 min of this time.
                Please pick a different slot below.
              </div>
            )}
          </div>

          {/* Calendar */}
          <div style={{ marginBottom: 12 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', marginBottom: 8, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Visit date</p>
            <CalendarPicker
              value={selectedDate}
              onChange={d => setSelectedDate(d)}
              requestedDate={reqDay}
            />
          </div>

          {/* Time slots */}
          <div style={{ marginBottom: 18 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', marginBottom: 8, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Visit time</p>
            <TimeSlots
              selectedHour={selectedHour} selectedMinute={selectedMinute}
              requestedHour={reqH} requestedMinute={reqM}
              onChange={(h, m) => { setSelectedHour(h); setSelectedMinute(m) }}
            />
          </div>

          {/* Amount */}
          <div style={{ marginBottom: 8 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', marginBottom: 6, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Amount (₹)</p>
            <input
              type="number" min="1" step="1"
              value={amountRupees}
              onChange={e => setAmountRupees(e.target.value)}
              placeholder="e.g. 999"
              className="adm-input"
              style={{ width: '100%' }}
            />
            <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 4 }}>Family pays this to lock in the visit.</p>
          </div>

          {!hasWa && (
            <div style={{ display: 'flex', gap: 8, padding: '10px 14px', background: '#FEF3C7', border: '1px solid #FCD34D', borderRadius: 12 }}>
              <span style={{ color: '#D97706', flexShrink: 0 }}>⚠</span>
              <p style={{ fontSize: 12, color: '#92400E', fontWeight: 500, margin: 0 }}>No WhatsApp number — status will update but notification won't send.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ borderTop: '1px solid #F3F4F6', padding: '14px 20px', display: 'flex', gap: 10 }}>
          <button
            onClick={handleConfirm}
            disabled={saving || !canConfirm}
            style={{
              flex: 1, padding: '12px 16px', borderRadius: 10, border: 'none', fontSize: 14, fontWeight: 700,
              cursor: (saving || !canConfirm) ? 'not-allowed' : 'pointer',
              background: (saving || !canConfirm) ? '#F3F4F6' : 'var(--forest)',
              color: (saving || !canConfirm) ? '#9CA3AF' : '#fff',
              transition: 'background 150ms ease',
            }}
          >
            {saving ? 'Saving…' : availability === 'conflict' ? 'Pick a different slot first' : hasWa ? 'Confirm & notify on WhatsApp →' : 'Confirm booking'}
          </button>
          <button
            onClick={onClose}
            style={{ padding: '12px 16px', borderRadius: 10, border: '1px solid #E5E7EB', background: '#fff', color: '#6B7280', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}
          >
            Cancel
          </button>
        </div>
      </div>
    </>
  )
}

// ── RescheduleDrawer ──────────────────────────────────────────────────────────

interface SlotState { date: Date | null; hour: number; minute: number }

function RescheduleDrawer({
  request,
  onClose,
  onSent,
}: {
  request: BookingRequest & { _family_name?: string | null }
  onClose: () => void
  onSent: (id: string) => void
}) {
  const { showToast } = useToast()
  const [activeSlot, setActiveSlot] = useState<0 | 1 | 2>(0)
  const [slots, setSlots] = useState<SlotState[]>([
    { date: null, hour: 10, minute: 0 },
    { date: null, hour: 10, minute: 0 },
    { date: null, hour: 10, minute: 0 },
  ])
  const [saving, setSaving] = useState(false)

  const familyName = request._family_name || 'there'
  const elderName  = request.recipient_name || 'your loved one'
  const waNumber   = request.requester_whatsapp.replace(/\D/g, '')
  const hasWa      = waNumber.length >= 7

  function setSlotField(idx: number, patch: Partial<SlotState>) {
    setSlots(prev => prev.map((s, i) => i === idx ? { ...s, ...patch } : s))
  }

  function slotLabel(s: SlotState) {
    if (!s.date) return null
    const d = new Date(s.date)
    d.setHours(s.hour, s.minute, 0, 0)
    return d.toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true })
  }

  function buildMessage(): string {
    const requested = request.scheduled_at
      ? new Date(request.scheduled_at).toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true })
      : null
    const filled = slots
      .map((s, i) => ({ s, i }))
      .filter(({ s }) => s.date !== null)
      .map(({ s, i }) => `  ${i + 1}. ${slotLabel(s)}`)
    return [
      `Namaste ${familyName} 🙏`,
      ``,
      `We're sorry — we're unable to serve your ${request.service_name} visit${requested ? ` on ${requested}` : ''} as requested.`,
      ``,
      `We can offer these alternative times for ${elderName}:`,
      ...filled,
      ``,
      `Please reply with your preferred option and we'll confirm right away.`,
      ``,
      `Warm regards,\nTeam Close Eye`,
    ].join('\n')
  }

  async function handleSend() {
    if (!slots[0].date) { showToast('Add at least one alternative slot', 'error'); return }
    setSaving(true)
    try {
      await supabase.from('booking_requests').update({ status: 'needs_reschedule' }).eq('id', request.id)
      if (hasWa) window.open(`https://wa.me/${waNumber}?text=${encodeURIComponent(buildMessage())}`, '_blank')
      onSent(request.id)
      onClose()
      showToast('Reschedule request sent', 'success')
    } catch {
      showToast('Could not update — try again', 'error')
    } finally {
      setSaving(false)
    }
  }

  const cur = slots[activeSlot]

  return (
    <>
      <div className="adm-overlay" onClick={onClose} />
      <div className="adm-slideover" style={{ display: 'flex', flexDirection: 'column', maxHeight: '92vh' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 14, right: 14, background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: 4, fontSize: 22, lineHeight: 1, zIndex: 1 }}>×</button>

        <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid #F3F4F6' }}>
          <p style={{ fontWeight: 800, fontSize: 16, color: '#B91C1C', margin: 0 }}>Can't serve this time</p>
          <p style={{ fontSize: 12, color: '#6B7280', marginTop: 3 }}>{request.service_name} · {elderName}</p>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 20px' }}>
          {request.scheduled_at && (
            <div style={{ margin: '14px 0', display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: '#FEE2E2', border: '1px solid #FCA5A5', borderRadius: 12 }}>
              <span style={{ fontSize: 16 }}>📅</span>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#B91C1C', margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Unable to serve</p>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#991B1B', margin: '1px 0 0' }}>
                  {new Date(request.scheduled_at).toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true })}
                </p>
              </div>
            </div>
          )}

          <p style={{ fontSize: 12, color: '#6B7280', marginBottom: 12 }}>Propose up to 3 alternative slots. Family will choose one via WhatsApp.</p>

          {/* Slot tabs */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
            {(['Option 1', 'Option 2', 'Option 3'] as const).map((label, i) => {
              const filled = slots[i].date !== null
              const isActive = activeSlot === i
              return (
                <button
                  key={label}
                  onClick={() => setActiveSlot(i as 0 | 1 | 2)}
                  style={{
                    flex: 1, padding: '8px 4px', borderRadius: 10, border: 'none', cursor: 'pointer',
                    background: isActive ? '#0E2A1F' : filled ? '#F0FDF4' : '#F3F4F6',
                    color: isActive ? '#A8D5B5' : filled ? '#15803D' : '#6B7280',
                    fontSize: 11, fontWeight: 700,
                    transition: 'all 140ms ease',
                  }}
                >
                  <div>{label}{i === 0 ? ' *' : ''}</div>
                  {filled && !isActive && (
                    <div style={{ fontSize: 9, marginTop: 2, color: '#16A34A', fontWeight: 600 }}>
                      {slotLabel(slots[i])?.split(',')[0]}
                    </div>
                  )}
                </button>
              )
            })}
          </div>

          {/* Active slot picker */}
          <div style={{ marginBottom: 12 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', marginBottom: 8, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Date</p>
            <CalendarPicker
              value={cur.date}
              onChange={d => setSlotField(activeSlot, { date: d })}
              requestedDate={null}
            />
          </div>
          <div style={{ marginBottom: 12 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', marginBottom: 8, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Time</p>
            <TimeSlots
              selectedHour={cur.hour} selectedMinute={cur.minute}
              requestedHour={null} requestedMinute={null}
              onChange={(h, m) => setSlotField(activeSlot, { hour: h, minute: m })}
            />
          </div>

          {/* Slots summary */}
          {slots.some(s => s.date) && (
            <div style={{ background: '#F9FAFB', borderRadius: 12, padding: '10px 14px', marginTop: 4 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Proposing</p>
              {slots.map((s, i) => s.date ? (
                <p key={i} style={{ fontSize: 12, color: '#111', margin: '4px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 18, height: 18, borderRadius: '50%', background: '#0E2A1F', color: '#A8D5B5', fontSize: 10, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</span>
                  {slotLabel(s)}
                </p>
              ) : null)}
            </div>
          )}

          {!hasWa && (
            <div style={{ display: 'flex', gap: 8, padding: '10px 14px', background: '#FEF3C7', border: '1px solid #FCD34D', borderRadius: 12, marginTop: 12 }}>
              <span style={{ color: '#D97706', flexShrink: 0 }}>⚠</span>
              <p style={{ fontSize: 12, color: '#92400E', fontWeight: 500, margin: 0 }}>No WhatsApp number — status will update but message won't send.</p>
            </div>
          )}
        </div>

        <div style={{ borderTop: '1px solid #F3F4F6', padding: '14px 20px', display: 'flex', gap: 10 }}>
          <button
            onClick={handleSend}
            disabled={saving || !slots[0].date}
            style={{
              flex: 1, padding: '12px 16px', borderRadius: 10, border: 'none', cursor: slots[0].date ? 'pointer' : 'not-allowed',
              background: slots[0].date ? '#B91C1C' : '#F3F4F6',
              color: slots[0].date ? '#fff' : '#9CA3AF',
              fontWeight: 700, fontSize: 14,
            }}
          >
            {saving ? 'Sending…' : hasWa ? 'Send reschedule options on WhatsApp →' : 'Mark as needs reschedule'}
          </button>
          <button
            onClick={onClose}
            style={{ padding: '12px 16px', borderRadius: 10, border: '1px solid #E5E7EB', background: '#fff', color: '#6B7280', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}
          >
            Cancel
          </button>
        </div>
      </div>
    </>
  )
}

// ── Requests tab ─────────────────────────────────────────────────────────────

interface BookingRequest {
  id: string
  user_id: string | null
  service_id: string
  service_name: string
  amount_paise: number | null
  scheduled_at: string | null
  recipient_name: string
  recipient_address: string
  requester_whatsapp: string
  notes: string | null
  status: string
  created_at: string
  companion_name?: string | null
  payment_status?: string | null
  confirmed_at?: string | null
  _family_name?: string | null
}

function RequestsTab() {
  const { showToast } = useToast()
  const [requests, setRequests]           = useState<BookingRequest[]>([])
  const [loading, setLoading]             = useState(true)
  const [error, setError]                 = useState<string | null>(null)
  const [confirmTarget, setConfirmTarget]       = useState<BookingRequest | null>(null)
  const [drawerTarget, setDrawerTarget]         = useState<BookingRequest | null>(null)
  const [rescheduleTarget, setRescheduleTarget] = useState<BookingRequest | null>(null)

  useEffect(() => { loadRequests() }, [])

  async function loadRequests() {
    setLoading(true); setError(null)
    const { data, error: err } = await supabase
      .from('booking_requests')
      .select('*')
      .order('created_at', { ascending: false })

    if (err) { setError('Could not load requests.'); setLoading(false); return }

    const rows: BookingRequest[] = data || []

    // Enrich with family names (booking_requests.user_id = profiles.id)
    const userIds = [...new Set(rows.filter(r => r.user_id).map(r => r.user_id!))]
    if (userIds.length) {
      const { data: profs } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds)
      const nameMap = new Map((profs || []).map(p => [p.id, p.full_name as string]))
      rows.forEach(r => { r._family_name = r.user_id ? (nameMap.get(r.user_id) ?? null) : null })
    }

    setRequests(rows)
    setLoading(false)
  }

  async function cancelRequest(id: string) {
    const { error: err } = await supabase.from('booking_requests').update({ status: 'cancelled' }).eq('id', id)
    if (err) { showToast('Could not cancel', 'error'); return }
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'cancelled' } : r))
    showToast('Booking cancelled', 'success')
  }

  const needsDetailsCount = requests.filter(r => r.status === 'needs_details').length

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {[...Array(3)].map((_, i) => <Skeleton key={i} h={88} />)}
    </div>
  )

  if (error) return <ErrorBox onRetry={loadRequests} />

  if (requests.length === 0) return (
    <EmptyState title="No booking requests yet" sub="Requests from the family dashboard will appear here." />
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {needsDetailsCount > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#FEF3C7', border: '1px solid #FCD34D', borderRadius: 10, padding: '10px 16px' }}>
          <span style={{ fontSize: 14, color: '#D97706', flexShrink: 0 }}>⚠</span>
          <p style={{ fontSize: 14, color: '#92400E' }}>
            <span style={{ fontWeight: 700 }}>{needsDetailsCount} request{needsDetailsCount > 1 ? 's' : ''} need{needsDetailsCount === 1 ? 's' : ''} details</span>
            {' '}— do not dispatch a companion until address and WhatsApp are confirmed.
          </p>
        </div>
      )}

      {requests.map(r => {
        const missingAddress  = !r.recipient_address.trim()
        const missingWhatsapp = !r.requester_whatsapp.trim()
        const isNeedsDetails    = r.status === 'needs_details'
        const isPaid            = r.status === 'paid'
        const isCancelled       = r.status === 'cancelled'
        const isCompConfirmed   = r.status === 'companion_confirmed'
        const isNeedsReschedule = r.status === 'needs_reschedule'
        const needsConfirm      = r.status === 'requested' || isNeedsDetails

        const borderLeftStyle = isNeedsDetails
          ? '3px solid var(--gold)'
          : isNeedsReschedule
          ? '3px solid #EF4444'
          : isPaid
          ? '3px solid var(--forest)'
          : isCompConfirmed
          ? '3px solid #2563EB'
          : undefined

        return (
          <div
            key={r.id}
            className="adm-card"
            style={{
              borderLeft: borderLeftStyle,
              opacity: isCancelled ? 0.6 : 1,
              overflow: 'hidden',
            }}
          >
            {isNeedsDetails && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', background: '#FEF3C7', borderBottom: '1px solid #FCD34D' }}>
                <span style={{ fontSize: 13, color: '#D97706', flexShrink: 0 }}>⚠</span>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#92400E' }}>
                  Missing: {[missingAddress && 'address', missingWhatsapp && 'WhatsApp'].filter(Boolean).join(' + ')}
                  {' '}— contact the family before confirming
                </p>
              </div>
            )}
            {isPaid && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', background: '#DCFCE7', borderBottom: '1px solid #86EFAC' }}>
                <span style={{ fontSize: 13, color: 'var(--green)', flexShrink: 0 }}>✓</span>
                <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--forest)' }}>Payment received · Visit confirmed</p>
              </div>
            )}
            {isCompConfirmed && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', background: '#EFF6FF', borderBottom: '1px solid #BFDBFE' }}>
                <span style={{ fontSize: 13, color: '#2563EB', flexShrink: 0 }}>✓</span>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#1D4ED8' }}>Companion confirmed · Awaiting payment</p>
              </div>
            )}
            {isNeedsReschedule && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', background: '#FEE2E2', borderBottom: '1px solid #FCA5A5' }}>
                <span style={{ fontSize: 13, color: '#DC2626', flexShrink: 0 }}>⚠</span>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#991B1B' }}>Awaiting reschedule — family has been contacted</p>
              </div>
            )}

            <div style={{ padding: '12px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', minWidth: 0 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 700, color: 'var(--forest)', fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {SERVICE_NAMES[r.service_id] || r.service_name}
                  </p>
                  {r._family_name && (
                    <p style={{ fontSize: 12, color: 'var(--gray-mid)', marginTop: 2 }}>Family: {r._family_name}</p>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                  <Badge tone={statusTone(r.status)}>
                    {LABEL[r.status] || r.status.replace(/_/g, ' ')}
                  </Badge>
                  {r.amount_paise && (
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--forest)' }}>
                      ₹{(r.amount_paise / 100).toLocaleString('en-IN')}
                    </span>
                  )}
                </div>
              </div>

              <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <p style={{ fontSize: 12, color: 'var(--gray-mid)' }}>
                  <span style={{ fontWeight: 500, color: 'var(--gray-dark)' }}>{r.recipient_name || '—'}</span>
                  {r.scheduled_at ? ` · ${format(new Date(r.scheduled_at), 'd MMM, h:mm a')}` : ''}
                  {' · '}{format(new Date(r.created_at), 'd MMM HH:mm')}
                </p>
                {r.companion_name && (
                  <p style={{ fontSize: 12, color: '#1D4ED8', fontWeight: 500 }}>👤 {r.companion_name}</p>
                )}
                <p style={{ fontSize: 12, color: missingAddress ? 'var(--clay)' : 'var(--gray-mid)', fontWeight: missingAddress ? 700 : 400 }}>
                  📍 {r.recipient_address || 'Address not provided'}
                </p>
                <p style={{ fontSize: 12, color: missingWhatsapp ? 'var(--clay)' : 'var(--gray-mid)', fontWeight: missingWhatsapp ? 700 : 400 }}>
                  💬 {r.requester_whatsapp || 'WhatsApp not provided'}
                </p>
                {r.notes && <p style={{ fontSize: 12, color: 'var(--gray-mid)', fontStyle: 'italic' }}>"{r.notes}"</p>}
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--line)', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              {needsConfirm && (
                <button
                  onClick={() => setDrawerTarget(r)}
                  className="adm-btn adm-btn-primary"
                  style={{ fontSize: 12, padding: '6px 12px' }}
                >
                  Confirm booking →
                </button>
              )}
              {(needsConfirm || isNeedsReschedule) && (
                <button
                  onClick={() => setRescheduleTarget(r)}
                  className="adm-btn"
                  style={{ fontSize: 12, padding: '6px 12px', color: '#B91C1C', border: '1px solid #FCA5A5' }}
                >
                  Can't serve this time
                </button>
              )}

              {isCompConfirmed && (
                <button
                  onClick={() => setConfirmTarget(r)}
                  style={{
                    fontSize: 12, padding: '7px 14px', borderRadius: 8, border: '1.5px solid #93C5FD',
                    background: '#EFF6FF', color: '#1D4ED8', fontWeight: 700, cursor: 'pointer',
                  }}
                >
                  ✉️ Send payment reminder
                </button>
              )}

              {!isCancelled && !isPaid && (
                <button
                  onClick={() => { if (window.confirm('Cancel this booking?')) cancelRequest(r.id) }}
                  className="adm-btn"
                  style={{ fontSize: 12, color: '#EF4444', marginLeft: 'auto', border: 'none', background: 'none' }}
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        )
      })}

      {drawerTarget && (
        <ConfirmDrawer
          request={drawerTarget}
          onClose={() => setDrawerTarget(null)}
          onConfirmed={(id, updates) => {
            setRequests(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r))
            setDrawerTarget(null)
          }}
        />
      )}

      {rescheduleTarget && (
        <RescheduleDrawer
          request={rescheduleTarget}
          onClose={() => setRescheduleTarget(null)}
          onSent={id => {
            setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'needs_reschedule' } : r))
            setRescheduleTarget(null)
          }}
        />
      )}

      {confirmTarget && (
        <ConfirmModal
          request={confirmTarget}
          onClose={() => setConfirmTarget(null)}
          onSent={id => setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'confirmed' } : r))}
        />
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function AdminBookings() {
  const { showToast } = useToast()
  const [tab, setTab] = useState<'bookings' | 'requests'>('requests')
  const [bookings, setBookings] = useState<any[]>([])
  const [companions, setCompanions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [savingId, setSavingId] = useState<string | null>(null)
  const [payoutInputs, setPayoutInputs] = useState<Record<string, string>>({})
  // Pending status change — waits for a note before calling the edge function
  const [pendingStatus, setPendingStatus] = useState<{
    bookingId: string; status: string; note: string; rescheduleTime: string
  } | null>(null)

  useEffect(() => { if (tab === 'bookings') load() }, [tab])

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const [bookingsRes, companionsRes] = await Promise.all([
        supabase.from('bookings')
          .select('*, loved_ones(full_name,city), companions(full_name,phone), booking_status_history(status,changed_at,note)')
          .order('created_at', { ascending: false }),
        supabase.from('companions').select('id,full_name,phone').order('full_name'),
      ])
      if (bookingsRes.error) throw bookingsRes.error
      if (companionsRes.error) throw companionsRes.error
      setBookings(bookingsRes.data || [])
      setCompanions(companionsRes.data || [])
      const payouts: Record<string, string> = {}
      ;(bookingsRes.data || []).forEach((b: any) => {
        payouts[b.id] = b.companion_payout_paise != null ? String(b.companion_payout_paise / 100) : ''
      })
      setPayoutInputs(payouts)
    } catch (err) {
      console.error('Failed to load bookings:', err)
      setError('Something went wrong — please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function assignCompanion(b: any, companionId: string) {
    setSavingId(b.id)
    try {
      const newStatus = (b.status === 'pending' || b.status === 'confirmed') ? 'companion_assigned' : b.status
      const { error } = await supabase.from('bookings')
        .update({ companion_id: companionId || null, status: companionId ? newStatus : b.status })
        .eq('id', b.id)
      if (error) throw error
      const companion = companions.find(c => c.id === companionId)
      setBookings(prev => prev.map(x => x.id === b.id ? {
        ...x,
        companion_id: companionId || null,
        status: companionId ? newStatus : b.status,
        companions: companion ? { full_name: companion.full_name, phone: companion.phone } : null,
      } : x))
      showToast(companionId ? 'Companion assigned' : 'Companion removed', 'success')
    } catch {
      showToast('Could not assign companion — try again', 'error')
    } finally {
      setSavingId(null)
    }
  }

  // Called when admin picks from the status dropdown
  function handleStatusSelect(b: any, newStatus: string) {
    if (newStatus === b.status) return
    if (NEEDS_NOTE.has(newStatus)) {
      setPendingStatus({ bookingId: b.id, status: newStatus, note: '', rescheduleTime: '' })
    } else {
      updateStatusViaEdge(b.id, b.status, newStatus)
    }
  }

  async function updateStatusViaEdge(
    bookingId: string,
    _prevStatus: string,
    newStatus: string,
    note?: string,
    rescheduleTime?: string,
  ) {
    setSavingId(bookingId)
    try {
      const { data, error } = await supabase.functions.invoke('update-booking-status', {
        body: { booking_id: bookingId, new_status: newStatus, note, reschedule_time: rescheduleTime || undefined },
      })
      if (error || !data?.ok) throw new Error(data?.error || error?.message || 'Unknown error')
      setBookings(prev => prev.map(x => x.id === bookingId
        ? { ...x, status: newStatus, attention_needed: false, scheduled_at: rescheduleTime || x.scheduled_at }
        : x))
      setPendingStatus(null)
      showToast('Status updated — family notified', 'success')
    } catch (e: any) {
      showToast(`Could not update: ${e?.message || 'try again'}`, 'error')
    } finally {
      setSavingId(null)
    }
  }

  async function markPaymentReceived(b: any) {
    setSavingId(b.id)
    try {
      const { error } = await supabase.from('bookings')
        .update({ payment_status: 'received', status: 'confirmed' })
        .eq('id', b.id)
      if (error) throw error
      setBookings(prev => prev.map(x => x.id === b.id ? { ...x, payment_status: 'received', status: 'confirmed' } : x))
      showToast('Payment received — booking confirmed', 'success')
    } catch {
      showToast('Could not update payment — try again', 'error')
    } finally {
      setSavingId(null)
    }
  }

  async function savePayout(b: any) {
    const raw = payoutInputs[b.id]
    const payoutPaise = raw === '' || raw == null ? null : Math.round(parseFloat(raw) * 100)
    if (raw !== '' && (payoutPaise === null || isNaN(payoutPaise) || payoutPaise < 0)) {
      showToast('Enter a valid payout amount', 'error')
      return
    }
    setSavingId(b.id)
    try {
      const { error } = await supabase.from('bookings').update({ companion_payout_paise: payoutPaise }).eq('id', b.id)
      if (error) throw error
      setBookings(prev => prev.map(x => x.id === b.id ? { ...x, companion_payout_paise: payoutPaise } : x))
      showToast('Payout saved', 'success')
    } catch {
      showToast('Could not save payout — try again', 'error')
    } finally {
      setSavingId(null)
    }
  }

  const filtered = bookings
    .filter(b => {
      if (statusFilter === 'needs_attention') return b.attention_needed
      if (statusFilter !== 'all' && b.status !== statusFilter) return false
      if (search) {
        const q = search.toLowerCase()
        return b.loved_ones?.full_name?.toLowerCase().includes(q) ||
               b.companions?.full_name?.toLowerCase().includes(q)
      }
      return true
    })
    .sort((a, b) => {
      // Overdue first, then unassigned, then by date
      if (a.attention_needed && !b.attention_needed) return -1
      if (!a.attention_needed && b.attention_needed) return 1
      const aUnassigned = !a.companion_id && !['completed', 'cancelled'].includes(a.status)
      const bUnassigned = !b.companion_id && !['completed', 'cancelled'].includes(b.status)
      if (aUnassigned && !bUnassigned) return -1
      if (!aUnassigned && bUnassigned) return 1
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })

  const unassignedCount  = bookings.filter(b => !b.companion_id && !['completed', 'cancelled'].includes(b.status)).length
  const overdueCount     = bookings.filter(b => b.attention_needed).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <h1 className="adm-page-h">Bookings</h1>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4 }}>
        {([['requests', 'Requests'], ['bookings', 'Confirmed bookings']] as const).map(([t, label]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`adm-pill-f${tab === t ? ' is-active' : ''}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'requests' ? (
        <RequestsTab />
      ) : (
        <>
          <p style={{ fontSize: 14, color: 'var(--gray-mid)', marginTop: -8 }}>
            {bookings.length} total
            {unassignedCount > 0 && (
              <span style={{ marginLeft: 8, color: 'var(--gold)', fontWeight: 700 }}>· {unassignedCount} need a companion</span>
            )}
          </p>

          {error && <ErrorBox onRetry={load} />}

          <div style={{ display: 'flex', flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="adm-input"
            >
              <option value="all">All statuses</option>
              <option value="needs_attention">⚠ Needs attention{overdueCount > 0 ? ` (${overdueCount})` : ''}</option>
              {ALL_STATUSES.map(s => (
                <option key={s} value={s}>{LABEL[s] || s.replace(/_/g, ' ')}</option>
              ))}
            </select>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search family or companion…"
              className="adm-input"
              style={{ flex: 1, minWidth: 160 }}
            />
          </div>

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[...Array(5)].map((_, i) => <Skeleton key={i} h={88} />)}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState title="No bookings found" sub="Try a different filter or search." />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {filtered.map(b => {
                const isUnassigned = !b.companion_id && !['completed', 'cancelled'].includes(b.status)
                const isSaving = savingId === b.id
                const isOverdue = b.attention_needed
                const hasPending = pendingStatus?.bookingId === b.id
                const payoutRupees = b.companion_payout_paise != null ? `₹${(b.companion_payout_paise / 100).toLocaleString('en-IN')}` : null
                const amountRupees = b.amount_paise ? `₹${(b.amount_paise / 100).toLocaleString('en-IN')}` : '—'

                return (
                  <div
                    key={b.id}
                    className="adm-card"
                    style={{
                      borderLeft: isOverdue ? '3px solid #EF4444' : isUnassigned ? '3px solid var(--gold)' : undefined,
                      overflow: 'hidden',
                    }}
                  >
                    <div style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', minWidth: 0 }}>
                        <p style={{ fontWeight: 700, color: 'var(--forest)', fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>
                          {SERVICE_NAMES[b.service_type] || b.service_type}
                        </p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                          {isOverdue && (
                            <Badge tone="red">⚠ NEEDS ATTENTION</Badge>
                          )}
                          {isUnassigned && !isOverdue && (
                            <Badge tone="amber">NEEDS COMPANION</Badge>
                          )}
                          <Badge tone={statusTone(b.status)}>
                            {LABEL[b.status] || b.status.replace(/_/g, ' ')}
                          </Badge>
                          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--forest)' }}>{amountRupees}</span>
                        </div>
                      </div>

                      <p style={{ fontSize: 12, color: 'var(--gray-mid)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {b.loved_ones?.full_name || '—'}
                        {b.loved_ones?.city ? ` · ${b.loved_ones.city}` : ''}
                        {b.scheduled_at ? ` · ${format(new Date(b.scheduled_at), 'd MMM, h:mm a')}` : ''}
                        {payoutRupees ? ` · payout ${payoutRupees}` : ''}
                      </p>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                        <Badge tone={paymentTone(b.payment_status)}>
                          {b.payment_status === 'paid' || b.payment_status === 'received' ? 'Paid' : 'Payment pending'}
                        </Badge>
                        {b.payment_status === 'pending' && (
                          <button
                            onClick={() => markPaymentReceived(b)}
                            disabled={isSaving}
                            className="adm-btn"
                            style={{ fontSize: 11, padding: '2px 8px', color: 'var(--forest)', fontWeight: 700, opacity: isSaving ? 0.5 : 1 }}
                          >
                            ✓ Mark received
                          </button>
                        )}
                      </div>
                    </div>

                    <div style={{ borderTop: '1px solid var(--line)', padding: '10px 16px', display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                      <div style={{ position: 'relative', flex: 1, minWidth: 140 }}>
                        <select
                          value={b.companion_id || ''}
                          onChange={e => assignCompanion(b, e.target.value)}
                          disabled={isSaving}
                          className="adm-input"
                          style={{ width: '100%', fontSize: 12, padding: '6px 10px', color: isUnassigned ? 'var(--gold)' : 'var(--gray-dark)', opacity: isSaving ? 0.5 : 1 }}
                        >
                          <option value="">— Assign companion —</option>
                          {companions.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                        </select>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <select
                          value={hasPending ? pendingStatus!.status : b.status}
                          onChange={e => handleStatusSelect(b, e.target.value)}
                          disabled={isSaving}
                          className="adm-input"
                          style={{ fontSize: 12, padding: '6px 10px', opacity: isSaving ? 0.5 : 1 }}
                        >
                          {ALL_STATUSES.map(s => (
                            <option key={s} value={s}>{LABEL[s] || s.replace(/_/g, ' ')}</option>
                          ))}
                        </select>

                        {/* Inline note form for delayed / rescheduled / cancelled */}
                        {hasPending && (
                          <div style={{
                            background: '#FFF8F0', border: '1px solid #FBD5A5', borderRadius: 10,
                            padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6,
                          }}>
                            {pendingStatus!.status === 'rescheduled' && (
                              <input
                                type="datetime-local"
                                className="adm-input"
                                style={{ fontSize: 12, padding: '6px 8px' }}
                                value={pendingStatus!.rescheduleTime}
                                onChange={e => setPendingStatus(p => p && ({ ...p, rescheduleTime: e.target.value }))}
                              />
                            )}
                            <textarea
                              placeholder={
                                pendingStatus!.status === 'delayed'      ? 'Reason for delay (sent to family)…' :
                                pendingStatus!.status === 'rescheduled'  ? 'Reason for reschedule (optional)…' :
                                'Reason for cancellation (sent to family)…'
                              }
                              rows={2}
                              className="adm-input"
                              style={{ fontSize: 12, padding: '6px 8px', resize: 'none', fontFamily: 'inherit' }}
                              value={pendingStatus!.note}
                              onChange={e => setPendingStatus(p => p && ({ ...p, note: e.target.value }))}
                            />
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button
                                onClick={() => updateStatusViaEdge(
                                  b.id, b.status, pendingStatus!.status,
                                  pendingStatus!.note,
                                  pendingStatus!.rescheduleTime || undefined,
                                )}
                                disabled={isSaving}
                                className="adm-btn adm-btn-primary"
                                style={{ fontSize: 11, padding: '4px 12px', opacity: isSaving ? 0.5 : 1 }}
                              >
                                {isSaving ? '…' : 'Confirm & notify family'}
                              </button>
                              <button
                                onClick={() => setPendingStatus(null)}
                                className="adm-btn"
                                style={{ fontSize: 11, padding: '4px 10px', color: 'var(--gray-mid)' }}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 12, color: 'var(--gray-mid)' }}>₹</span>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={payoutInputs[b.id] ?? ''}
                          onChange={e => setPayoutInputs(prev => ({ ...prev, [b.id]: e.target.value }))}
                          placeholder="Payout"
                          className="adm-input"
                          style={{ width: 80, fontSize: 12, padding: '6px 8px' }}
                        />
                        <button
                          type="button"
                          onClick={() => setPayoutInputs(prev => ({ ...prev, [b.id]: String(Math.round((b.amount_paise || 0) * 0.7 / 100)) }))}
                          className="adm-btn"
                          style={{ fontSize: 10, padding: '4px 8px', color: 'var(--gray-mid)', border: 'none', background: 'none' }}
                        >
                          70%
                        </button>
                        <button
                          type="button"
                          onClick={() => savePayout(b)}
                          disabled={isSaving}
                          className="adm-btn adm-btn-primary"
                          style={{ fontSize: 10, padding: '4px 10px', opacity: isSaving ? 0.5 : 1 }}
                        >
                          {isSaving ? '…' : 'Save'}
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}
