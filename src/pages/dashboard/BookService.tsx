import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Loader2, ArrowLeft, ArrowRight, MapPin, Clock, Check, AlertTriangle, CheckCircle2, Calendar, User } from 'lucide-react'
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

// ─── Relationship options ─────────────────────────────────────────────────────

const RELATIONSHIPS = ['Mother', 'Father', 'Parents', 'Grandmother', 'Grandfather', 'Relative', 'Other']

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

const STEP_LABELS = ['When', 'Parent', 'Where', 'Review']

function Stepper({ step }: { step: 1 | 2 | 3 | 4 }) {
  return (
    <div className="flex items-center px-5 py-3 bg-white border-b border-[#F0EBE1]">
      {STEP_LABELS.map((label, i) => {
        const n = i + 1
        const done   = n < step
        const active = n === step
        return (
          <div key={label} className="flex items-center flex-1 last:flex-none">
            <div className="flex items-center gap-1.5">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold transition-all duration-300 ${
                done || active ? 'bg-[#0E2A1F] text-white' : 'bg-[#F0EBE1] text-[#6E6E73]'
              }`}>
                {done ? <Check size={11} strokeWidth={3} /> : n}
              </div>
              <span className={`text-[12px] font-semibold transition-colors ${active || done ? 'text-[#0E2A1F]' : 'text-[#AEAEAE]'}`}>
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

// ─── Types ────────────────────────────────────────────────────────────────────

interface LovedOneWithAddr { id: string; full_name: string; savedAddress: string | null }

// ─── Main component ───────────────────────────────────────────────────────────

type WizardStep = 1 | 2 | 3 | 4 | 'done'

export function BookServicePage() {
  const { serviceId } = useParams<{ serviceId: string }>()
  const navigate = useNavigate()
  const { user, profile } = useAuth()

  const service    = SERVICES.find(s => s.id === serviceId)
  const isEmergency = service?.id === 'emergency_support_visit'
  const isNri       = profile?.user_type === 'nri'

  // ── Core state ─────────────────────────────────────────────────────────────
  const [step, setStep]   = useState<WizardStep>(isEmergency ? 2 : 1)
  const [date, setDate]   = useState<Date | null>(null)
  const [slot, setSlot]   = useState('')

  // Parent step
  const [lovedOnes, setLovedOnes]   = useState<LovedOneWithAddr[]>([])
  const [selectedLO, setSelectedLO] = useState<LovedOneWithAddr | null>(null)
  const [recipientName, setRecipientName] = useState('')
  const [relationship, setRelationship]   = useState('')
  const [whatsapp, setWhatsapp]           = useState('')

  // Address step
  const [societyAddr, setSocietyAddr] = useState('')
  const [address, setAddress]         = useState('')
  const [emergencyAddr, setEmergencyAddr] = useState('')
  const [notes, setNotes]             = useState('')

  // Submit state
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr]               = useState('')
  const [requestId, setRequestId]   = useState<string | null>(null)

  const bodyRef = useRef<HTMLDivElement>(null)

  // ── Load profile / loved ones data ─────────────────────────────────────────
  useEffect(() => {
    if (!user) return
    if (isNri) {
      supabase
        .from('loved_ones')
        .select('id, full_name, elder_profiles(address)')
        .eq('family_user_id', user.id)
        .order('created_at')
        .then(({ data }) => {
          const los: LovedOneWithAddr[] = (data || []).map((lo: Record<string, unknown>) => ({
            id: lo.id as string,
            full_name: lo.full_name as string,
            savedAddress: ((lo.elder_profiles as Record<string, unknown>[])?.[0]?.address as string) || null,
          }))
          setLovedOnes(los)
          if (los.length === 1) {
            setSelectedLO(los[0])
            setRecipientName(n => n || los[0].full_name)
          }
        })
    } else {
      supabase
        .from('society_members')
        .select('name, flat_number, area, society_name')
        .eq('user_id', user.id)
        .maybeSingle()
        .then(({ data }) => {
          const addr = [data?.flat_number, data?.society_name, data?.area].filter(Boolean).join(', ')
          setSocietyAddr(addr)
          if (data?.name) setRecipientName(n => n || (data.name as string))
        })
    }
  }, [user, isNri]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Draft persistence (sessionStorage) ──────────────────────────────────────
  const DRAFT_KEY = `ce_booking_draft_${serviceId}`

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY)
      if (!raw) return
      const d = JSON.parse(raw) as Record<string, unknown>
      if (d.date) setDate(new Date(d.date as string))
      if (d.slot) setSlot(d.slot as string)
      if (d.recipientName) setRecipientName(d.recipientName as string)
      if (d.relationship) setRelationship(d.relationship as string)
      if (d.whatsapp) setWhatsapp(d.whatsapp as string)
      if (d.address) setAddress(d.address as string)
      if (d.notes) setNotes(d.notes as string)
      if (typeof d.step === 'number' && d.step >= 1 && d.step <= 4 && !isEmergency) {
        setStep(d.step as WizardStep)
      }
    } catch { /* ignore corrupt draft */ }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (step === 'done') { sessionStorage.removeItem(DRAFT_KEY); return }
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify({
        date: date?.toISOString() ?? null,
        slot, recipientName, relationship, whatsapp, address, notes, step,
      }))
    } catch { /* quota exceeded — ignore */ }
  }, [date, slot, recipientName, relationship, whatsapp, address, notes, step]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!service) return (
    <div className="flex flex-col items-center justify-center px-5 py-16 gap-4">
      <p className="text-[#6E6E73]">Service not found.</p>
      <button onClick={() => navigate('/dashboard/book')} className="text-[#0E2A1F] font-bold text-[15px] bg-none border-none cursor-pointer">
        ← Back to services
      </button>
    </div>
  )

  const showWhatsapp    = !profile?.whatsapp_number?.trim()
  const effectiveWa     = whatsapp.trim() || profile?.whatsapp_number || ''
  const groups          = getGroups(date)
  const todayHasSlots   = istNow().min + LEAD_TIME_MIN < 20 * 60
  const earliest        = earliestAvailable()
  const days            = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() + i + (todayHasSlots ? 0 : 1)); return d
  })
  const effectiveAddress = isEmergency ? emergencyAddr.trim() : address

  function scrollTop() { bodyRef.current?.scrollTo({ top: 0, behavior: 'smooth' }) }

  function goBack() {
    setErr('')
    if (step === 'done') { navigate('/dashboard/bookings', { replace: true }); return }
    if (isEmergency) { navigate('/dashboard/book'); return }
    if (step > 1) {
      setStep(s => (typeof s === 'number' ? s - 1 : 4) as WizardStep)
      scrollTop()
    } else {
      navigate('/dashboard/book')
    }
  }

  function goNext() {
    setErr('')
    if (step === 1) {
      if (!date) { setErr('Select a day first.'); return }
      if (!slot) { setErr('Select a time slot.'); return }
      setStep(2); scrollTop()
    } else if (step === 2) {
      if (!recipientName.trim()) { setErr('Enter the name of the person we\'re visiting.'); return }
      if (!relationship) { setErr('Select your relationship to them.'); return }
      setStep(3); scrollTop()
    } else if (step === 3) {
      if (!address.trim()) { setErr('Enter a visiting address.'); return }
      setStep(4); scrollTop()
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
        service_id:         service.id,
        service_name:       service.name,
        amount_paise:       service.paise,
        scheduled_at_ist,
        recipient_name:     recipientName,
        relationship,
        recipient_address:  effectiveAddress,
        requester_whatsapp: effectiveWa,
        notes:              notes.trim() || null,
        is_emergency:       isEmergency,
      },
    })

    setSubmitting(false)
    if (error || !(result as { ok?: boolean })?.ok) {
      console.error('[BookService] submit failed:', error, result)
      const msg = !navigator.onLine
        ? 'No internet connection. Please check your connection and try again.'
        : "Couldn't send your request. Please try again."
      setErr(msg)
      return
    }

    const rid = (result as { request_id?: string })?.request_id ?? null
    setRequestId(rid)
    setStep('done')
    scrollTop()
  }

  // ── CTA disabled logic ────────────────────────────────────────────────────
  const ctaDisabled =
    isEmergency ? (submitting || !emergencyAddr.trim()) :
    step === 1  ? (!date || !slot) :
    step === 2  ? (!recipientName.trim() || !relationship) :
    step === 3  ? !address.trim() :
    step === 4  ? submitting :
    false

  const headerSubtitle =
    isEmergency ? 'Emergency request' :
    step === 1  ? 'Schedule your visit' :
    step === 2  ? 'Who are we visiting?' :
    step === 3  ? 'Where are we going?' :
    step === 4  ? 'Review & confirm' :
    'Booking confirmed'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#fff' }}>

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-[#F0EBE1] shrink-0">
        {step !== 'done' && (
          <button onClick={goBack} aria-label="Go back"
            className="w-11 h-11 rounded-full bg-[#F5F0E8] flex items-center justify-center shrink-0 min-w-[44px]">
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

      {/* ── Stepper ───────────────────────────────────────────────────────── */}
      {!isEmergency && step !== 'done' && <Stepper step={step as 1 | 2 | 3 | 4} />}

      {/* ── Scrollable body ───────────────────────────────────────────────── */}
      <div ref={bodyRef} style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' as React.CSSProperties['WebkitOverflowScrolling'] }}>
        <div className="px-4 pt-5 pb-4">

          {/* ════════ SUCCESS ════════ */}
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
              {earliest && (
                <div className="flex items-center gap-2 bg-green-50 border border-green-100 rounded-[14px] px-4 py-3">
                  <CheckCircle2 size={14} className="text-green-700 shrink-0" />
                  <p className="text-[12.5px] text-green-700 font-medium">Earliest available: <strong>{earliest}</strong></p>
                </div>
              )}

              {/* Date strip */}
              <div>
                <SectionLabel>Select a date</SectionLabel>
                <div className="flex gap-2.5 overflow-x-auto pb-2 snap-x snap-mandatory" style={{ scrollbarWidth: 'none' }}>
                  {days.map((d, i) => {
                    const sel = date?.toDateString() === d.toDateString()
                    const dayLabel = i === 0 && todayHasSlots ? 'Today' : i === (todayHasSlots ? 1 : 0) ? 'Tomorrow' : d.toLocaleDateString('en-IN', { weekday: 'short' })
                    return (
                      <button key={d.toISOString()} onClick={() => { setDate(d); setSlot(''); setErr('') }}
                        aria-label={d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
                        aria-pressed={sel}
                        className={`shrink-0 min-w-[64px] rounded-[16px] py-3 px-2 text-center border-2 transition-all duration-200 snap-start ${
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

          {/* ════════ STEP 2: PARENT ════════ */}
          {!isEmergency && step === 2 && (
            <ParentStep
              isNri={isNri}
              lovedOnes={lovedOnes}
              selectedLO={selectedLO}
              onSelectLO={lo => { setSelectedLO(lo); setRecipientName(lo.full_name) }}
              recipientName={recipientName}
              onRecipientNameChange={setRecipientName}
              relationship={relationship}
              onRelationshipChange={setRelationship}
              showWhatsapp={showWhatsapp}
              whatsapp={whatsapp}
              setWhatsapp={setWhatsapp}
              setErr={setErr}
            />
          )}

          {/* ════════ STEP 3: WHERE ════════ */}
          {!isEmergency && step === 3 && (
            <AddressStep
              isNri={isNri}
              selectedLO={selectedLO}
              societyAddr={societyAddr}
              notes={notes}
              setNotes={setNotes}
              onAddressReady={addr => { setAddress(addr); setErr('') }}
              setErr={setErr}
              currentAddress={address}
            />
          )}

          {/* ════════ STEP 4: REVIEW ════════ */}
          {!isEmergency && step === 4 && (
            <ReviewStep
              service={service}
              date={date}
              slot={slot}
              address={effectiveAddress}
              notes={notes}
              recipientName={recipientName}
              relationship={relationship}
            />
          )}

        </div>
      </div>

      {/* ── Fixed CTA footer ──────────────────────────────────────────────── */}
      {step !== 'done' && (
        <div
          className="shrink-0 bg-white border-t border-[#F0EBE1] px-4 pt-3"
          style={{ paddingBottom: 'calc(12px + env(safe-area-inset-bottom))' }}
        >
          {err && <p className="text-[12.5px] text-red-600 text-center mb-2.5 font-medium">{err}</p>}

          {isEmergency ? (
            <>
              <CtaButton onClick={submit} disabled={ctaDisabled} loading={submitting} loadingLabel="Alerting team…" variant="emergency">
                Request emergency visit →
              </CtaButton>
              <p className="text-[11px] text-[#6E6E73] text-center mt-2">
                Our team is alerted immediately — a companion will contact you within 30 minutes.
              </p>
            </>
          ) : step < 4 ? (
            <CtaButton onClick={goNext} disabled={ctaDisabled}>
              Continue →
            </CtaButton>
          ) : (
            <>
              <CtaButton onClick={submit} disabled={ctaDisabled} loading={submitting} loadingLabel="Sending…">
                Confirm Booking →
              </CtaButton>
              <p className="text-[11px] text-[#6E6E73] text-center mt-2">
                No payment today — we'll confirm your companion first.
              </p>
            </>
          )}
        </div>
      )}

    </div>
  )
}

// ─── ParentStep ───────────────────────────────────────────────────────────────

function ParentStep({
  isNri, lovedOnes, selectedLO, onSelectLO,
  recipientName, onRecipientNameChange,
  relationship, onRelationshipChange,
  showWhatsapp, whatsapp, setWhatsapp,
  setErr,
}: {
  isNri: boolean
  lovedOnes: LovedOneWithAddr[]
  selectedLO: LovedOneWithAddr | null
  onSelectLO: (lo: LovedOneWithAddr) => void
  recipientName: string
  onRecipientNameChange: (n: string) => void
  relationship: string
  onRelationshipChange: (r: string) => void
  showWhatsapp: boolean
  whatsapp: string
  setWhatsapp: (v: string) => void
  setErr: (v: string) => void
}) {
  return (
    <div className="flex flex-col gap-5">

      {/* Loved one picker (NRI only, more than one) */}
      {isNri && lovedOnes.length > 1 && (
        <div>
          <SectionLabel>Who are we visiting?</SectionLabel>
          <div className="bg-[#FAF7F2] rounded-[18px] overflow-hidden mt-2">
            {lovedOnes.map((lo, i) => (
              <div key={lo.id}>
                {i > 0 && <div className="h-px bg-[#EDE8E0] mx-4" />}
                <button
                  onClick={() => { onSelectLO(lo); setErr('') }}
                  className={`w-full flex items-center gap-3 px-4 py-4 text-left min-h-[64px] transition-colors ${selectedLO?.id === lo.id ? 'bg-[#F0F7F2]' : ''}`}
                >
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-[13px] font-bold transition-colors ${selectedLO?.id === lo.id ? 'bg-[#0E2A1F] text-[#A8D5B5]' : 'bg-[#E8EDE8] text-[#0E2A1F]'}`}>
                    {lo.full_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-bold text-[#1D1D1F] truncate">{lo.full_name}</p>
                    <p className="text-[11.5px] text-[#6E6E73] mt-0.5 truncate">{lo.savedAddress || 'No saved address'}</p>
                  </div>
                  {selectedLO?.id === lo.id && <Check size={15} color="#0E2A1F" className="shrink-0" />}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Name */}
      <div>
        <SectionLabel>Parent's name</SectionLabel>
        <div className="bg-[#FAF7F2] rounded-[14px] px-4 py-3.5 mt-2 flex items-center gap-3">
          <User size={16} color="#6E6E73" className="shrink-0" />
          <input
            value={recipientName}
            onChange={e => { onRecipientNameChange(e.target.value); setErr('') }}
            placeholder="e.g. Sunita Sharma"
            className="flex-1 bg-transparent border-none outline-none text-[14.5px] text-[#1D1D1F]"
          />
        </div>
      </div>

      {/* Relationship */}
      <div>
        <SectionLabel>Your relationship</SectionLabel>
        <div className="flex flex-wrap gap-2 mt-2">
          {RELATIONSHIPS.map(r => (
            <button
              key={r}
              onClick={() => { onRelationshipChange(r); setErr('') }}
              aria-pressed={relationship === r}
              className={`px-4 py-2.5 rounded-[12px] text-[13px] font-semibold border-2 min-h-[44px] transition-all duration-200 ${
                relationship === r
                  ? 'bg-[#0E2A1F] border-[#0E2A1F] text-white'
                  : 'bg-[#FAF7F2] border-transparent text-[#3A3A3C]'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* WhatsApp */}
      {showWhatsapp && (
        <div className="bg-amber-50 border-2 border-amber-200 rounded-[16px] px-4 py-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={14} className="text-amber-600 shrink-0" />
            <p className="text-[13px] font-bold text-amber-800">Add WhatsApp to receive your visit report</p>
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

// ─── AddressStep ──────────────────────────────────────────────────────────────

function AddressStep({
  isNri,
  selectedLO, societyAddr,
  notes, setNotes,
  onAddressReady, setErr,
  currentAddress,
}: {
  isNri: boolean
  selectedLO: LovedOneWithAddr | null
  societyAddr: string
  notes: string
  setNotes: (v: string) => void
  onAddressReady: (addr: string) => void
  setErr: (v: string) => void
  currentAddress?: string
}) {
  const savedAddress = isNri ? (selectedLO?.savedAddress ?? null) : societyAddr || null

  // Prefer currentAddress (persisted in parent from back-navigation) so going
  // back from Review → Where doesn't wipe what the user already confirmed.
  const initialAddr = currentAddress || savedAddress || ''
  const [confirmedAddr, setConfirmedAddr] = useState(initialAddr)
  const [showNewForm, setShowNewForm]     = useState(!initialAddr)
  const [house, setHouse]           = useState('')
  const [manualArea, setManualArea] = useState('')
  const [manualCity, setManualCity] = useState('')
  const [manualPin, setManualPin]   = useState('')
  const [savingAddr, setSavingAddr] = useState(false)

  function pickSaved() {
    if (!savedAddress) return
    setConfirmedAddr(savedAddress)
    onAddressReady(savedAddress)
    setShowNewForm(false)
    setErr('')
  }

  function buildNewAddress(): string {
    return [house.trim(), manualArea.trim(), manualCity.trim(), manualPin.trim()]
      .filter(Boolean).join(', ')
  }

  async function confirmNewAddress() {
    if (!house.trim()) { setErr('Enter your flat or house number.'); return }
    if (!manualArea.trim()) { setErr('Enter the area or locality.'); return }
    const addr = buildNewAddress()
    if (isNri && selectedLO?.id) {
      setSavingAddr(true)
      await supabase.from('elder_profiles')
        .upsert({ loved_one_id: selectedLO.id, address: addr }, { onConflict: 'loved_one_id' })
      setSavingAddr(false)
    }
    setConfirmedAddr(addr)
    onAddressReady(addr)
    setShowNewForm(false)
    setErr('')
  }

  const canConfirmNew = house.trim().length > 0 && manualArea.trim().length > 0

  return (
    <div className="flex flex-col gap-4">

      {/* Saved address card */}
      {savedAddress && !showNewForm && (
        <button
          onClick={pickSaved}
          className={`w-full flex items-start gap-3 rounded-[18px] px-4 py-4 text-left min-h-[64px] border-2 transition-all duration-200 ${
            confirmedAddr === savedAddress ? 'border-[#0E2A1F] bg-[#F0F7F2]' : 'border-[#EDE8E0] bg-[#FAF7F2]'
          }`}
        >
          <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${confirmedAddr === savedAddress ? 'bg-[#0E2A1F]' : 'bg-[#EDE8E0]'}`}>
            {confirmedAddr === savedAddress
              ? <Check size={14} color="#fff" strokeWidth={3} />
              : <MapPin size={14} color="#6E6E73" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-[11.5px] font-bold mb-0.5 uppercase tracking-[0.06em] ${confirmedAddr === savedAddress ? 'text-[#0E2A1F]' : 'text-[#6E6E73]'}`}>
              Saved address
            </p>
            <p className="text-[13.5px] text-[#1D1D1F] leading-relaxed">{savedAddress}</p>
          </div>
        </button>
      )}

      {/* Enter / different address button */}
      {!showNewForm && (
        <button
          onClick={() => { setShowNewForm(true); setHouse(''); setManualArea(''); setManualCity(''); setManualPin(''); setErr('') }}
          className="flex items-center gap-3 text-[13.5px] font-semibold text-[#0E2A1F] rounded-[18px] px-4 py-4 min-h-[56px] border-2 border-dashed border-[#A8D5B5] w-full transition-all"
        >
          <div className="w-8 h-8 rounded-full border-2 border-[#0E2A1F] flex items-center justify-center text-[18px] font-bold leading-none shrink-0">+</div>
          {savedAddress ? 'Visit a different location' : 'Enter address'}
        </button>
      )}

      {/* New address form */}
      {showNewForm && (
        <div className="flex flex-col gap-3">
          {savedAddress && (
            <button
              onClick={() => { setShowNewForm(false); setErr('') }}
              className="flex items-center gap-1.5 text-[13px] text-[#6E6E73] font-semibold mb-1 min-h-[44px]"
            >
              <ArrowLeft size={13} /> Back
            </button>
          )}

          {/* Flat / House */}
          <div className="bg-[#FAF7F2] rounded-[14px] px-4 py-3">
            <label className="block text-[10.5px] font-bold uppercase tracking-[0.08em] text-[#6E6E73] mb-1.5">Flat / House No. *</label>
            <input
              value={house}
              onChange={e => { setHouse(e.target.value); setErr('') }}
              placeholder="e.g. Flat 4B, Sunrise Apartments"
              autoFocus
              className="w-full bg-transparent border-none outline-none text-[14.5px] text-[#1D1D1F]"
            />
          </div>

          {/* Area / Locality */}
          <div className="bg-[#FAF7F2] rounded-[14px] px-4 py-3">
            <label className="block text-[10.5px] font-bold uppercase tracking-[0.08em] text-[#6E6E73] mb-1.5">Area / Locality *</label>
            <input value={manualArea} onChange={e => { setManualArea(e.target.value); setErr('') }} placeholder="e.g. Jubilee Hills" className="w-full bg-transparent border-none outline-none text-[14.5px] text-[#1D1D1F]" />
          </div>

          {/* City + PIN */}
          <div className="flex gap-3">
            <div className="bg-[#FAF7F2] rounded-[14px] px-4 py-3 flex-1">
              <label className="block text-[10.5px] font-bold uppercase tracking-[0.08em] text-[#6E6E73] mb-1.5">City</label>
              <input value={manualCity} onChange={e => setManualCity(e.target.value)} placeholder="Hyderabad" className="w-full bg-transparent border-none outline-none text-[14.5px] text-[#1D1D1F]" />
            </div>
            <div className="bg-[#FAF7F2] rounded-[14px] px-4 py-3 w-[120px] shrink-0">
              <label className="block text-[10.5px] font-bold uppercase tracking-[0.08em] text-[#6E6E73] mb-1.5">PIN</label>
              <input value={manualPin} onChange={e => setManualPin(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="500034" type="tel" inputMode="numeric" className="w-full bg-transparent border-none outline-none text-[14.5px] text-[#1D1D1F]" />
            </div>
          </div>

          <button
            onClick={confirmNewAddress}
            disabled={!canConfirmNew || savingAddr}
            className={`w-full flex items-center justify-center gap-2 bg-[#0E2A1F] text-white text-[15px] font-bold rounded-[16px] py-3.5 min-h-[52px] mt-1 transition-opacity ${canConfirmNew && !savingAddr ? 'opacity-100' : 'opacity-40'}`}
          >
            {savingAddr ? <><Loader2 size={15} className="ce-spin" /> Saving…</> : 'Use this address →'}
          </button>
        </div>
      )}

      {/* Notes */}
      {!showNewForm && (
        <FieldBlock label="Special instructions (optional)">
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Gate code, lift, medicines to remind, anything the companion should know…"
            rows={3}
            className="w-full bg-transparent border-none outline-none text-[14.5px] resize-none leading-relaxed"
          />
        </FieldBlock>
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

function ReviewStep({ service, date, slot, address, notes, recipientName, relationship }: {
  service: Service; date: Date | null; slot: string
  address: string; notes: string; recipientName: string; relationship: string
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

        {/* Parent row */}
        {recipientName && (
          <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[#EDE8E0]">
            <User size={15} className="text-[#0E2A1F] shrink-0" />
            <div className="flex-1">
              <p className="text-[12px] text-[#6E6E73] font-medium">Visiting</p>
              <p className="text-[13.5px] font-semibold text-[#1D1D1F] mt-0.5">
                {recipientName}{relationship ? <span className="text-[#6E6E73] font-normal"> · {relationship}</span> : null}
              </p>
            </div>
          </div>
        )}

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

      {/* No payment today */}
      <div className="flex items-start gap-3 bg-green-50 border border-green-100 rounded-[16px] px-4 py-4">
        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center shrink-0 mt-0.5">
          <CheckCircle2 size={16} className="text-green-700" />
        </div>
        <div>
          <p className="text-[13px] font-bold text-green-800">No payment today</p>
          <p className="text-[12px] text-green-700 mt-1 leading-relaxed">
            We first confirm companion availability. You'll receive a secure WhatsApp payment link after confirmation.
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
      <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center mb-5">
        <CheckCircle2 size={40} className="text-green-600" />
      </div>
      <h2 className="text-[24px] font-bold text-[#1D1D1F] mb-2" style={{ letterSpacing: '-0.02em' }}>
        {isEmergency ? 'Emergency Requested' : 'Your visit is on its way'}
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

      <div className="w-full bg-[#FAF7F2] rounded-[20px] px-5 py-5 mb-5 text-left">
        <p className="text-[11.5px] font-bold uppercase tracking-[0.1em] text-[#6E6E73] mb-4">What happens next</p>
        {(isEmergency
          ? ['Companion dispatching now', 'WhatsApp update within 30 min', 'We stay connected throughout']
          : ['Finding your companion now', 'WhatsApp confirmation sent', 'Secure payment link via WhatsApp']
        ).map((s, i) => (
          <div key={s} className={`flex items-start gap-3 ${i > 0 ? 'mt-3.5' : ''}`}>
            <div className="w-6 h-6 rounded-full bg-[#0E2A1F] flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-[10px] font-bold text-white">{i + 1}</span>
            </div>
            <p className="text-[13.5px] text-[#3A3A3C] leading-relaxed">{s}</p>
          </div>
        ))}
      </div>

      {!isEmergency && (
        <div className="w-full flex items-center gap-3 rounded-[14px] px-4 py-3 mb-6" style={{ background: 'rgba(14,42,31,0.05)', border: '1px solid rgba(14,42,31,0.1)' }}>
          <Clock size={14} style={{ color: 'var(--forest)', flexShrink: 0 }} />
          <p className="text-[12.5px]" style={{ color: 'var(--forest)' }}>Estimated confirmation: <strong>30–60 minutes</strong></p>
        </div>
      )}

      <button onClick={onViewBooking} className="w-full bg-[#0E2A1F] text-white text-[15px] font-bold rounded-[16px] py-4 min-h-[52px] mb-3">
        View My Booking
      </button>
      <button onClick={onHome} className="w-full bg-[#F5F0E8] text-[#0E2A1F] text-[14px] font-semibold rounded-[16px] py-3.5 min-h-[48px]">
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
      {loading ? <><Loader2 size={17} className="ce-spin" />{loadingLabel ?? 'Please wait…'}</> : children}
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
