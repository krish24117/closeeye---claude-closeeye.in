import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { CardSkeleton } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'
import { format } from 'date-fns'
import { SERVICE_NAMES } from '@/lib/booking-labels'
import { ChevronDown, AlertTriangle, X, CheckCircle2 } from 'lucide-react'

const ALL_STATUSES = ['pending', 'confirmed', 'companion_assigned', 'in_progress', 'completed', 'cancelled']

const BADGE: Record<string, string> = {
  pending:              'bg-amber-100 text-amber-700',
  confirmed:            'bg-blue-100 text-blue-700',
  companion_assigned:   'bg-purple-100 text-purple-700',
  in_progress:          'bg-green-100 text-green-700',
  completed:            'bg-gray-100 text-gray-500',
  cancelled:            'bg-red-100 text-red-600',
  requested:            'bg-amber-100 text-amber-700',
  needs_details:        'bg-orange-100 text-orange-700',
  needs_reschedule:     'bg-red-100 text-red-700',
  scheduled:            'bg-blue-100 text-blue-700',
  companion_confirmed:  'bg-blue-100 text-blue-700',
  paid:                 'bg-green-100 text-green-700',
}

const PAYMENT_BADGE: Record<string, string> = {
  pending:  'bg-orange-50 text-orange-700',
  received: 'bg-green-100 text-green-700',
  paid:     'bg-green-100 text-green-700',
  failed:   'bg-red-100 text-red-700',
}

const LABEL: Record<string, string> = {
  requested:           'Request received',
  needs_details:       'Needs details',
  needs_reschedule:    'Awaiting reschedule',
  confirmed:           'Confirmed',
  scheduled:           'Scheduled',
  companion_confirmed: 'Companion confirmed',
  paid:                'Visit confirmed',
  cancelled:           'Cancelled',
}

