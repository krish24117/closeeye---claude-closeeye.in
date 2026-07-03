import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Loader2, ArrowLeft, MapPin, Clock, Check, AlertTriangle, CheckCircle2, Calendar } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import { formatSlot } from '@/lib/formatTime'

// ─── Service catalog ──────────────────────────────────────────────────────────

interface Service { id: string; emoji: string; name: string; price: string; paise: number; desc: string; duration: string }

const SERVICES: Service[] = [
  { id: 'home_visit',                    emoji: '🏠', name: 'Home Visit',           price: '₹1,000', paise: 100000, desc: 'Companion visit + WhatsApp report',   duration: '60–90 min' },
  { id: 'doctor_visit_support',          emoji: '👨‍⚕️', name: 'Doctor Visit Support', price: '₹1,500', paise: 150000, desc: 'Accompanies them to the doctor',      duration: '2–3 hrs' },
  { id: 'hospital_assistance_half_day',  emoji: '🏥', name: 'Hospital Half Day',    price: '₹2,000', paise: 200000, desc: 'Up to 4 hours hospital support',       duration: 'Up to 4 hrs' },
  { id: 'hospital_assistance_full_day',  emoji: '🏥', name: 'Hospital Full Day',    price: '₹4,000', paise: 400000, desc: 'Full day. Updated every 2 hours',      duration: 'Full day' },
  { id: 'emergency_support_visit',       emoji: '🚨', name: 'Emergency Visit',      price: '₹3,000', paise: 300000, desc: 'Response within 2 hours',              duration: 'Up to 4 hrs' },
  { id: 'grocery_medicine_assistance',   emoji: '🛒', name: 'Grocery & Medicine',   price: '₹500',   paise: 50000,  desc: 'Collection and delivery',             duration: '1–2 hrs' },
  { id: 'home_maintenance_coordination', emoji: '🔧', name: 'Home Maintenance',     price: '₹500',   paise: 50000,  desc: 'Coordinate repairs',                  duration: '1–2 hrs' },
]

// ─── Time slot helpers ────────────────────────────────────────────────────────

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

// Earliest available slot across all future times
function earliestAvailable(): string | null {
  const today = new Date()
  for (let i = 0; i < 3; i++) {
    const d = new Date(today); d.setDate(d.getDate() + i)
    const groups = getGroups(d)
    if (groups.length > 0 && groups[0].slots.length > 0) {
      const slot = groups[0].slots[0]
      const label = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString('en-IN', { weekday: 'short' })
      return `${label} · ${formatSlot(slot)}`
    }
  }
  return null
}

// ─── Stepper ──────────────────────────────────────────────────────────────────

const STEP_LABELS = ['When', 'Where', 'Review']

