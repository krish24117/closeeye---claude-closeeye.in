import { useEffect, useState } from 'react'
import { Loader2, Check, X } from 'lucide-react'
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

export function DashboardBook() {
  const { user, profile } = useAuth()
  const isNri = profile?.user_type === 'nri'
  const [recipient, setRecipient] = useState<{ name: string; address: string }>({ name: '', address: '' })

  const [active, setActive] = useState<Service | null>(null)
  const [date, setDate] = useState<Date | null>(null)
  const [slot, setSlot] = useState<string>('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [err, setErr] = useState('')

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

  const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() + i); return d })

  function openSheet(s: Service) { setActive(s); setDate(null); setSlot(''); setNotes(''); setDone(false); setErr('') }
  function close() { setActive(null) }

  async function confirm() {
    if (!active || !date || !slot) { setErr('Please pick a date and time.'); return }
    setSubmitting(true); setErr('')
    const y = date.getFullYear(), m = String(date.getMonth() + 1).padStart(2, '0'), d = String(date.getDate()).padStart(2, '0')
    const scheduled_at_ist = `${y}-${m}-${d}T${slot}:00+05:30`
    const { error } = await supabase.functions.invoke('submit-booking-request', {
      body: {
        service_id: active.id, service_name: active.name, amount_paise: active.paise,
        scheduled_at_ist, recipient_name: recipient.name, recipient_address: recipient.address,
        requester_whatsapp: profile?.whatsapp_number || '', notes: notes.trim() || null,
      },
    })
    setSubmitting(false)
    if (error) { setErr("Couldn't send your request. Please try again."); return }
    setDone(true)
  }

  return (
    <div className="ce-slide-up" style={{ paddingBottom: 8 }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, margin: '16px 16px 4px' }}>Book a Service</h1>
      <p style={{ fontSize: 14, color: 'var(--gray-mid)', margin: '0 16px 16px' }}>
        {isNri ? `For ${recipient.name || 'your loved one'} · Hyderabad` : 'For your family · Hyderabad'}
      </p>

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

      {/* Plan card */}
      <section style={{ margin: '12px 16px 24px', borderRadius: 20, padding: 24, background: 'linear-gradient(135deg, #0E2A1F 0%, #1B4332 100%)' }}>
        <p style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: 0 }}>{isNri ? 'Switch to Monthly Plan' : 'Add Elder Care Plan'}</p>
        <p style={{ fontSize: 32, fontWeight: 700, color: 'var(--sage)', margin: '6px 0 0' }}>₹1,500<span style={{ fontSize: 15, fontWeight: 500 }}>/month</span></p>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.75)', margin: '8px 0 0' }}>1 visit + weekly calls + WhatsApp reports + medicine reminders.</p>
        <a href="/services" className="ce-btn ce-btn-white ce-btn-full" style={{ marginTop: 18, padding: 14 }}>{isNri ? 'Upgrade Now →' : 'Add Elder Care →'}</a>
      </section>

      {/* Bottom sheet */}
      {active && (
        <div className="ce-sheet-overlay" onClick={e => { if (e.target === e.currentTarget) close() }}>
          <div className="ce-sheet">
            {!done ? (
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
                        return (
                          <button key={s} onClick={() => setSlot(s)} style={{
                            flex: 1, borderRadius: 8, padding: '10px 0', cursor: 'pointer', fontSize: 13, fontWeight: sel ? 600 : 400,
                            background: sel ? 'var(--forest)' : 'var(--cream)', color: sel ? '#fff' : 'var(--gray-dark)', border: sel ? 'none' : '1px solid var(--gray-light)',
                          }}>{slotLabel(s)}</button>
                        )
                      })}
                    </div>
                  </div>
                ))}

                <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any specific instructions? (optional)"
                  style={{ width: '100%', minHeight: 64, resize: 'none', background: 'var(--cream)', border: '1px solid var(--gray-light)', borderRadius: 12, padding: '12px 14px', fontSize: 15, fontFamily: 'inherit', marginTop: 8 }} />

                {err && <p style={{ color: '#b42318', fontSize: 13, margin: '8px 0 0' }}>{err}</p>}

                <button onClick={confirm} disabled={submitting} className="ce-btn ce-btn-primary ce-btn-full" style={{ marginTop: 14, padding: 16 }}>
                  {submitting ? <><Loader2 size={16} className="ce-spin" /> Sending…</> : 'Confirm Booking →'}
                </button>
                <p style={{ fontSize: 11, color: 'var(--gray-mid)', textAlign: 'center', margin: '10px 0 0' }}>No charge now — we confirm a companion, then send a payment link.</p>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '16px 0 8px' }}>
                <span className="ce-check-pop" style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--sage)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Check size={32} color="var(--forest)" strokeWidth={3} />
                </span>
                <p style={{ fontSize: 22, fontWeight: 700, color: 'var(--black)', margin: '16px 0 4px' }}>Booking Confirmed</p>
                <p style={{ fontSize: 14, color: 'var(--gray-mid)', margin: 0 }}>We'll confirm a companion within 2 hours.</p>
                <button onClick={close} className="ce-btn ce-btn-primary ce-btn-full" style={{ marginTop: 20, padding: 14 }}>Done</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
