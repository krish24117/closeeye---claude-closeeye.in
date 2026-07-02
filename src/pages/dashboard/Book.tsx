import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Loader2, Check, X, AlertTriangle } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'

interface Service { id: string; emoji: string; name: string; price: string; paise: number; desc: string }

const SERVICES: Service[] = [
  { id: 'home_visit', emoji: '🏠', name: 'Home Visit', price: '₹1,000', paise: 100000, desc: 'Companion visit + WhatsApp report' },
  { id: 'doctor_visit_support', emoji: '👨‍⚕️', name: 'Doctor Visit Support', price: '₹1,500', paise: 150000, desc: 'Accompanies them to the doctor + notes' },
  { id: 'hospital_assistance_half_day', emoji: '🏥', name: 'Hospital Half Day', price: '₹2,000', paise: 200000, desc: 'Up to 4 hours hospital support' },
  { id: 'hospital_assistance_full_day', emoji: '🏥', name: 'Hospital Full Day', price: '₹4,000', paise: 400000, desc: 'Full day. Updated every 2 hours' },
  { id: 'emergency_support_visit', emoji: '🚨', name: 'Emergency Visit', price: '₹3,000', paise: 300000, desc: 'Response within 2 hours' },
  { id: 'grocery_medicine_assistance', emoji: '🛒', name: 'Grocery & Medicine', price: '₹500', paise: 50000, desc: 'Collection and delivery' },
  { id: 'home_maintenance_coordination', emoji: '🔧', name: 'Home Maintenance', price: '₹500', paise: 50000, desc: 'Coordinate repairs' },
]

const TIME_SLOTS = [['Morning', ['09:00', '10:00', '11:00']], ['Afternoon', ['14:00', '15:00', '16:00']]] as const
const slotLabel = (s: string) => { const h = +s.slice(0, 2); return `${((h + 11) % 12) + 1}${h < 12 ? 'am' : 'pm'}` }

// IST = UTC+5:30, no DST
function istNow() {
  const d = new Date(Date.now() + 5.5 * 60 * 60 * 1000)
  return {
    min: d.getUTCHours() * 60 + d.getUTCMinutes(),
    dateStr: `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`,
  }
}

const BOOKING_BUFFER_MIN = 180 // 3 hours minimum notice