function Stepper({ step }: { step: 1 | 2 | 3 }) {
  return (
    <div className="flex items-center px-5 py-3 bg-white border-b border-[#F0EBE1]">
      {STEP_LABELS.map((label, i) => {
        const n = i + 1
        const done = n < step
        const active = n === step
        return (
          <div key={label} className="flex items-center flex-1 last:flex-none">
            <div className="flex items-center gap-1.5">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold transition-all duration-300 ${
                done ? 'bg-[#0E2A1F] text-white' : active ? 'bg-[#0E2A1F] text-white' : 'bg-[#F0EBE1] text-[#6E6E73]'
              }`}>
                {done ? <Check size={11} strokeWidth={3} /> : n}
              </div>
              <span className={`text-[12px] font-semibold transition-colors ${active ? 'text-[#0E2A1F]' : done ? 'text-[#0E2A1F]' : 'text-[#AEAEAE]'}`}>
                {label}
              </span>
            </div>
            {i < STEP_LABELS.length - 1 && (
              <div className={`flex-1 h-px mx-2 transition-colors duration-500 ${done ? 'bg-[#0E2A1F]' : 'bg-[#E5E5EA]'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Address fields state ─────────────────────────────────────────────────────

interface AddrFields { house: string; area: string; landmark: string; city: string; pincode: string }
const EMPTY_ADDR: AddrFields = { house: '', area: '', landmark: '', city: 'Hyderabad', pincode: '' }

function addrFromFields(f: AddrFields) {
  return [f.house, f.area, f.landmark, f.city, f.pincode].filter(Boolean).join(', ')
}

// ─── Main component ───────────────────────────────────────────────────────────

type WizardStep = 1 | 2 | 3 | 'done'

export function BookServicePage() {
  const { serviceId } = useParams<{ serviceId: string }>()
  const navigate = useNavigate()
  const { user, profile } = useAuth()

  const service = SERVICES.find(s => s.id === serviceId)
  const isEmergency = service?.id === 'emergency_support_visit'
  const isNri = profile?.user_type === 'nri'

  // ── Recipient ──────────────────────────────────────────────────────────────
  const [recipientName, setRecipientName] = useState('')
  const [savedAddress, setSavedAddress]   = useState('')

  // ── Wizard state ───────────────────────────────────────────────────────────
  const [step, setStep] = useState<WizardStep>(isEmergency ? 2 : 1)
  const [date, setDate] = useState<Date | null>(null)
  const [slot, setSlot] = useState('')

  // Address: either use saved or structured new fields
  const [usingSaved, setUsingSaved]   = useState(true)
  const [addrFields, setAddrFields]   = useState<AddrFields>(EMPTY_ADDR)
  const [emergencyAddr, setEmergencyAddr] = useState('')
  const [notes, setNotes]   = useState('')
  const [whatsapp, setWhatsapp] = useState('')

  // ── Submit state ──────────────────────────────────────────────────────────
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr]               = useState('')
  const [requestId, setRequestId]   = useState<string | null>(null)

  // Scroll body ref for step transitions
  const bodyRef = useRef<HTMLDivElement>(null)

  // ── Load saved data ───────────────────────────────────────────────────────
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
        setUsingSaved(!!addr)
      })()
    } else {
      supabase.from('society_members').select('name, flat_number, area, society_name').eq('user_id', user.id).maybeSingle()
        .then(({ data }) => {
          const name = data?.name || profile?.full_name || ''
          const addr = [data?.flat_number, data?.society_name, data?.area].filter(Boolean).join(', ')
          setRecipientName(name)
          setSavedAddress(addr)
          setUsingSaved(!!addr)
        })
    }
  }, [user, isNri, profile])

  if (!service) return (
    <div className="flex flex-col items-center justify-center px-5 py-16 gap-4">
      <p className="text-[#6E6E73]">Service not found.</p>
      <button onClick={() => navigate('/dashboard/book')} className="text-[#0E2A1F] font-bold text-[15px] bg-none border-none cursor-pointer">
        ← Back to services
      </button>
    </div>
  )

  const showWhatsapp  = !profile?.whatsapp_number?.trim()
  const effectiveWa   = whatsapp.trim() || profile?.whatsapp_number || ''
  const groups        = getGroups(date)
  const todayHasSlots = istNow().min + LEAD_TIME_MIN < 20 * 60
  const earliest      = earliestAvailable()
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() + i + (todayHasSlots ? 0 : 1)); return d
  })

  // The address to submit
  const effectiveAddress = isEmergency
    ? emergencyAddr.trim()
    : usingSaved ? savedAddress : addrFromFields(addrFields)

  function scrollTop() { bodyRef.current?.scrollTo({ top: 0, behavior: 'smooth' }) }

  function goBack() {
    setErr('')
    if (step === 'done') { navigate('/dashboard/bookings', { replace: true }); return }
    if (!isEmergency && step > 1) { setStep(s => (typeof s === 'number' ? s - 1 : 3) as WizardStep); scrollTop() }
    else navigate('/dashboard/book')
  }

  function goNext() {
    setErr('')
    if (step === 1) {
      if (!date) { setErr('Select a day first.'); return }
      if (!slot) { setErr('Select a time slot.'); return }
      setStep(2); scrollTop()
    } else if (step === 2) {
      const a = effectiveAddress
      if (!a) { setErr('Enter a visiting address.'); return }
      setStep(3); scrollTop()
    }
  }

  async function submit() {
    if (!service) return
    if (!effectiveAddress) { setErr('Enter a visiting address.'); return }
    setSubmitting(true); setErr('')

    let scheduled_at_ist: string | null = null
    if (!isEmergency && date && slot) {
      const y  = date.getFullYear()
      const mo = String(date.getMonth() + 1).padStart(2, '0')
      const dy = String(date.getDate()).padStart(2, '0')
      scheduled_at_ist = `${y}-${mo}-${dy}T${slot}:00+05:30`
    }

    const { data: result, error } = await supabase.functions.invoke('submit-booking-request', {
      body: {
        service_id:          service.id,
        service_name:        service.name,
        amount_paise:        service.paise,
        scheduled_at_ist,
        recipient_name:      recipientName,
        recipient_address:   effectiveAddress,
        requester_whatsapp:  effectiveWa,
        notes:               notes.trim() || null,
        is_emergency:        isEmergency,
      },
    })

    setSubmitting(false)
    if (error || !(result as { ok?: boolean })?.ok) {
      console.error('[BookService] submit failed:', error, result)
      setErr("Couldn't send your request. Please try again.")
      return
    }

    const rid = (result as { request_id?: string })?.request_id ?? null
    setRequestId(rid)
    console.info('[BookService] saved, request_id:', rid)
    setStep('done')
    scrollTop()
  }

  // ── CTA disabled logic ────────────────────────────────────────────────────
  const ctaDisabled =
    isEmergency   ? (submitting || !emergencyAddr.trim()) :
    step === 1    ? (!date || !slot) :
    step === 2    ? !effectiveAddress :
    step === 3    ? submitting :
    false

  const headerSubtitle =
    isEmergency           ? 'Emergency request'      :
    step === 1            ? 'Schedule your visit'    :
    step === 2            ? 'Where are we going?'    :
    step === 3            ? 'Review & confirm'       :
    'Booking confirmed'

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#fff' }}>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-[#F0EBE1] shrink-0">
        {step !== 'done' && (
          <button onClick={goBack} aria-label="Go back"
            className="w-10 h-10 rounded-full bg-[#F5F0E8] flex items-center justify-center shrink-0 min-w-[40px]">
            <ArrowLeft size={18} color="#0E2A1F" />
          </button>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-bold text-[#1D1D1F] truncate leading-tight">
            {service.emoji} {service.name}
          </p>
          <p className="text-[11px] text-[#6E6E73] leading-tight">{headerSubtitle}</p>
        </div>
        <span className="text-[15px] font-bold text-[#0E2A1F] shrink-0">{service.price}</span>
      </div>

      {/* ── Stepper ─────────────────────────────────────────────────────── */}
      {!isEmergency && step !== 'done' && <Stepper step={step as 1 | 2 | 3} />}

      {/* ── Scrollable body ─────────────────────────────────────────────── */}
      <div ref={bodyRef} style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' as React.CSSProperties['WebkitOverflowScrolling'] }}>
        <div className="px-4 pt-5 pb-4">

          {/* ════════ SUCCESS SCREEN ════════ */}
          {step === 'done' && (
            <SuccessScreen
              serviceName={service.name}
              date={date}
              slot={slot}
              isEmergency={isEmergency}
              onViewBooking={() => navigate('/dashboard/bookings', { replace: true })}
              onHome={() => navigate('/dashboard', { replace: true })}
            />
          )}

          {/* ════════ EMERGENCY ════════ */}
          {isEmergency && step !== 'done' && (
            <div className="flex flex-col gap-3">
              <a href="tel:+919000221261"
                className="flex items-center justify-center gap-3 bg-[#b91c1c] text-white rounded-[16px] py-4 text-[16px] font-bold no-underline min-h-[56px]">
                📞 Call +91 90002 21261
              </a>
              <p className="text-[12.5px] text-[#6E6E73] text-center">Call first if urgent — we'll dispatch immediately.</p>
              <FieldBlock label="Address *">
                <textarea value={emergencyAddr} onChange={e => setEmergencyAddr(e.target.value)}
                  placeholder="Flat / house, area, landmark…" rows={3} autoFocus
                  className="w-full bg-transparent border-none outline-none text-[15px] resize-none leading-relaxed" />
              </FieldBlock>
              <FieldBlock label="What's happening? (optional)">
                <textarea value={notes} onChange={e => setNotes(e.target.value)}
                  placeholder="e.g. Chest pain, fell at home, needs hospital…" rows={3}
                  className="w-full bg-transparent border-none outline-none text-[15px] resize-none leading-relaxed" />
              </FieldBlock>
            </div>
          )}

          {/* ════════ STEP 1: WHEN ════════ */}
          {!isEmergency && step === 1 && (
            <div className="flex flex-col gap-5">
              {/* Earliest hint */}
              {earliest && (
                <div className="flex items-center gap-2 bg-green-50 border border-green-100 rounded-[14px] px-4 py-3">
                  <CheckCircle2 size={14} className="text-green-700 shrink-0" />
                  <p className="text-[12.5px] text-green-700 font-medium">Earliest available: <strong>{earliest}</strong></p>
                </div>
              )}

              {/* Date strip */}
              <div>
                <SectionLabel>Select a date</SectionLabel>
                <div className="flex gap-2.5 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
                  {days.map((d, i) => {
                    const sel = date?.toDateString() === d.toDateString()
                    const dayLabel = i === 0 && todayHasSlots ? 'Today' : i === (todayHasSlots ? 1 : 0) ? 'Tomorrow' : d.toLocaleDateString('en-IN', { weekday: 'short' })
                    return (
                      <button key={d.toISOString()} onClick={() => { setDate(d); setSlot(''); setErr('') }}
                        aria-label={d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
                        aria-pressed={sel}
                        className={`shrink-0 min-w-[64px] rounded-[16px] py-3 px-2 text-center border-2 transition-all duration-200 ${
                          sel
                            ? 'bg-[#0E2A1F] border-[#0E2A1F] text-white'
                            : 'bg-[#FAF7F2] border-transparent text-[#3A3A3C]'
                        }`}>
                        <div className={`text-[10.5px] font-semibold mb-1 ${sel ? 'text-[#A8D5B5]' : 'text-[#6E6E73]'}`}>
                          {dayLabel}
                        </div>
                        <div className="text-[22px] font-bold leading-none" style={{ letterSpacing: '-0.02em' }}>{d.getDate()}</div>
                        <div className={`text-[10.5px] mt-1 ${sel ? 'text-[#A8D5B5]' : 'text-[#AEAEAE]'}`}>
                          {d.toLocaleDateString('en-IN', { month: 'short' })}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Time groups */}
              {!date ? (
                <div className="flex flex-col items-center gap-2 py-8 text-[#AEAEAE]">
                  <Calendar size={28} />
                  <p className="text-[13.5px] font-medium">Select a date to see available times</p>
                </div>
              ) : groups.length === 0 ? (
                <div className="flex items-start gap-3 bg-amber-50 border border-amber-100 rounded-[14px] px-4 py-3.5">
                  <AlertTriangle size={15} className="text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[13px] font-semibold text-amber-800">No slots available</p>
                    <p className="text-[12px] text-amber-700 mt-0.5">All times are taken for today — pick another day.</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <SectionLabel>Select a time</SectionLabel>
                    <span className="text-[11px] text-[#AEAEAE]">min. 3h notice</span>
                  </div>
                  {groups.map(g => (
                    <div key={g.label}>
                      <p className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-[#AEAEAE] mb-2">{g.label}</p>
                      <div className="flex flex-wrap gap-2">
                        {g.slots.map(s => {
                          const sel = slot === s
                          return (
                            <button key={s} onClick={() => { setSlot(s); setErr('') }}
                              aria-pressed={sel}
                              className={`rounded-[12px] px-4 py-2.5 text-[13.5px] font-semibold min-h-[44px] border-2 transition-all duration-200 ${
                                sel
                                  ? 'bg-[#0E2A1F] border-[#0E2A1F] text-white'
                                  : 'bg-[#FAF7F2] border-transparent text-[#3A3A3C]'
                              }`}>
                              {formatSlot(s)}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ════════ STEP 2: WHERE ════════ */}
          {!isEmergency && step === 2 && (
            <AddressStep
              savedAddress={savedAddress}
              usingSaved={usingSaved}
              setUsingSaved={setUsingSaved}
              addrFields={addrFields}
              setAddrFields={setAddrFields}
              notes={notes}
              setNotes={setNotes}
              showWhatsapp={showWhatsapp}
              whatsapp={whatsapp}
              setWhatsapp={setWhatsapp}
              setErr={setErr}
            />
          )}

          {/* ════════ STEP 3: REVIEW ════════ */}
          {!isEmergency && step === 3 && (
            <ReviewStep
              service={service}
              date={date}
              slot={slot}
              address={effectiveAddress}
              notes={notes}
              recipientName={recipientName}
            />
          )}

        </div>
      </div>

      {/* ── Fixed CTA footer ─────────────────────────────────────────────── */}
      {step !== 'done' && (
        <div
          className="shrink-0 bg-white border-t border-[#F0EBE1] px-4 pt-3"
          style={{ paddingBottom: 'calc(12px + env(safe-area-inset-bottom))' }}
        >
          {err && <p className="text-[12.5px] text-red-600 text-center mb-2.5 font-medium">{err}</p>}

          {isEmergency ? (
            <>
              <CtaButton
                onClick={submit}
                disabled={ctaDisabled}
                loading={submitting}
                loadingLabel="Alerting team…"
                variant="emergency"
              >
                Request emergency visit →
              </CtaButton>
              <p className="text-[11px] text-[#6E6E73] text-center mt-2">
                Our team is alerted immediately — a companion will contact you within 30 minutes.
              </p>
            </>
          ) : step < 3 ? (
            <CtaButton onClick={goNext} disabled={ctaDisabled}>
              Continue →
            </CtaButton>
          ) : (
            <>
              <CtaButton onClick={submit} disabled={ctaDisabled} loading={submitting} loadingLabel="Sending…">
                Confirm Booking →
              </CtaButton>
              <p className="text-[11px] text-[#6E6E73] text-center mt-2">
                No charge now — we'll send a payment link after confirming your companion.
              </p>
            </>
          )}
        </div>
      )}

    </div>
  )
}

// ─── AddressStep ──────────────────────────────────────────────────────────────

function AddressStep({
  savedAddress, usingSaved, setUsingSaved,
  addrFields, setAddrFields,
  notes, setNotes,
  showWhatsapp, whatsapp, setWhatsapp,
  setErr,
}: {
  savedAddress: string
  usingSaved: boolean
  setUsingSaved: (v: boolean) => void
  addrFields: AddrFields
  setAddrFields: (fn: (f: AddrFields) => AddrFields) => void
  notes: string
  setNotes: (v: string) => void
  showWhatsapp: boolean
  whatsapp: string
  setWhatsapp: (v: string) => void
  setErr: (v: string) => void
}) {
  const firstRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!usingSaved) { setTimeout(() => firstRef.current?.focus(), 50) }
  }, [usingSaved])

  return (
    <div className="flex flex-col gap-4">

      {/* Saved address card */}
      {savedAddress && (
        <div className={`rounded-[18px] border-2 transition-all duration-200 overflow-hidden ${usingSaved ? 'border-[#0E2A1F]' : 'border-[#EDE8E0]'}`}>
          <button
            onClick={() => { setUsingSaved(true); setErr('') }}
            className="w-full flex items-start gap-3 p-4 text-left min-h-[60px]"
          >
            <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${usingSaved ? 'bg-[#0E2A1F]' : 'bg-[#F5F0E8]'}`}>
              {usingSaved ? <Check size={14} color="#fff" strokeWidth={3} /> : <MapPin size={14} color="#0E2A1F" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-[12px] font-bold mb-0.5 ${usingSaved ? 'text-[#0E2A1F]' : 'text-[#6E6E73]'}`}>
                Saved address
              </p>
              <p className="text-[13px] text-[#3A3A3C] leading-relaxed">{savedAddress}</p>
            </div>
          </button>
        </div>
      )}

      {/* Enter new address toggle */}
      {savedAddress && (
        <button
          onClick={() => { setUsingSaved(false); setErr('') }}
          className={`flex items-center gap-2 text-[13px] font-semibold rounded-[14px] px-4 py-3 min-h-[44px] border-2 transition-all w-full ${
            !usingSaved ? 'border-[#0E2A1F] text-[#0E2A1F] bg-[#F5F0E8]' : 'border-[#EDE8E0] text-[#6E6E73] bg-transparent'
          }`}
        >
          <MapPin size={14} />
          {usingSaved ? 'Enter a different address' : 'Using a new address ↓'}
        </button>
      )}

      {/* Structured address fields */}
      {(!savedAddress || !usingSaved) && (
        <div className="flex flex-col gap-3">
          {!savedAddress && <SectionLabel>Visiting address</SectionLabel>}
          {[
            { key: 'house' as const,    label: 'House / Flat *',    placeholder: 'e.g. Flat 4B, Sunrise Apartments', ref: firstRef },
            { key: 'area' as const,     label: 'Area *',            placeholder: 'e.g. Jubilee Hills', ref: null },
            { key: 'landmark' as const, label: 'Landmark',          placeholder: 'e.g. Near Apollo Hospital', ref: null },
            { key: 'city' as const,     label: 'City',              placeholder: 'Hyderabad', ref: null },
            { key: 'pincode' as const,  label: 'Pincode',           placeholder: '500034', ref: null },
          ].map(f => (
            <div key={f.key} className="bg-[#FAF7F2] rounded-[14px] px-4 py-3">
              <label className="block text-[10.5px] font-bold uppercase tracking-[0.08em] text-[#6E6E73] mb-1.5">{f.label}</label>
              <input
                ref={f.ref}
                value={addrFields[f.key]}
                onChange={e => { setAddrFields(a => ({ ...a, [f.key]: e.target.value })); setErr('') }}
                placeholder={f.placeholder}
                className="w-full bg-transparent border-none outline-none text-[14.5px] text-[#1D1D1F]"
                type={f.key === 'pincode' ? 'number' : 'text'}
              />
            </div>
          ))}
        </div>
      )}

      {/* Special instructions */}
      <FieldBlock label="Special instructions (optional)">
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Gate code, lift issue, medicines to remind, anything the companion should know…"
          rows={3}
          className="w-full bg-transparent border-none outline-none text-[14.5px] resize-none leading-relaxed"
        />
      </FieldBlock>

      {/* WhatsApp prompt */}
      {showWhatsapp && (
        <div className="bg-amber-50 border-2 border-amber-200 rounded-[16px] px-4 py-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={14} className="text-amber-600 shrink-0" />
            <p className="text-[13px] font-bold text-amber-800">Add WhatsApp to receive the visit report</p>
          </div>
          <input
            value={whatsapp}
            onChange={e => setWhatsapp(e.target.value)}
            placeholder="+91 98765 43210"
            type="tel"
            className="w-full bg-white border border-amber-300 rounded-[12px] px-3 py-2.5 text-[14px] outline-none"
          />
        </div>
      )}
    </div>
  )
}

// ─── ReviewStep ───────────────────────────────────────────────────────────────

const INCLUDED = [
  'Trained, verified companion',
  'Real-time WhatsApp report',
  'GPS-verified visit record',
  'Emergency escalation if needed',
]

function ReviewStep({ service, date, slot, address, notes, recipientName }: {
  service: Service; date: Date | null; slot: string
  address: string; notes: string; recipientName: string
}) {
  return (
    <div className="flex flex-col gap-4">
      <SectionLabel>Booking summary</SectionLabel>

      {/* Summary card */}
      <div className="bg-[#FAF7F2] rounded-[20px] overflow-hidden">
        {/* Service header */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-[#EDE8E0]">
          <span className="text-[28px]">{service.emoji}</span>
          <div className="flex-1">
            <p className="text-[16px] font-bold text-[#1D1D1F] leading-tight">{service.name}</p>
            <p className="text-[12px] text-[#6E6E73] mt-0.5">{service.desc}</p>
          </div>
          <p className="text-[16px] font-bold text-[#0E2A1F] shrink-0">{service.price}</p>
        </div>

        {/* Date/time row */}
        {date && slot && (
          <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[#EDE8E0]">
            <Clock size={15} className="text-[#0E2A1F] shrink-0" />
            <div className="flex-1">
              <p className="text-[12px] text-[#6E6E73] font-medium">When</p>
              <p className="text-[13.5px] font-semibold text-[#1D1D1F] mt-0.5">
                {date.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })} at {formatSlot(slot)}
              </p>
            </div>
          </div>
        )}

        {/* Address row */}
        <div className={`flex items-start gap-3 px-4 py-3.5 ${notes ? 'border-b border-[#EDE8E0]' : ''}`}>
          <MapPin size={15} className="text-[#0E2A1F] shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-[12px] text-[#6E6E73] font-medium">Where</p>
            <p className="text-[13.5px] font-semibold text-[#1D1D1F] mt-0.5 leading-relaxed">{address}</p>
            {recipientName && <p className="text-[11.5px] text-[#6E6E73] mt-0.5">For {recipientName}</p>}
          </div>
        </div>

        {/* Notes row */}
        {notes && (
          <div className="px-4 py-3.5">
            <p className="text-[12px] text-[#6E6E73] font-medium mb-0.5">Instructions</p>
            <p className="text-[13px] text-[#3A3A3C] leading-relaxed">{notes}</p>
          </div>
        )}
      </div>

      {/* Duration */}
      <div className="flex items-center gap-3 bg-[#FAF7F2] rounded-[14px] px-4 py-3">
        <Clock size={14} className="text-[#0E2A1F] shrink-0" />
        <p className="text-[13px] text-[#3A3A3C]">Estimated duration: <strong className="text-[#1D1D1F]">{service.duration}</strong></p>
      </div>

      {/* What's included */}
      <div className="bg-white border border-[#EDE8E0] rounded-[18px] px-4 py-4">
        <p className="text-[11.5px] font-bold uppercase tracking-[0.1em] text-[#6E6E73] mb-3">What's included</p>
        <div className="flex flex-col gap-2.5">
          {INCLUDED.map(item => (
            <div key={item} className="flex items-center gap-2.5">
              <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                <Check size={10} className="text-green-700" strokeWidth={3} />
              </div>
              <span className="text-[13px] text-[#3A3A3C]">{item}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Trust card */}
      <div className="flex items-start gap-3 bg-green-50 border border-green-100 rounded-[16px] px-4 py-4">
        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center shrink-0 mt-0.5">
          <CheckCircle2 size={16} className="text-green-700" />
        </div>
        <div>
          <p className="text-[13px] font-bold text-green-800">No payment today</p>
          <p className="text-[12px] text-green-700 mt-1 leading-relaxed">
            We first assign a verified companion. Once confirmed, you'll receive a secure WhatsApp payment link. Payment is collected only after confirmation.
          </p>
        </div>
      </div>
    </div>
  )
}

// ─── SuccessScreen ────────────────────────────────────────────────────────────

function SuccessScreen({ serviceName, date, slot, isEmergency, onViewBooking, onHome }: {
  serviceName: string; date: Date | null; slot: string; isEmergency: boolean
  onViewBooking: () => void; onHome: () => void
}) {
  return (
    <div className="flex flex-col items-center text-center pt-6 pb-4 animate-fade-in">
      {/* Icon */}
      <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center mb-5">
        <CheckCircle2 size={40} className="text-green-600" />
      </div>

      <h2 className="text-[24px] font-bold text-[#1D1D1F] mb-2" style={{ letterSpacing: '-0.02em' }}>
        {isEmergency ? 'Emergency Requested' : 'Booking Requested'}
      </h2>
      <p className="text-[14px] text-[#6E6E73] leading-relaxed mb-1">
        We've received your request for <strong className="text-[#1D1D1F]">{serviceName}</strong>.
      </p>
      {date && slot && (
        <p className="text-[13px] text-[#6E6E73] mb-6">
          {date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })} · {formatSlot(slot)}
        </p>
      )}
      {!date && <div className="mb-6" />}

      {/* Next steps */}
      <div className="w-full bg-[#FAF7F2] rounded-[20px] px-5 py-5 mb-5 text-left">
        <p className="text-[11.5px] font-bold uppercase tracking-[0.1em] text-[#6E6E73] mb-4">What happens next</p>
        {(isEmergency
          ? ['Companion dispatching now', 'WhatsApp update within 30 min', 'We stay connected throughout']
          : ['Companion being assigned', 'WhatsApp confirmation sent', 'Secure payment link via WhatsApp']
        ).map((step, i) => (
          <div key={step} className={`flex items-start gap-3 ${i > 0 ? 'mt-3.5' : ''}`}>
            <div className="w-6 h-6 rounded-full bg-[#0E2A1F] flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-[10px] font-bold text-white">{i + 1}</span>
            </div>
            <p className="text-[13.5px] text-[#3A3A3C] leading-relaxed">{step}</p>
          </div>
        ))}
      </div>

      {/* Estimated time */}
      {!isEmergency && (
        <div className="w-full flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-[14px] px-4 py-3 mb-6">
          <Clock size={14} className="text-blue-600 shrink-0" />
          <p className="text-[12.5px] text-blue-700">Estimated confirmation: <strong>30–60 minutes</strong></p>
        </div>
      )}

      {/* CTAs */}
      <button onClick={onViewBooking}
        className="w-full bg-[#0E2A1F] text-white text-[15px] font-bold rounded-[16px] py-4 min-h-[52px] mb-3">
        View My Booking
      </button>
      <button onClick={onHome}
        className="w-full bg-[#F5F0E8] text-[#0E2A1F] text-[14px] font-semibold rounded-[16px] py-3.5 min-h-[48px]">
        Return to Home
      </button>
    </div>
  )
}

// ─── CtaButton ────────────────────────────────────────────────────────────────

function CtaButton({ children, onClick, disabled, loading, loadingLabel, variant }: {
  children: React.ReactNode; onClick: () => void; disabled?: boolean
  loading?: boolean; loadingLabel?: string; variant?: 'emergency'
}) {
  const bg = variant === 'emergency' ? 'bg-[#b91c1c]' : 'bg-[#0E2A1F]'
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-disabled={disabled}
      className={`w-full ${bg} text-white text-[16px] font-bold rounded-[16px] py-4 min-h-[54px] flex items-center justify-center gap-2 transition-opacity duration-200 ${disabled ? 'opacity-40' : 'opacity-100'}`}
    >
      {loading ? <><Loader2 size={17} className="ce-spin" />{loadingLabel ?? 'Loading…'}</> : children}
    </button>
  )
}

// ─── Small helpers ────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#6E6E73] mb-0">
      {children}
    </p>
  )
}

function FieldBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#FAF7F2] rounded-[16px] px-4 py-3.5">
      <p className="text-[10.5px] font-bold uppercase tracking-[0.08em] text-[#6E6E73] mb-2">{label}</p>
      {children}
    </div>
  )
}
