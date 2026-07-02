import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Loader2, ArrowLeft, MapPin, Clock, Check, AlertTriangle } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import { formatSlot } from '@/lib/formatTime'

// ── Service catalog ───────────────────────────────────────────────────────────

interface Service { id: string; emoji: string; name: string; price: string; paise: number; desc: string }

const SERVICES: Service[] = [
  { id: 'home_visit',                    emoji: '🏠', name: 'Home Visit',           price: '₹1,000', paise: 100000, desc: 'Companion visit + WhatsApp report' },
  { id: 'doctor_visit_support',          emoji: '👨‍⚕️', name: 'Doctor Visit Support', price: '₹1,500', paise: 150000, desc: 'Accompanies them to the doctor' },
  { id: 'hospital_assistance_half_day',  emoji: '🏥', name: 'Hospital Half Day',    price: '₹2,000', paise: 200000, desc: 'Up to 4 hours hospital support' },
  { id: 'hospital_assistance_full_day',  emoji: '🏥', name: 'Hospital Full Day',    price: '₹4,000', paise: 400000, desc: 'Full day, updated every 2 hours' },
  { id: 'emergency_support_visit',       emoji: '🚨', name: 'Emergency Visit',      price: '₹3,000', paise: 300000, desc: 'Response within 2 hours' },
  { id: 'grocery_medicine_assistance',   emoji: '🛒', name: 'Grocery & Medicine',   price: '₹500',   paise: 50000,  desc: 'Collection and delivery' },
  { id: 'home_maintenance_coordination', emoji: '🔧', name: 'Home Maintenance',     price: '₹500',   paise: 50000,  desc: 'Coordinate repairs' },
]

// ── Time slot helpers ─────────────────────────────────────────────────────────

const LEAD_TIME_MIN = 180

const ALL_SLOTS = Array.from({ length: 25 }, (_, i) => {
  const total = 8 * 60 + i * 30
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
})

const SLOT_GROUPS = [
  { label: 'Morning',   start: 8,  end: 12 },
  { label: 'Afternoon', start: 12, end: 17 },
  { label: 'Evening',   start: 17, end: 21 },
]

function istNow() {
  const d = new Date(Date.now() + 5.5 * 60 * 60 * 1000)
  return {
    min: d.getUTCHours() * 60 + d.getUTCMinutes(),
    dateStr: `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`,
  }
}

function slotTooSoon(date: Date | null, s: string) {
  if (!date) return false
  const ist = istNow()
  const sel = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  if (sel !== ist.dateStr) return false
  return ist.min + LEAD_TIME_MIN >= +s.slice(0, 2) * 60 + +s.slice(3, 5)
}

function getGroups(date: Date | null) {
  return SLOT_GROUPS.map(g => ({
    label: g.label,
    slots: ALL_SLOTS.filter(s => {
      const h = +s.slice(0, 2)
      return h >= g.start && h < g.end && !slotTooSoon(date, s)
    }),
  })).filter(g => g.slots.length > 0)
}

// ── Shared input style ────────────────────────────────────────────────────────

const TEXTAREA: React.CSSProperties = {
  width: '100%', background: 'transparent', border: 'none', outline: 'none',
  fontSize: 15, fontFamily: 'inherit', resize: 'none', boxSizing: 'border-box', lineHeight: 1.55,
}

// ── Component ─────────────────────────────────────────────────────────────────