function StatusLabel({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${BADGE[status] || 'bg-gray-100 text-gray-500'}`}>
      {status === 'in_progress' && <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />}
      {status === 'needs_details' && <AlertTriangle size={10} />}
      {LABEL[status] || status.replace(/_/g, ' ')}
    </span>
  )
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
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-[2px]"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <p className="font-semibold text-green-900">Send confirmation</p>
            <p className="text-xs text-gray-400 mt-0.5">
              To: {request.requester_whatsapp || '—'} · for {request.recipient_name}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-700 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Template (editable) */}
        <div className="flex-1 overflow-auto px-5 py-4">
          <p className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide">WhatsApp message — review before sending</p>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            rows={18}
            className="w-full text-sm text-gray-800 bg-green-50 border border-green-100 rounded-xl p-4 resize-none focus:outline-none focus:border-green-400 font-mono leading-relaxed"
          />
          <p className="text-xs text-gray-400 mt-2">
            This opens WhatsApp with the message pre-filled. Review, then tap Send in WhatsApp.
            Status will auto-update to <span className="font-semibold">Confirmed</span>.
          </p>
          {!hasNumber && (
            <div className="flex items-center gap-2 mt-3 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2">
              <AlertTriangle size={13} className="text-orange-600 flex-shrink-0" />
              <p className="text-xs text-orange-700 font-medium">No WhatsApp number on this request — get it from the family before confirming.</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-5 py-4 border-t border-gray-100 flex gap-3">
          <button
            onClick={handleSend}
            disabled={!hasNumber || sending}
            className="flex-1 bg-green-800 text-white text-sm font-semibold rounded-xl py-3 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {sending ? 'Opening…' : 'Open in WhatsApp →'}
          </button>
          <button onClick={onClose} className="text-sm text-gray-500 hover:text-gray-700 px-4">
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

// ── ConfirmDrawer ─────────────────────────────────────────────────────────────

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
  const [companionName, setCompanionName] = useState(request.companion_name || '')
  const [scheduledAt, setScheduledAt]     = useState(
    request.scheduled_at ? request.scheduled_at.slice(0, 16) : ''
  )
  const [amountRupees, setAmountRupees] = useState(
    request.amount_paise ? String(Math.round(request.amount_paise / 100)) : ''
  )
  const [saving, setSaving] = useState(false)

  const familyName = request._family_name || 'there'
  const elderName  = request.recipient_name || 'your loved one'
  const waNumber   = request.requester_whatsapp.replace(/\D/g, '')
  const hasWa      = waNumber.length >= 7

  function buildWhatsAppMessage(): string {
    const dateStr = scheduledAt
      ? new Date(scheduledAt).toLocaleDateString('en-IN', {
          weekday: 'long', day: 'numeric', month: 'long',
          hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata',
        })
      : '—'
    return [
      `Namaste ${familyName} 🌿`,
      ``,
      `Your Close Eye visit has been confirmed!`,
      ``,
      `🏠 ${request.service_name} for ${elderName}`,
      ...(scheduledAt ? [`📅 ${dateStr} IST`] : []),
      ...(companionName ? [`👤 Companion: ${companionName}`] : []),
      ...(amountRupees ? [`💳 Amount: ₹${amountRupees}`] : []),
      ``,
      `To complete your booking, open the Close Eye app and pay now. Once paid, your visit is locked.`,
      ``,
      `Warm regards,`,
      `Team Close Eye`,
      `When you can't be there, Close Eye can.`,
    ].join('\n')
  }

  async function handleConfirm() {
    if (!companionName.trim()) { showToast('Enter a companion name', 'error'); return }
    setSaving(true)
    try {
      const amountPaise = amountRupees ? Math.round(parseFloat(amountRupees) * 100) : request.amount_paise
      const updates: Record<string, unknown> = {
        status: 'companion_confirmed',
        companion_name: companionName.trim(),
        confirmed_at: new Date().toISOString(),
        ...(scheduledAt ? { scheduled_at: new Date(scheduledAt).toISOString() } : {}),
        ...(amountPaise ? { amount_paise: amountPaise } : {}),
      }
      const { error } = await supabase.from('booking_requests').update(updates).eq('id', request.id)
      if (error) throw error
      onConfirmed(request.id, updates as Partial<BookingRequest>)
      // Open WhatsApp with pre-filled payment-prompt message
      if (hasWa) {
        window.open(`https://wa.me/${waNumber}?text=${encodeURIComponent(buildWhatsAppMessage())}`, '_blank')
      }
      onClose()
    } catch {
      showToast('Could not confirm booking — try again', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-[2px]"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <p className="font-semibold text-green-900">Confirm booking</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {request.service_name} for {elderName}
              {familyName !== 'there' ? ` · ${familyName}` : ''}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-700 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-auto px-5 py-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Companion name *</label>
            <input
              type="text"
              value={companionName}
              onChange={e => setCompanionName(e.target.value)}
              placeholder="e.g. Priya Sharma"
              className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-green-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Visit date & time</label>
            {request.scheduled_at && (
              <div className="flex items-center gap-1.5 mb-1.5 px-2.5 py-1.5 bg-blue-50 border border-blue-100 rounded-lg">
                <span className="text-xs text-blue-600">📅</span>
                <span className="text-xs font-medium text-blue-700">
                  User requested:{' '}
                  {new Date(request.scheduled_at).toLocaleString('en-IN', {
                    weekday: 'short', day: 'numeric', month: 'short',
                    hour: 'numeric', minute: '2-digit', hour12: true,
                  })}
                </span>
              </div>
            )}
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={e => setScheduledAt(e.target.value)}
              className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-green-600"
            />
            {!scheduledAt && (
              <p className="text-xs text-amber-600 mt-1">No time set — enter the confirmed visit time.</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Amount (₹)</label>
            <input
              type="number"
              min="1"
              step="1"
              value={amountRupees}
              onChange={e => setAmountRupees(e.target.value)}
              placeholder="e.g. 999"
              className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-green-600"
            />
            <p className="text-xs text-gray-400 mt-1">Family will see this amount in the app and be asked to pay.</p>
          </div>

          {!hasWa && (
            <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-xl px-3 py-2.5">
              <AlertTriangle size={13} className="text-orange-600 flex-shrink-0" />
              <p className="text-xs text-orange-700 font-medium">No WhatsApp number — status will still be updated, but notification won't send.</p>
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-gray-100 flex gap-3">
          <button
            onClick={handleConfirm}
            disabled={saving || !companionName.trim()}
            className="flex-1 bg-green-800 text-white text-sm font-semibold rounded-xl py-3 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? 'Saving…' : hasWa ? 'Confirm & notify on WhatsApp →' : 'Confirm booking'}
          </button>
          <button onClick={onClose} className="text-sm text-gray-500 hover:text-gray-700 px-4">Cancel</button>
        </div>
      </div>
    </div>
  )
}

// ── RescheduleDrawer ──────────────────────────────────────────────────────────

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
  const [slot1, setSlot1] = useState('')
  const [slot2, setSlot2] = useState('')
  const [slot3, setSlot3] = useState('')
  const [saving, setSaving] = useState(false)

  const familyName = request._family_name || 'there'
  const elderName  = request.recipient_name || 'your loved one'
  const waNumber   = request.requester_whatsapp.replace(/\D/g, '')
  const hasWa      = waNumber.length >= 7

  function formatSlot(dt: string): string {
    if (!dt) return ''
    return new Date(dt).toLocaleString('en-IN', {
      weekday: 'short', day: 'numeric', month: 'short',
      hour: 'numeric', minute: '2-digit', hour12: true,
    })
  }

  function buildMessage(): string {
    const requested = request.scheduled_at
      ? new Date(request.scheduled_at).toLocaleString('en-IN', {
          weekday: 'short', day: 'numeric', month: 'short',
          hour: 'numeric', minute: '2-digit', hour12: true,
        })
      : null
    const slots = [slot1, slot2, slot3].filter(Boolean).map((s, i) => `  ${i + 1}. ${formatSlot(s)}`)
    return [
      `Namaste ${familyName} 🙏`,
      ``,
      `We're sorry — we're unable to serve your ${request.service_name} visit${requested ? ` on ${requested}` : ''} as requested.`,
      ``,
      `We can offer these alternative times for ${elderName}:`,
      ...slots,
      ``,
      `Please reply with your preferred option (1, 2, or 3) and we'll confirm right away.`,
      ``,
      `Warm regards,`,
      `Team Close Eye`,
    ].join('\n')
  }

  async function handleSend() {
    if (!slot1) { showToast('Add at least one alternative slot', 'error'); return }
    setSaving(true)
    try {
      await supabase.from('booking_requests').update({ status: 'needs_reschedule' }).eq('id', request.id)
      if (hasWa) {
        window.open(`https://wa.me/${waNumber}?text=${encodeURIComponent(buildMessage())}`, '_blank')
      }
      onSent(request.id)
      onClose()
      showToast('Reschedule request sent', 'success')
    } catch {
      showToast('Could not update — try again', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-[2px]"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <p className="font-semibold text-red-800">Can't serve this time</p>
            <p className="text-xs text-gray-400 mt-0.5">{request.service_name} · {elderName}</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-700"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-auto px-5 py-4 space-y-4">
          {request.scheduled_at && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-3 py-2.5">
              <span className="text-sm">📅</span>
              <p className="text-xs text-red-700 font-medium">
                User requested: {new Date(request.scheduled_at).toLocaleString('en-IN', {
                  weekday: 'short', day: 'numeric', month: 'short',
                  hour: 'numeric', minute: '2-digit', hour12: true,
                })} — unable to serve
              </p>
            </div>
          )}

          <p className="text-xs text-gray-500">Propose up to 3 alternatives. The family will receive a WhatsApp message to choose one.</p>

          {[
            { label: 'Option 1 *', value: slot1, set: setSlot1 },
            { label: 'Option 2', value: slot2, set: setSlot2 },
            { label: 'Option 3', value: slot3, set: setSlot3 },
          ].map(({ label, value, set }) => (
            <div key={label}>
              <label className="block text-xs font-semibold text-gray-500 mb-1">{label}</label>
              <input
                type="datetime-local"
                value={value}
                onChange={e => set(e.target.value)}
                className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-red-400"
              />
            </div>
          ))}

          {!hasWa && (
            <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-xl px-3 py-2.5">
              <AlertTriangle size={13} className="text-orange-600 flex-shrink-0" />
              <p className="text-xs text-orange-700 font-medium">No WhatsApp number — status will update but message won't send.</p>
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-gray-100 flex gap-3">
          <button
            onClick={handleSend}
            disabled={saving || !slot1}
            className="flex-1 bg-red-700 text-white text-sm font-semibold rounded-xl py-3 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? 'Sending…' : hasWa ? 'Send reschedule request on WhatsApp →' : 'Mark as needs reschedule'}
          </button>
          <button onClick={onClose} className="text-sm text-gray-500 hover:text-gray-700 px-4">Cancel</button>
        </div>
      </div>
    </div>
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

  if (loading) return <div className="space-y-2">{[...Array(3)].map((_, i) => <CardSkeleton key={i} />)}</div>

  if (error) return (
    <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-4 flex items-center justify-between gap-3">
      {error}
      <button onClick={loadRequests} className="font-semibold underline">Retry</button>
    </div>
  )

  if (requests.length === 0) return (
    <div className="text-center py-16 bg-green-50 rounded-2xl">
      <p className="text-3xl mb-3">📋</p>
      <p className="font-semibold text-green-900">No booking requests yet</p>
      <p className="text-sm text-gray-400 mt-1">Requests from the family dashboard will appear here.</p>
    </div>
  )

  return (
    <div className="space-y-2">
      {needsDetailsCount > 0 && (
        <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-xl px-4 py-2.5">
          <AlertTriangle size={14} className="text-orange-600 flex-shrink-0" />
          <p className="text-sm text-orange-800">
            <span className="font-semibold">{needsDetailsCount} request{needsDetailsCount > 1 ? 's' : ''} need{needsDetailsCount === 1 ? 's' : ''} details</span>
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

        return (
          <div
            key={r.id}
            className={`bg-white rounded-2xl border transition-all ${
              isNeedsDetails    ? 'border-orange-300 border-l-4 border-l-orange-400'
              : isNeedsReschedule ? 'border-red-300 border-l-4 border-l-red-400'
              : isPaid          ? 'border-green-200 border-l-4 border-l-green-500'
              : isCompConfirmed ? 'border-blue-200 border-l-4 border-l-blue-400'
              : isCancelled     ? 'border-gray-100 opacity-60'
              : 'border-gray-100'
            }`}
          >
            {isNeedsDetails && (
              <div className="flex items-center gap-2 px-4 py-2 bg-orange-50 rounded-t-2xl border-b border-orange-100">
                <AlertTriangle size={13} className="text-orange-600 flex-shrink-0" />
                <p className="text-xs font-semibold text-orange-700">
                  Missing: {[missingAddress && 'address', missingWhatsapp && 'WhatsApp'].filter(Boolean).join(' + ')}
                  {' '}— contact the family before confirming
                </p>
              </div>
            )}
            {isPaid && (
              <div className="flex items-center gap-2 px-4 py-2 bg-green-50 rounded-t-2xl border-b border-green-100">
                <CheckCircle2 size={13} className="text-green-600 flex-shrink-0" />
                <p className="text-xs font-semibold text-green-700">Payment received · Visit confirmed</p>
              </div>
            )}
            {isNeedsReschedule && (
              <div className="flex items-center gap-2 px-4 py-2 bg-red-50 rounded-t-2xl border-b border-red-100">
                <AlertTriangle size={13} className="text-red-600 flex-shrink-0" />
                <p className="text-xs font-semibold text-red-700">Awaiting reschedule — family has been contacted</p>
              </div>
            )}

            <div className="px-4 py-3">
              <div className="flex items-center gap-2 flex-wrap min-w-0">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-green-900 text-sm truncate">
                    {SERVICE_NAMES[r.service_id] || r.service_name}
                  </p>
                  {r._family_name && (
                    <p className="text-xs text-gray-400 mt-0.5">Family: {r._family_name}</p>
                  )}
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <StatusLabel status={r.status} />
                  {r.amount_paise && (
                    <span className="text-xs font-semibold text-green-800">
                      ₹{(r.amount_paise / 100).toLocaleString('en-IN')}
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-1.5 space-y-0.5">
                <p className="text-xs text-gray-500">
                  <span className="font-medium text-gray-700">{r.recipient_name || '—'}</span>
                  {r.scheduled_at ? ` · ${format(new Date(r.scheduled_at), 'd MMM, h:mm a')}` : ''}
                  {' · '}{format(new Date(r.created_at), 'd MMM HH:mm')}
                </p>
                {r.companion_name && (
                  <p className="text-xs text-blue-700 font-medium">👤 {r.companion_name}</p>
                )}
                <p className={`text-xs ${missingAddress ? 'text-orange-600 font-semibold' : 'text-gray-500'}`}>
                  📍 {r.recipient_address || 'Address not provided'}
                </p>
                <p className={`text-xs ${missingWhatsapp ? 'text-orange-600 font-semibold' : 'text-gray-500'}`}>
                  💬 {r.requester_whatsapp || 'WhatsApp not provided'}
                </p>
                {r.notes && <p className="text-xs text-gray-400 italic">"{r.notes}"</p>}
              </div>
            </div>

            <div className="border-t border-gray-50 px-4 py-2.5 flex items-center gap-2 flex-wrap">
              {needsConfirm && (
                <button
                  onClick={() => setDrawerTarget(r)}
                  className="text-xs font-semibold text-white bg-green-800 hover:bg-green-700 rounded-xl px-3 py-1.5 transition-colors"
                >
                  Confirm booking →
                </button>
              )}
              {(needsConfirm || isNeedsReschedule) && (
                <button
                  onClick={() => setRescheduleTarget(r)}
                  className="text-xs font-semibold text-red-700 border border-red-200 hover:bg-red-50 rounded-xl px-3 py-1.5 transition-colors"
                >
                  Can't serve this time
                </button>
              )}

              {isCompConfirmed && (
                <button
                  onClick={() => setConfirmTarget(r)}
                  className="text-xs font-semibold text-green-700 hover:text-green-900 border-2 border-green-200 rounded-xl px-3 py-1.5 hover:bg-green-50 transition-colors"
                >
                  ✉️ Send payment reminder
                </button>
              )}

              {!isCancelled && !isPaid && (
                <button
                  onClick={() => { if (window.confirm('Cancel this booking?')) cancelRequest(r.id) }}
                  className="text-xs text-red-400 hover:text-red-600 transition-colors ml-auto"
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

  useEffect(() => { if (tab === 'bookings') load() }, [tab])

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const [bookingsRes, companionsRes] = await Promise.all([
        supabase.from('bookings')
          .select('*, loved_ones(full_name,city), companions(full_name,phone)')
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

  async function updateStatus(b: any, status: string) {
    setSavingId(b.id)
    try {
      const { error } = await supabase.from('bookings').update({ status }).eq('id', b.id)
      if (error) throw error
      setBookings(prev => prev.map(x => x.id === b.id ? { ...x, status } : x))
      showToast('Status updated', 'success')
    } catch {
      showToast('Could not update status — try again', 'error')
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
      if (statusFilter !== 'all' && b.status !== statusFilter) return false
      if (search) {
        const q = search.toLowerCase()
        return b.loved_ones?.full_name?.toLowerCase().includes(q) ||
               b.companions?.full_name?.toLowerCase().includes(q)
      }
      return true
    })
    .sort((a, b) => {
      const aUnassigned = !a.companion_id && !['completed', 'cancelled'].includes(a.status)
      const bUnassigned = !b.companion_id && !['completed', 'cancelled'].includes(b.status)
      if (aUnassigned && !bUnassigned) return -1
      if (!aUnassigned && bUnassigned) return 1
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })

  const unassignedCount = bookings.filter(b => !b.companion_id && !['completed', 'cancelled'].includes(b.status)).length

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <h1 className="font-serif text-2xl text-green-900">Bookings</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {([['requests', 'Requests'], ['bookings', 'Confirmed bookings']] as const).map(([t, label]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`text-sm font-semibold px-4 py-1.5 rounded-lg transition-colors ${tab === t ? 'bg-white text-green-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'requests' ? (
        <RequestsTab />
      ) : (
        <>
          <p className="text-gray-400 text-sm -mt-2">
            {bookings.length} total
            {unassignedCount > 0 && (
              <span className="ml-2 text-amber-600 font-semibold">· {unassignedCount} need a companion</span>
            )}
          </p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-4 flex items-center justify-between gap-3">
              {error}
              <button onClick={load} className="font-semibold underline">Retry</button>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="border-2 border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-600 bg-white"
            >
              <option value="all">All statuses</option>
              {ALL_STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
            </select>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search family or companion…"
              className="flex-1 border-2 border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-600"
            />
          </div>

          {loading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => <CardSkeleton key={i} />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 bg-green-50 rounded-2xl">
              <p className="text-3xl mb-3">📅</p>
              <p className="font-semibold text-green-900">No bookings found</p>
              <p className="text-sm text-gray-400 mt-1">Try a different filter or search.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map(b => {
                const isUnassigned = !b.companion_id && !['completed', 'cancelled'].includes(b.status)
                const isSaving = savingId === b.id
                const payoutRupees = b.companion_payout_paise != null ? `₹${(b.companion_payout_paise / 100).toLocaleString('en-IN')}` : null
                const amountRupees = b.amount_paise ? `₹${(b.amount_paise / 100).toLocaleString('en-IN')}` : '—'

                return (
                  <div
                    key={b.id}
                    className={`bg-white rounded-2xl border border-gray-100 ${isUnassigned ? 'border-l-4 border-l-amber-400' : ''} transition-all`}
                  >
                    <div className="px-4 py-3">
                      <div className="flex items-center gap-2 flex-wrap min-w-0">
                        <p className="font-semibold text-green-900 text-sm truncate flex-1 min-w-0">
                          {SERVICE_NAMES[b.service_type] || b.service_type}
                        </p>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {isUnassigned && (
                            <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-lg whitespace-nowrap">
                              NEEDS COMPANION
                            </span>
                          )}
                          <StatusLabel status={b.status} />
                          <span className="text-xs font-semibold text-green-800">{amountRupees}</span>
                        </div>
                      </div>

                      <p className="text-xs text-gray-400 mt-0.5 truncate">
                        {b.loved_ones?.full_name || '—'}
                        {b.loved_ones?.city ? ` · ${b.loved_ones.city}` : ''}
                        {b.scheduled_at ? ` · ${format(new Date(b.scheduled_at), 'd MMM, h:mm a')}` : ''}
                        {payoutRupees ? ` · payout ${payoutRupees}` : ''}
                      </p>

                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${PAYMENT_BADGE[b.payment_status] || 'bg-gray-100 text-gray-400'}`}>
                          {b.payment_status === 'paid' || b.payment_status === 'received' ? 'Paid' : 'Payment pending'}
                        </span>
                        {b.payment_status === 'pending' && (
                          <button
                            onClick={() => markPaymentReceived(b)}
                            disabled={isSaving}
                            className="text-[10px] font-semibold text-green-700 hover:text-green-800 disabled:opacity-50"
                          >
                            ✓ Mark received
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="border-t border-gray-50 px-4 py-2.5 flex flex-wrap gap-2 items-center">
                      <div className="relative flex-1 min-w-[140px]">
                        <select
                          value={b.companion_id || ''}
                          onChange={e => assignCompanion(b, e.target.value)}
                          disabled={isSaving}
                          className={`w-full text-xs border-2 rounded-xl px-2.5 py-1.5 pr-6 focus:outline-none focus:border-green-600 appearance-none bg-white disabled:opacity-50 ${isUnassigned ? 'border-amber-200 text-amber-700' : 'border-gray-200 text-gray-700'}`}
                        >
                          <option value="">— Assign companion —</option>
                          {companions.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                        </select>
                        <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                      </div>

                      <div className="relative">
                        <select
                          value={b.status}
                          onChange={e => updateStatus(b, e.target.value)}
                          disabled={isSaving}
                          className="text-xs border-2 border-gray-200 rounded-xl px-2.5 py-1.5 pr-6 focus:outline-none focus:border-green-600 appearance-none bg-white disabled:opacity-50 text-gray-700"
                        >
                          {ALL_STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                        </select>
                        <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-gray-400">₹</span>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={payoutInputs[b.id] ?? ''}
                          onChange={e => setPayoutInputs(prev => ({ ...prev, [b.id]: e.target.value }))}
                          placeholder="Payout"
                          className="w-20 border-2 border-gray-200 rounded-xl px-2 py-1.5 text-xs focus:outline-none focus:border-green-600"
                        />
                        <button
                          type="button"
                          onClick={() => setPayoutInputs(prev => ({ ...prev, [b.id]: String(Math.round((b.amount_paise || 0) * 0.7 / 100)) }))}
                          className="text-[10px] text-gray-400 hover:text-gray-600 whitespace-nowrap"
                        >
                          70%
                        </button>
                        <button
                          type="button"
                          onClick={() => savePayout(b)}
                          disabled={isSaving}
                          className="text-[10px] font-semibold bg-green-800 text-white px-2.5 py-1.5 rounded-lg hover:bg-green-700 disabled:opacity-50 whitespace-nowrap"
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