function slotIsPast(selectedDate: Date | null, slotStr: string): boolean {
  if (!selectedDate) return false
  const ist = istNow()
  const selStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`
  if (selStr !== ist.dateStr) return false
  const slotMin = +slotStr.slice(0, 2) * 60 + +slotStr.slice(3, 5)
  return ist.min + BOOKING_BUFFER_MIN >= slotMin
}

const INPUT_STYLE: React.CSSProperties = {
  width: '100%', background: 'var(--cream)', border: '1.5px solid var(--gray-light)', borderRadius: 12,
  padding: '12px 14px', fontSize: 15, fontFamily: 'inherit', boxSizing: 'border-box',
}

export function DashboardBook() {
  const { user, profile } = useAuth()
  const isNri = profile?.user_type === 'nri'
  const isFoundingMember = !!((profile as unknown) as Record<string, unknown>)?.is_founding_member
  const foundingNumber = ((profile as unknown) as Record<string, unknown>)?.founding_number as number | undefined
  const [recipient, setRecipient] = useState<{ name: string; address: string }>({ name: '', address: '' })

  const [active, setActive] = useState<Service | null>(null)
  const overlayRef = useRef<HTMLDivElement>(null)

  // iOS <15.4 fallback: resize overlay to visual viewport so sheet stays above keyboard
  useEffect(() => {
    if (!active) return
    const vv = window.visualViewport
    if (!vv) return
    const el = overlayRef.current
    if (!el) return
    const sync = () => { el.style.height = `${vv.height}px` }
    vv.addEventListener('resize', sync)
    sync()
    return () => { vv.removeEventListener('resize', sync); el.style.height = '' }
  }, [active])

  const [date, setDate] = useState<Date | null>(null)
  const [slot, setSlot] = useState<string>('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [doneNeedsDetails, setDoneNeedsDetails] = useState(false)
  const [doneMissing, setDoneMissing] = useState<{ address: boolean; whatsapp: boolean }>({ address: false, whatsapp: false })
  const [err, setErr] = useState('')

  // Inline collection for missing address / WhatsApp
  const [tempAddress, setTempAddress] = useState('')
  const [tempWhatsapp, setTempWhatsapp] = useState('')

  useEffect(() => {
    if (!user) return
    if (isNri) {
      ;(async () => {
        const { data: lo } = await supabase.from('loved_ones').select('id, full_name').eq('family_user_id', user.id).order('created_at').limit(1).maybeSingle()
        let address = ''
        if (lo?.id) {
          const { data: ep } = await supabase.from('elder_profiles').select('address').eq('loved_one_id', lo.id).maybeSingle()
          address = ep?.address || ''
        }
        setRecipient({ name: lo?.full_name || profile?.full_name || '', address })
      })()
    } else {
      supabase.from('society_members').select('name, flat_number, area, society_name').eq('user_id', user.id).maybeSingle()
        .then(({ data }) => setRecipient({ name: data?.name || profile?.full_name || '', address: [data?.flat_number, data?.society_name, data?.area].filter(Boolean).join(', ') }))
    }
  }, [user, isNri, profile])

  // Clear slot if it's now past (e.g. user re-opens sheet or switches to today)
  useEffect(() => { if (slot && slotIsPast(date, slot)) setSlot('') }, [date])

  // If today has no bookable slots (all within 3h buffer), start the date row from tomorrow
  const LAST_SLOT_MIN = 16 * 60 // 16:00 is the latest slot
  const todayHasSlots = istNow().min + BOOKING_BUFFER_MIN < LAST_SLOT_MIN
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() + i + (todayHasSlots ? 0 : 1))
    return d
  })

  function openSheet(s: Service) {
    setActive(s); setDate(null); setSlot(''); setNotes(''); setDone(false); setErr('')
    setTempAddress(''); setTempWhatsapp('')
    setDoneNeedsDetails(false); setDoneMissing({ address: false, whatsapp: false })
  }
  function close() { setActive(null) }

  // Derived: which fields are still empty (after inline inputs)
  const effectiveAddress = tempAddress.trim() || recipient.address
  const effectiveWhatsapp = tempWhatsapp.trim() || profile?.whatsapp_number || ''
  const showAddressInput = !recipient.address.trim()
  const showWhatsappInput = !profile?.whatsapp_number?.trim()

  async function confirm() {
    if (!active) return
    const isEmergency = active.id === 'emergency_support_visit'
    if (!isEmergency && (!date || !slot)) { setErr('Please pick a date and time.'); return }
    if (showAddressInput && !tempAddress.trim()) { setErr('Please add an address so we can send a companion.'); return }
    setSubmitting(true); setErr('')
    let scheduled_at_ist: string | null = null
    if (!isEmergency && date) {
      const y = date.getFullYear(), mo = String(date.getMonth() + 1).padStart(2, '0'), d = String(date.getDate()).padStart(2, '0')
      scheduled_at_ist = `${y}-${mo}-${d}T${slot}:00+05:30`
    }
    const { data: result, error } = await supabase.functions.invoke('submit-booking-request', {
      body: {
        service_id: active.id, service_name: active.name, amount_paise: active.paise,
        scheduled_at_ist, recipient_name: recipient.name,
        recipient_address: effectiveAddress,
        requester_whatsapp: effectiveWhatsapp,
        notes: notes.trim() || null,
        is_emergency: isEmergency,
      },
    })
    setSubmitting(false)
    if (error) { setErr("Couldn't send your request. Please try again."); return }
    setDoneNeedsDetails(!!(result as any)?.needs_details)
    setDoneMissing((result as any)?.missing ?? { address: false, whatsapp: false })
    setDone(true)
  }

  return (
    <div className="ce-slide-up" style={{ paddingBottom: 8 }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, margin: '16px 16px 4px' }}>Book a Service</h1>
      <p style={{ fontSize: 14, color: 'var(--gray-mid)', margin: '0 16px 16px' }}>
        {isNri ? `For ${recipient.name || 'your loved one'} · Hyderabad` : 'For your family · Hyderabad'}
      </p>

      {/* Compact founding member status — small chip so services appear above fold */}
      {isFoundingMember && (
        <div style={{ margin: '0 16px 12px', background: 'rgba(14,42,31,0.07)', border: '1px solid rgba(14,42,31,0.14)', borderRadius: 12, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--forest)', color: '#fff', fontSize: 12, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>✓</span>
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--forest)', margin: 0 }}>Founding Member{foundingNumber ? ` #${foundingNumber}` : ''}</p>
            <p style={{ fontSize: 12, color: 'var(--gray-mid)', margin: '1px 0 0' }}>Your place is secured — book any service below.</p>
          </div>
        </div>
      )}

      {/* Service cards — first so they're always visible above the fold */}
      {SERVICES.map(s => (
        <div key={s.id} style={{ margin: '0 16px 10px', background: '#fff', borderRadius: 'var(--radius-card)', padding: '18px 20px', boxShadow: 'var(--shadow-card)', display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontSize: 28 }}>{s.emoji}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--black)', margin: 0 }}>{s.name}</p>
            <p style={{ fontSize: 13, color: 'var(--gray-mid)', margin: '2px 0 0' }}>{s.desc}</p>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--forest)', margin: '0 0 6px' }}>{s.price}</p>
            <button onClick={() => openSheet(s)} className="ce-press" style={{ background: 'var(--forest)', color: '#fff', border: 'none', borderRadius: 100, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', boxShadow: 'var(--shadow-btn)' }}>Book</button>
          </div>
        </div>
      ))}

      {/* Founding membership upsell — shown below services for non-members */}
      {!isFoundingMember && (
        <>
          <p style={{ fontSize: 12, color: 'var(--gray-mid)', margin: '8px 16px 12px' }}>Membership is a one-time join — services above are booked separately as needed.</p>
          <div style={{ margin: '0 16px 16px', borderRadius: 20, overflow: 'hidden', background: 'linear-gradient(135deg, #0E2A1F 0%, #1B4332 100%)' }}>
            <div style={{ padding: '20px 20px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>Founding Membership</span>
                <span style={{ background: 'var(--sage)', color: 'var(--forest)', borderRadius: 100, padding: '3px 10px', fontSize: 10, fontWeight: 700 }}>FOUNDING MEMBER</span>
              </div>
              <p style={{ fontSize: 28, fontWeight: 700, color: 'var(--sage)', margin: '0 0 14px' }}>₹100 <span style={{ fontSize: 14, fontWeight: 500, color: 'rgba(255,255,255,0.65)' }}>· one-time</span></p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 18 }}>
                {['Health assistant — ask us anything, anytime', 'Priority emergency response for your family', 'Founding member benefits as we grow'].map(item => (
                  <div key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <span style={{ color: 'var(--sage)', fontWeight: 700, fontSize: 14, lineHeight: 1.4, flexShrink: 0 }}>✓</span>
                    <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', lineHeight: 1.4 }}>{item}</span>
                  </div>
                ))}
              </div>
              <Link
                to="/founding-member/checkout"
                style={{ display: 'block', background: 'var(--sage)', color: 'var(--forest)', borderRadius: 100, padding: '13px 20px', fontSize: 15, fontWeight: 700, textDecoration: 'none', textAlign: 'center' }}
              >
                Become a Founding Member →
              </Link>
            </div>
          </div>
        </>
      )}

      {/* Plan card */}
      <section style={{ margin: '12px 16px 24px', borderRadius: 20, padding: 24, background: 'linear-gradient(135deg, #0E2A1F 0%, #1B4332 100%)' }}>
        <p style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: 0 }}>{isNri ? 'Switch to Monthly Plan' : 'Add Elder Care Plan'}</p>
        <p style={{ fontSize: 32, fontWeight: 700, color: 'var(--sage)', margin: '6px 0 0' }}>₹1,500<span style={{ fontSize: 15, fontWeight: 500 }}>/month</span></p>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.75)', margin: '8px 0 0' }}>1 visit + weekly calls + WhatsApp reports + medicine reminders.</p>
        <Link to="/services" className="ce-btn ce-btn-white ce-btn-full" style={{ marginTop: 18, padding: 14 }}>{isNri ? 'Upgrade Now →' : 'Add Elder Care →'}</Link>
      </section>

      {/* Bottom sheet */}
      {active && (
        <div ref={overlayRef} className="ce-sheet-overlay" onClick={e => { if (e.target === e.currentTarget) close() }}>
          <div className="ce-sheet">
            {!done ? (
              active.id === 'emergency_support_visit' ? (
                /* ── EMERGENCY: no scheduling, immediate dispatch ── */
                <>
                  <div className="ce-sheet-handle" />
                  <div className="flex items-center justify-between">
                    <span style={{ fontSize: 18, fontWeight: 700 }}>🚨 Emergency Visit</span>
                    <button onClick={close} aria-label="Close" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-mid)' }}><X size={22} /></button>
                  </div>
                  <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--forest)', margin: '2px 0 20px' }}>₹3,000 · Response within 2 hours</p>

                  {/* Primary: call us first */}
                  <a
                    href="tel:+919000221261"
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                      background: '#b91c1c', color: '#fff', borderRadius: 14, padding: '16px 20px',
                      fontSize: 17, fontWeight: 700, textDecoration: 'none', minHeight: 52,
                    }}
                  >
                    📞 Call +91 90002 21261
                  </a>
                  <p style={{ fontSize: 12, color: 'var(--gray-mid)', textAlign: 'center', margin: '8px 0 20px' }}>
                    Call first if this is urgent — we'll dispatch immediately.
                  </p>

                  {/* Optional note */}
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--gray-mid)', marginBottom: 6 }}>
                    DESCRIBE WHAT'S HAPPENING (OPTIONAL)
                  </label>
                  <input
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="e.g. Chest pain, fell at home, needs hospital…"
                    style={INPUT_STYLE}
                  />

                  {err && <p style={{ color: '#b42318', fontSize: 13, margin: '8px 0 0' }}>{err}</p>}

                  <button
                    onClick={confirm}
                    disabled={submitting}
                    className="ce-btn ce-btn-full"
                    style={{ marginTop: 14, padding: 16, background: '#b91c1c', color: '#fff', border: 'none', borderRadius: 'var(--radius-btn)', fontSize: 16, fontWeight: 700, cursor: submitting ? 'default' : 'pointer', opacity: submitting ? 0.7 : 1 }}
                  >
                    {submitting ? <><Loader2 size={16} className="ce-spin" /> Alerting team…</> : 'Request emergency visit →'}
                  </button>
                  <p style={{ fontSize: 11, color: 'var(--gray-mid)', textAlign: 'center', margin: '10px 0 0' }}>
                    Our team is alerted immediately — a companion will contact you within 30 minutes.
                  </p>
                </>
              ) : (
                /* ── REGULAR BOOKING: date + slot picker ── */
                <>
                  <div className="ce-sheet-handle" />
                  <div className="flex items-center justify-between">
                    <span style={{ fontSize: 18, fontWeight: 700 }}>{active.name}</span>
                    <button onClick={close} aria-label="Close" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-mid)' }}><X size={22} /></button>
                  </div>
                  <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--forest)', margin: '2px 0 16px' }}>{active.price}</p>

                  <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray-mid)', margin: '0 0 8px' }}>PICK A DAY</p>
                  <div className="ce-noscroll" style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
                    {days.map(d => {
                      const sel = date?.toDateString() === d.toDateString()
                      return (
                        <button key={d.toISOString()} onClick={() => setDate(d)} style={{
                          flexShrink: 0, borderRadius: 12, padding: '10px 14px', cursor: 'pointer', textAlign: 'center',
                          background: sel ? 'var(--forest)' : '#fff', color: sel ? '#fff' : 'var(--gray-dark)', border: sel ? 'none' : '1px solid var(--gray-light)',
                        }}>
                          <div style={{ fontSize: 11, fontWeight: 600 }}>{d.toLocaleDateString('en-IN', { weekday: 'short' })}</div>
                          <div style={{ fontSize: 16, fontWeight: 700 }}>{d.getDate()}</div>
                        </button>
                      )
                    })}
                  </div>

                  <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray-mid)', margin: '16px 0 8px' }}>PICK A TIME (IST)</p>
                  {TIME_SLOTS.map(([label, slots]) => (
                    <div key={label} style={{ marginBottom: 10 }}>
                      <p style={{ fontSize: 11, color: 'var(--gray-mid)', margin: '0 0 6px' }}>{label}</p>
                      <div style={{ display: 'flex', gap: 8 }}>
                        {slots.map(s => {
                          const sel = slot === s
                          const past = slotIsPast(date, s)
                          return (
                            <button key={s} onClick={() => { if (!past) setSlot(s) }} disabled={past} style={{
                              flex: 1, borderRadius: 8, padding: '10px 0', cursor: past ? 'default' : 'pointer', fontSize: 13, fontWeight: sel ? 600 : 400,
                              background: past ? 'var(--gray-light)' : sel ? 'var(--forest)' : 'var(--cream)',
                              color: past ? 'var(--gray-mid)' : sel ? '#fff' : 'var(--gray-dark)',
                              border: past || sel ? 'none' : '1px solid var(--gray-light)',
                              opacity: past ? 0.55 : 1,
                            }}>{slotLabel(s)}</button>
                          )
                        })}
                      </div>
                    </div>
                  ))}

                  <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any specific instructions? (optional)"
                    style={{ width: '100%', minHeight: 64, resize: 'none', background: 'var(--cream)', border: '1px solid var(--gray-light)', borderRadius: 12, padding: '12px 14px', fontSize: 15, fontFamily: 'inherit', marginTop: 8 }} />

                  {/* Collect missing fields inline */}
                  {(showAddressInput || showWhatsappInput) && (
                    <div style={{ marginTop: 14, background: '#FFF7ED', border: '1.5px solid #F59E0B', borderRadius: 14, padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                        <AlertTriangle size={14} color="#B45309" />
                        <p style={{ fontSize: 13, fontWeight: 700, color: '#B45309', margin: 0 }}>We need a few details to confirm your visit</p>
                      </div>
                      {showAddressInput && (
                        <div style={{ marginBottom: 10 }}>
                          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--gray-mid)', marginBottom: 4 }}>ADDRESS IN HYDERABAD</label>
                          <input
                            value={tempAddress}
                            onChange={e => setTempAddress(e.target.value)}
                            placeholder="Flat / house, area, landmark…"
                            style={INPUT_STYLE}
                          />
                        </div>
                      )}
                      {showWhatsappInput && (
                        <div>
                          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--gray-mid)', marginBottom: 4 }}>YOUR WHATSAPP NUMBER</label>
                          <input
                            value={tempWhatsapp}
                            onChange={e => setTempWhatsapp(e.target.value)}
                            placeholder="+91 98765 43210"
                            type="tel"
                            style={INPUT_STYLE}
                          />
                          <p style={{ fontSize: 11, color: 'var(--gray-mid)', margin: '4px 0 0' }}>We'll send confirmation and the visit report here.</p>
                        </div>
                      )}
                    </div>
                  )}

                  {err && <p style={{ color: '#b42318', fontSize: 13, margin: '8px 0 0' }}>{err}</p>}

                  <button onClick={confirm} disabled={submitting} className="ce-btn ce-btn-primary ce-btn-full" style={{ marginTop: 14, padding: 16 }}>
                    {submitting ? <><Loader2 size={16} className="ce-spin" /> Sending…</> : 'Confirm Booking →'}
                  </button>
                  <p style={{ fontSize: 11, color: 'var(--gray-mid)', textAlign: 'center', margin: '10px 0 0' }}>No charge now — we confirm a companion, then send a payment link.</p>
                </>
              )
            ) : (
              <div style={{ textAlign: 'center', padding: '16px 0 8px' }}>
                <span className="ce-check-pop" style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--sage)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Check size={32} color="var(--forest)" strokeWidth={3} />
                </span>
                <p style={{ fontSize: 22, fontWeight: 700, color: 'var(--black)', margin: '16px 0 4px' }}>Request sent</p>
                {active.id === 'emergency_support_visit' ? (
                  <p style={{ fontSize: 14, color: 'var(--gray-mid)', margin: 0 }}>
                    Our team has been alerted. A companion will contact you within 30 minutes.
                  </p>
                ) : doneNeedsDetails ? (
                  <>
                    <p style={{ fontSize: 14, color: 'var(--gray-mid)', margin: '0 0 10px' }}>
                      Your booking is saved. We'll call to confirm{doneMissing.address ? ' — our team will verify the address' : ''} before dispatching a companion.
                    </p>
                    <div style={{ background: '#FFF7ED', border: '1px solid #F59E0B', borderRadius: 12, padding: '10px 14px', fontSize: 13, color: '#B45309' }}>
                      To confirm faster, please message us on WhatsApp with your {[doneMissing.address && 'address', doneMissing.whatsapp && 'contact number'].filter(Boolean).join(' and ')}.
                    </div>
                  </>
                ) : (
                  <p style={{ fontSize: 14, color: 'var(--gray-mid)', margin: 0 }}>We'll confirm a companion within 2 hours.</p>
                )}
                <button onClick={close} className="ce-btn ce-btn-primary ce-btn-full" style={{ marginTop: 20, padding: 14 }}>Done</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
