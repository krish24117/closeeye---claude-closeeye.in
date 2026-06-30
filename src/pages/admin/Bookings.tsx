import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ui/Toast'
import { format } from 'date-fns'
import { SERVICE_NAMES } from '@/lib/booking-labels'
import { Badge, EmptyState, ErrorBox, Skeleton } from './_shared'

type Tone = 'green' | 'amber' | 'red' | 'blue' | 'purple' | 'gray'

const ALL_STATUSES = ['pending', 'confirmed', 'companion_assigned', 'in_progress', 'completed', 'cancelled']

function statusTone(status: string): Tone {
  switch (status) {
    case 'pending':            return 'amber'
    case 'confirmed':          return 'blue'
    case 'companion_assigned': return 'purple'
    case 'in_progress':        return 'green'
    case 'completed':          return 'gray'
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
  requested:           'Request received',
  needs_details:       'Needs details',
  needs_reschedule:    'Awaiting reschedule',
  confirmed:           'Confirmed',
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
            className="adm-btn adm-btn-primary"
            style={{ flex: 1, opacity: (!hasNumber || sending) ? 0.5 : 1, cursor: (!hasNumber || sending) ? 'not-allowed' : 'pointer' }}
          >
            {sending ? 'Opening…' : 'Open in WhatsApp →'}
          </button>
          <button onClick={onClose} className="adm-btn" style={{ color: 'var(--gray-mid)' }}>
            Cancel
          </button>
        </div>
      </div>
    </>
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
    <>
      <div className="adm-overlay" onClick={onClose} />
      <div className="adm-slideover" style={{ display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
        <button
          onClick={onClose}
          style={{ position: 'absolute', top: 14, right: 14, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-dark)', padding: 4, fontSize: 22, lineHeight: 1 }}
        >×</button>

        <div style={{ borderBottom: '1px solid var(--line)', padding: '16px 20px' }}>
          <p style={{ fontWeight: 700, color: 'var(--forest)' }}>Confirm booking</p>
          <p style={{ fontSize: 12, color: 'var(--gray-mid)', marginTop: 2 }}>
            {request.service_name} for {elderName}
            {familyName !== 'there' ? ` · ${familyName}` : ''}
          </p>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--gray-mid)', marginBottom: 4 }}>Companion name *</label>
            <input
              type="text"
              value={companionName}
              onChange={e => setCompanionName(e.target.value)}
              placeholder="e.g. Priya Sharma"
              className="adm-input"
              style={{ width: '100%' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--gray-mid)', marginBottom: 4 }}>Visit date & time</label>
            {request.scheduled_at && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, padding: '6px 10px', background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 8 }}>
                <span style={{ fontSize: 12, color: '#2563EB' }}>📅</span>
                <span style={{ fontSize: 12, fontWeight: 500, color: '#1D4ED8' }}>
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
              className="adm-input"
              style={{ width: '100%' }}
            />
            {!scheduledAt && (
              <p style={{ fontSize: 12, color: 'var(--gold)', marginTop: 4 }}>No time set — enter the confirmed visit time.</p>
            )}
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--gray-mid)', marginBottom: 4 }}>Amount (₹)</label>
            <input
              type="number"
              min="1"
              step="1"
              value={amountRupees}
              onChange={e => setAmountRupees(e.target.value)}
              placeholder="e.g. 999"
              className="adm-input"
              style={{ width: '100%' }}
            />
            <p style={{ fontSize: 12, color: 'var(--gray-mid)', marginTop: 4 }}>Family will see this amount in the app and be asked to pay.</p>
          </div>

          {!hasWa && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#FEF3C7', border: '1px solid #FCD34D', borderRadius: 10, padding: '10px 12px' }}>
              <span style={{ fontSize: 13, color: '#D97706', flexShrink: 0 }}>⚠</span>
              <p style={{ fontSize: 12, color: '#92400E', fontWeight: 500 }}>No WhatsApp number — status will still be updated, but notification won't send.</p>
            </div>
          )}
        </div>

        <div style={{ borderTop: '1px solid var(--line)', padding: '16px 20px', display: 'flex', gap: 12 }}>
          <button
            onClick={handleConfirm}
            disabled={saving || !companionName.trim()}
            className="adm-btn adm-btn-primary"
            style={{ flex: 1, opacity: (saving || !companionName.trim()) ? 0.5 : 1, cursor: (saving || !companionName.trim()) ? 'not-allowed' : 'pointer' }}
          >
            {saving ? 'Saving…' : hasWa ? 'Confirm & notify on WhatsApp →' : 'Confirm booking'}
          </button>
          <button onClick={onClose} className="adm-btn" style={{ color: 'var(--gray-mid)' }}>Cancel</button>
        </div>
      </div>
    </>
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
    <>
      <div className="adm-overlay" onClick={onClose} />
      <div className="adm-slideover" style={{ display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
        <button
          onClick={onClose}
          style={{ position: 'absolute', top: 14, right: 14, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-dark)', padding: 4, fontSize: 22, lineHeight: 1 }}
        >×</button>

        <div style={{ borderBottom: '1px solid var(--line)', padding: '16px 20px' }}>
          <p style={{ fontWeight: 700, color: '#991B1B' }}>Can't serve this time</p>
          <p style={{ fontSize: 12, color: 'var(--gray-mid)', marginTop: 2 }}>{request.service_name} · {elderName}</p>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {request.scheduled_at && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#FEE2E2', border: '1px solid #FCA5A5', borderRadius: 10, padding: '10px 12px' }}>
              <span style={{ fontSize: 14 }}>📅</span>
              <p style={{ fontSize: 12, color: '#991B1B', fontWeight: 500 }}>
                User requested: {new Date(request.scheduled_at).toLocaleString('en-IN', {
                  weekday: 'short', day: 'numeric', month: 'short',
                  hour: 'numeric', minute: '2-digit', hour12: true,
                })} — unable to serve
              </p>
            </div>
          )}

          <p style={{ fontSize: 12, color: 'var(--gray-mid)' }}>Propose up to 3 alternatives. The family will receive a WhatsApp message to choose one.</p>

          {[
            { label: 'Option 1 *', value: slot1, set: setSlot1 },
            { label: 'Option 2', value: slot2, set: setSlot2 },
            { label: 'Option 3', value: slot3, set: setSlot3 },
          ].map(({ label, value, set }) => (
            <div key={label}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--gray-mid)', marginBottom: 4 }}>{label}</label>
              <input
                type="datetime-local"
                value={value}
                onChange={e => set(e.target.value)}
                className="adm-input"
                style={{ width: '100%' }}
              />
            </div>
          ))}

          {!hasWa && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#FEF3C7', border: '1px solid #FCD34D', borderRadius: 10, padding: '10px 12px' }}>
              <span style={{ fontSize: 13, color: '#D97706', flexShrink: 0 }}>⚠</span>
              <p style={{ fontSize: 12, color: '#92400E', fontWeight: 500 }}>No WhatsApp number — status will update but message won't send.</p>
            </div>
          )}
        </div>

        <div style={{ borderTop: '1px solid var(--line)', padding: '16px 20px', display: 'flex', gap: 12 }}>
          <button
            onClick={handleSend}
            disabled={saving || !slot1}
            className="adm-btn"
            style={{ flex: 1, background: '#B91C1C', color: '#fff', fontWeight: 700, opacity: (saving || !slot1) ? 0.5 : 1, cursor: (saving || !slot1) ? 'not-allowed' : 'pointer' }}
          >
            {saving ? 'Sending…' : hasWa ? 'Send reschedule request on WhatsApp →' : 'Mark as needs reschedule'}
          </button>
          <button onClick={onClose} className="adm-btn" style={{ color: 'var(--gray-mid)' }}>Cancel</button>
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
                  className="adm-btn"
                  style={{ fontSize: 12, padding: '6px 12px', color: 'var(--forest)', border: '2px solid var(--sage)' }}
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
              {ALL_STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
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
                const payoutRupees = b.companion_payout_paise != null ? `₹${(b.companion_payout_paise / 100).toLocaleString('en-IN')}` : null
                const amountRupees = b.amount_paise ? `₹${(b.amount_paise / 100).toLocaleString('en-IN')}` : '—'

                return (
                  <div
                    key={b.id}
                    className="adm-card"
                    style={{
                      borderLeft: isUnassigned ? '3px solid var(--gold)' : undefined,
                      overflow: 'hidden',
                    }}
                  >
                    <div style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', minWidth: 0 }}>
                        <p style={{ fontWeight: 700, color: 'var(--forest)', fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>
                          {SERVICE_NAMES[b.service_type] || b.service_type}
                        </p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                          {isUnassigned && (
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

                      <div>
                        <select
                          value={b.status}
                          onChange={e => updateStatus(b, e.target.value)}
                          disabled={isSaving}
                          className="adm-input"
                          style={{ fontSize: 12, padding: '6px 10px', opacity: isSaving ? 0.5 : 1 }}
                        >
                          {ALL_STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                        </select>
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