export function BookServicePage() {
  const { serviceId } = useParams<{ serviceId: string }>()
  const navigate = useNavigate()
  const { user, profile } = useAuth()

  const service = SERVICES.find(s => s.id === serviceId)
  const isEmergency = service?.id === 'emergency_support_visit'
  const isNri = profile?.user_type === 'nri'

  // ── Recipient ──
  const [recipientName, setRecipientName] = useState('')
  const [savedAddress, setSavedAddress]   = useState('')

  // ── Form ──
  const [step, setStep]     = useState<1 | 2 | 3>(isEmergency ? 2 : 1)
  const [date, setDate]     = useState<Date | null>(null)
  const [slot, setSlot]     = useState('')
  const [address, setAddress] = useState('')
  const [notes, setNotes]   = useState('')
  const [whatsapp, setWhatsapp] = useState('')

  // ── Submit ──
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr] = useState('')

  // ── Load saved address ──
  useEffect(() => {
    if (!user) return
    if (isNri) {
      ;(async () => {
        const { data: lo } = await supabase.from('loved_ones').select('id, full_name').eq('family_user_id', user.id).order('created_at').limit(1).maybeSingle()
        let addr = ''
        if (lo?.id) {
          const { data: ep } = await supabase.from('elder_profiles').select('address').eq('loved_one_id', lo.id).maybeSingle()
          addr = ep?.address || ''
        }
        setRecipientName(lo?.full_name || profile?.full_name || '')
        setSavedAddress(addr)
        setAddress(addr)
      })()
    } else {
      supabase.from('society_members').select('name, flat_number, area, society_name').eq('user_id', user.id).maybeSingle()
        .then(({ data }) => {
          const name = data?.name || profile?.full_name || ''
          const addr = [data?.flat_number, data?.society_name, data?.area].filter(Boolean).join(', ')
          setRecipientName(name)
          setSavedAddress(addr)
          setAddress(addr)
        })
    }
  }, [user, isNri, profile])

  if (!service) {
    return (
      <div style={{ padding: '48px 20px', textAlign: 'center' }}>
        <p style={{ color: 'var(--gray-mid)', marginBottom: 16 }}>Service not found.</p>
        <button onClick={() => navigate('/dashboard/book')} style={{ color: 'var(--forest)', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', fontSize: 15 }}>
          ← Back to services
        </button>
      </div>
    )
  }

  const showWhatsapp = !profile?.whatsapp_number?.trim()
  const effectiveWhatsapp = whatsapp.trim() || profile?.whatsapp_number || ''
  const groups = getGroups(date)
  const todayHasSlots = istNow().min + LEAD_TIME_MIN < 20 * 60
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() + i + (todayHasSlots ? 0 : 1)); return d
  })

  // ── Back button logic ──
  function goBack() {
    if (!isEmergency && step > 1) { setErr(''); setStep(s => (s - 1) as 1 | 2 | 3) }
    else navigate('/dashboard/book')
  }

  // ── Next button logic ──
  function goNext() {
    if (step === 1) {
      if (!date) { setErr('Please select a day.'); return }
      if (!slot) { setErr('Please select a time slot.'); return }
      setErr(''); setStep(2)
    } else if (step === 2) {
      if (!address.trim()) { setErr('Please enter a visiting address.'); return }
      setErr(''); setStep(3)
    }
  }

  // ── Submit ──
  async function submit() {
    if (!service) return
    if (!address.trim()) { setErr('Please enter a visiting address.'); return }
    setSubmitting(true); setErr('')

    let scheduled_at_ist: string | null = null
    if (!isEmergency && date && slot) {
      const y = date.getFullYear()
      const mo = String(date.getMonth() + 1).padStart(2, '0')
      const d = String(date.getDate()).padStart(2, '0')
      scheduled_at_ist = `${y}-${mo}-${d}T${slot}:00+05:30`
    }

    const { data: result, error } = await supabase.functions.invoke('submit-booking-request', {
      body: {
        service_id: service.id,
        service_name: service.name,
        amount_paise: service.paise,
        scheduled_at_ist,
        recipient_name: recipientName,
        recipient_address: address.trim(),
        requester_whatsapp: effectiveWhatsapp,
        notes: notes.trim() || null,
        is_emergency: isEmergency,
      },
    })

    setSubmitting(false)
    if (error || !(result as any)?.ok) {
      console.error('[BookService] submit-booking-request failed:', error, result)
      setErr("Couldn't send your request. Please try again.")
      return
    }
    console.info('[BookService] booking saved, request_id:', (result as any)?.request_id)
    navigate('/dashboard/bookings', { replace: true })
  }

  const stepTitle = isEmergency ? 'Emergency request' : step === 1 ? 'When?' : step === 2 ? 'Where?' : 'Confirm booking'
  const ctaDisabled = step === 1 ? (!date || !slot) : step === 2 ? !address.trim() : submitting

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#fff' }}>

      {/* ── Header ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '14px 16px 12px',
        borderBottom: '1px solid var(--gray-light)',
        background: '#fff', flexShrink: 0,
      }}>
        <button
          onClick={goBack}
          aria-label="Back"
          style={{
            width: 36, height: 36, borderRadius: '50%',
            background: 'var(--cream)', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}
        >
          <ArrowLeft size={18} color="var(--forest)" />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-mid)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>
            {service.emoji} {service.name}
          </p>
          <p style={{ fontSize: 18, fontWeight: 800, color: 'var(--black)', margin: '1px 0 0', letterSpacing: '-0.02em' }}>
            {stepTitle}
          </p>
        </div>
        <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--forest)', flexShrink: 0 }}>{service.price}</span>
      </div>

      {/* ── Progress bar ── */}
      {!isEmergency && (
        <div style={{ display: 'flex', gap: 4, padding: '10px 16px', background: '#fff', flexShrink: 0 }}>
          {[1, 2, 3].map(n => (
            <div
              key={n}
              style={{
                flex: 1, height: 3, borderRadius: 2,
                background: n <= step ? 'var(--forest)' : 'var(--gray-light)',
                transition: 'background 250ms ease',
              }}
            />
          ))}
        </div>
      )}

      {/* ── Scrollable body ── */}
      <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' as any, padding: '20px 16px 8px' }}>

        {/* ──────────────── EMERGENCY ──────────────── */}
        {isEmergency && (
          <>
            <a
              href="tel:+919000221261"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
                background: '#b91c1c', color: '#fff', borderRadius: 16,
                padding: '18px 20px', fontSize: 17, fontWeight: 700, textDecoration: 'none', marginBottom: 12,
              }}
            >
              📞 Call +91 90002 21261
            </a>
            <p style={{ fontSize: 13, color: 'var(--gray-mid)', textAlign: 'center', marginBottom: 24 }}>
              Call first if urgent — we'll dispatch immediately.
            </p>
            <BlockInput label="Address">
              <textarea
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder="Flat / house, area, landmark…"
                rows={3}
                style={TEXTAREA}
              />
            </BlockInput>
            <BlockInput label="What's happening? (optional)">
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="e.g. Chest pain, fell at home, needs hospital…"
                rows={3}
                style={TEXTAREA}
              />
            </BlockInput>
          </>
        )}

        {/* ──────────────── STEP 1: Date + Time ──────────────── */}
        {!isEmergency && step === 1 && (
          <>
            <SectionLabel>Pick a day</SectionLabel>
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 16, scrollbarWidth: 'none' }}>
              {days.map(d => {
                const sel = date?.toDateString() === d.toDateString()
                return (
                  <button
                    key={d.toISOString()}
                    onClick={() => { setDate(d); setSlot(''); setErr('') }}
                    style={{
                      flexShrink: 0, minWidth: 60, borderRadius: 14, padding: '12px 8px',
                      cursor: 'pointer', textAlign: 'center', border: 'none',
                      background: sel ? 'var(--forest)' : 'var(--cream)',
                      color: sel ? '#fff' : 'var(--gray-dark)',
                      transition: 'all 200ms ease',
                    }}
                  >
                    <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 4 }}>
                      {d.toLocaleDateString('en-IN', { weekday: 'short' })}
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em' }}>{d.getDate()}</div>
                    <div style={{ fontSize: 11, opacity: 0.7, marginTop: 2 }}>
                      {d.toLocaleDateString('en-IN', { month: 'short' })}
                    </div>
                  </button>
                )
              })}
            </div>

            {!date ? (
              <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--gray-mid)' }}>
                <p style={{ fontSize: 14 }}>Select a day to see available times</p>
              </div>
            ) : groups.length === 0 ? (
              <div style={{ background: '#FEF3C7', border: '1px solid #FCD34D', borderRadius: 12, padding: '12px 16px', fontSize: 14, color: '#92400E' }}>
                No available slots today — please pick another day.
              </div>
            ) : (
              <>
                <SectionLabel>Pick a time · <span style={{ fontWeight: 500, textTransform: 'none', letterSpacing: 0 }}>min 3h notice</span></SectionLabel>
                {groups.map(g => (
                  <div key={g.label} style={{ marginBottom: 16 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-mid)', margin: '0 0 8px', letterSpacing: '0.04em' }}>
                      {g.label.toUpperCase()}
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {g.slots.map(s => (
                        <button
                          key={s}
                          onClick={() => { setSlot(s); setErr('') }}
                          style={{
                            borderRadius: 10, padding: '10px 16px', cursor: 'pointer', border: 'none',
                            fontSize: 14, fontWeight: slot === s ? 700 : 500,
                            background: slot === s ? 'var(--forest)' : 'var(--cream)',
                            color: slot === s ? '#fff' : 'var(--gray-dark)',
                            transition: 'all 200ms ease',
                          }}
                        >
                          {formatSlot(s)}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </>
            )}
          </>
        )}

        {/* ──────────────── STEP 2: Address + Notes ──────────────── */}
        {!isEmergency && step === 2 && (
          <>
            {savedAddress && (
              <div style={{
                display: 'flex', alignItems: 'flex-start', gap: 10,
                background: 'rgba(14,42,31,0.05)', border: '1px solid rgba(14,42,31,0.12)',
                borderRadius: 12, padding: '12px 14px', marginBottom: 14,
              }}>
                <MapPin size={14} color="var(--forest)" style={{ marginTop: 2, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--forest)', margin: '0 0 2px' }}>Saved address</p>
                  <p style={{ fontSize: 13, color: 'var(--gray-dark)', margin: 0, lineHeight: 1.5 }}>{savedAddress}</p>
                </div>
                {address !== savedAddress && (
                  <button
                    onClick={() => setAddress(savedAddress)}
                    style={{ fontSize: 12, fontWeight: 700, color: 'var(--forest)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0 }}
                  >
                    Use ↩
                  </button>
                )}
              </div>
            )}

            <BlockInput label="Visiting address">
              <textarea
                value={address}
                onChange={e => { setAddress(e.target.value); setErr('') }}
                placeholder="Flat / house, area, pincode, landmark…"
                rows={3}
                autoFocus
                style={TEXTAREA}
              />
            </BlockInput>

            <BlockInput label="Special instructions (optional)">
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Access code, gate number, medications to remind, things companion should know…"
                rows={3}
                style={TEXTAREA}
              />
            </BlockInput>

            {showWhatsapp && (
              <div style={{
                background: '#FFF7ED', border: '1.5px solid #F59E0B',
                borderRadius: 14, padding: '14px 16px', marginBottom: 4,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <AlertTriangle size={14} color="#B45309" />
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#B45309', margin: 0 }}>
                    Add your WhatsApp to receive the visit report
                  </p>
                </div>
                <input
                  value={whatsapp}
                  onChange={e => setWhatsapp(e.target.value)}
                  placeholder="+91 98765 43210"
                  type="tel"
                  style={{
                    width: '100%', background: '#fff', border: '1px solid #F59E0B',
                    borderRadius: 10, padding: '10px 14px', fontSize: 15,
                    fontFamily: 'inherit', boxSizing: 'border-box',
                  }}
                />
              </div>
            )}
          </>
        )}

        {/* ──────────────── STEP 3: Review ──────────────── */}
        {!isEmergency && step === 3 && (
          <>
            <SectionLabel>Review your booking</SectionLabel>
            <div style={{ background: 'var(--cream)', borderRadius: 18, padding: '20px 16px', marginBottom: 14 }}>
              {/* Service */}
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', paddingBottom: 14, borderBottom: '1px solid var(--gray-light)', marginBottom: 14 }}>
                <span style={{ fontSize: 28 }}>{service.emoji}</span>
                <div>
                  <p style={{ fontSize: 17, fontWeight: 800, color: 'var(--black)', margin: '0 0 2px', letterSpacing: '-0.02em' }}>{service.name}</p>
                  <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--forest)', margin: 0 }}>{service.price}</p>
                </div>
              </div>
              {/* Date/time */}
              {date && slot && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 12, borderBottom: '1px solid var(--gray-light)', marginBottom: 12 }}>
                  <Clock size={15} color="var(--forest)" style={{ flexShrink: 0 }} />
                  <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--black)', margin: 0 }}>
                    {date.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })} at {formatSlot(slot)}
                  </p>
                </div>
              )}
              {/* Address */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, ...(notes ? { paddingBottom: 12, borderBottom: '1px solid var(--gray-light)', marginBottom: 12 } : {}) }}>
                <MapPin size={15} color="var(--forest)" style={{ marginTop: 2, flexShrink: 0 }} />
                <p style={{ fontSize: 14, color: 'var(--gray-dark)', margin: 0, lineHeight: 1.55 }}>{address}</p>
              </div>
              {/* Notes */}
              {notes && (
                <p style={{ fontSize: 13, color: 'var(--gray-mid)', margin: 0, lineHeight: 1.55 }}>
                  <strong style={{ color: 'var(--black)' }}>Note:</strong> {notes}
                </p>
              )}
            </div>
            <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 12, padding: '12px 14px' }}>
              <p style={{ fontSize: 13, color: '#15803D', margin: 0, display: 'flex', alignItems: 'flex-start', gap: 6, lineHeight: 1.5 }}>
                <Check size={14} style={{ marginTop: 2, flexShrink: 0 }} />
                No payment now — we confirm a companion and send you a payment link via WhatsApp.
              </p>
            </div>
          </>
        )}

      </div>

      {/* ── Fixed CTA footer ── */}
      <div style={{
        flexShrink: 0,
        padding: '12px 16px',
        paddingBottom: 'calc(16px + env(safe-area-inset-bottom))',
        background: '#fff',
        borderTop: '1px solid var(--gray-light)',
      }}>
        {err && (
          <p style={{ color: '#b42318', fontSize: 13, margin: '0 0 10px', textAlign: 'center' }}>{err}</p>
        )}

        {isEmergency ? (
          <>
            <button
              onClick={submit}
              disabled={submitting || !address.trim()}
              style={{
                width: '100%', background: '#b91c1c', color: '#fff', border: 'none',
                borderRadius: 14, padding: 16, fontSize: 16, fontWeight: 700,
                cursor: (submitting || !address.trim()) ? 'default' : 'pointer',
                opacity: (submitting || !address.trim()) ? 0.55 : 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              {submitting ? <><Loader2 size={16} className="ce-spin" /> Alerting team…</> : 'Request emergency visit →'}
            </button>
            <p style={{ fontSize: 11, color: 'var(--gray-mid)', textAlign: 'center', margin: '8px 0 0' }}>
              Our team is alerted immediately — a companion will contact you within 30 minutes.
            </p>
          </>
        ) : step < 3 ? (
          <button
            onClick={goNext}
            disabled={ctaDisabled}
            style={{
              width: '100%', background: 'var(--forest)', color: '#fff', border: 'none',
              borderRadius: 14, padding: 16, fontSize: 16, fontWeight: 700,
              cursor: ctaDisabled ? 'default' : 'pointer',
              opacity: ctaDisabled ? 0.45 : 1,
              transition: 'opacity 200ms ease',
            }}
          >
            Continue →
          </button>
        ) : (
          <>
            <button
              onClick={submit}
              disabled={submitting}
              style={{
                width: '100%', background: 'var(--forest)', color: '#fff', border: 'none',
                borderRadius: 14, padding: 16, fontSize: 16, fontWeight: 700,
                cursor: submitting ? 'default' : 'pointer', opacity: submitting ? 0.7 : 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              {submitting ? <><Loader2 size={16} className="ce-spin" /> Sending…</> : 'Confirm Booking →'}
            </button>
            <p style={{ fontSize: 11, color: 'var(--gray-mid)', textAlign: 'center', margin: '8px 0 0' }}>
              No charge now — we confirm a companion, then send a payment link.
            </p>
          </>
        )}
      </div>

    </div>
  )
}

// ── Small helpers ─────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      fontSize: 12, fontWeight: 700, textTransform: 'uppercase',
      letterSpacing: '0.07em', color: 'var(--gray-mid)', margin: '0 0 12px',
    }}>
      {children}
    </p>
  )
}

function BlockInput({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--cream)', borderRadius: 14, padding: '14px 14px 10px', marginBottom: 12 }}>
      <p style={{
        fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
        letterSpacing: '0.07em', color: 'var(--gray-mid)', margin: '0 0 8px',
      }}>
        {label}
      </p>
      {children}
    </div>
  )
}
