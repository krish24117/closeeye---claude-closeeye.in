import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Loader2, ArrowLeft, ArrowRight, MapPin, Clock, Check, AlertTriangle, CheckCircle2, Calendar } from 'lucide-react'
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

// ─── Google Places ────────────────────────────────────────────────────────────

declare global {
  interface Window {
    google?: {
      maps?: {
        places?: {
          Autocomplete: new (
            el: HTMLInputElement,
            opts?: { componentRestrictions?: { country: string }; fields?: string[] }
          ) => {
            getPlace(): { address_components?: Array<{ long_name: string; types: string[] }>; geometry?: { location?: { lat(): number; lng(): number } } }
            addListener(ev: string, fn: () => void): void
          }
        }
        event?: { clearInstanceListeners(inst: object): void }
      }
    }
  }
}

function loadGoogleMaps(apiKey: string): Promise<void> {
  return new Promise(resolve => {
    if (window.google?.maps?.places) { resolve(); return }
    const s = document.createElement('script')
    s.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`
    s.async = true
    s.onload = () => resolve()
    document.head.appendChild(s)
  })
}

interface LovedOneWithAddr { id: string; full_name: string; savedAddress: string | null }
type AddrView = 'recipient' | 'saved' | 'new'

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

  // ── Wizard state ───────────────────────────────────────────────────────────
  const [step, setStep] = useState<WizardStep>(isEmergency ? 2 : 1)
  const [date, setDate] = useState<Date | null>(null)
  const [slot, setSlot] = useState('')

  const [address, setAddress] = useState('')
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
      setRecipientName(profile?.full_name || '')
    } else {
      supabase.from('society_members').select('name').eq('user_id', user.id).maybeSingle()
        .then(({ data }) => setRecipientName(data?.name || profile?.full_name || ''))
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
  const effectiveAddress = isEmergency ? emergencyAddr.trim() : address

  function scrollTop() { bodyRef.current?.scrollTo({ top: 0, behavior: 'smooth' }) }

  function goBack() {
    setErr('')
    if (step === 'done') { navigate('/dashboard/bookings', { replace: true }); return }
    if (!isEmergency && step > 1) {
      if (step === 3) setAddress('')
      setStep(s => (typeof s === 'number' ? s - 1 : 3) as WizardStep)
      scrollTop()
    } else navigate('/dashboard/book')
  }

  function goNext() {
    setErr('')
    if (step === 1) {
      if (!date) { setErr('Select a day first.'); return }
      if (!slot) { setErr('Select a time slot.'); return }
      setAddress('')
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
              isNri={isNri}
              userId={user!.id}
              notes={notes}
              setNotes={setNotes}
              showWhatsapp={showWhatsapp}
              whatsapp={whatsapp}
              setWhatsapp={setWhatsapp}
              onAddressReady={addr => { setAddress(addr); setErr('') }}
              onRecipientNameChange={name => setRecipientName(name)}
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

const GMAPS_KEY = (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY as string | undefined

function AddressStep({
  isNri, userId,
  notes, setNotes,
  showWhatsapp, whatsapp, setWhatsapp,
  onAddressReady, onRecipientNameChange,
  setErr,
}: {
  isNri: boolean
  userId: string
  notes: string
  setNotes: (v: string) => void
  showWhatsapp: boolean
  whatsapp: string
  setWhatsapp: (v: string) => void
  onAddressReady: (addr: string) => void
  onRecipientNameChange: (name: string) => void
  setErr: (v: string) => void
}) {
  const [view, setView] = useState<AddrView>(isNri ? 'recipient' : 'saved')
  const [lovedOnes, setLovedOnes] = useState<LovedOneWithAddr[]>([])
  const [selectedLO, setSelectedLO] = useState<LovedOneWithAddr | null>(null)
  const [societyAddr, setSocietyAddr] = useState('')
  const [confirmedAddr, setConfirmedAddr] = useState('')
  const [loadingLOs, setLoadingLOs] = useState(isNri)

  // New address form state
  const [house, setHouse] = useState('')
  const [landmark, setLandmark] = useState('')
  const [area, setArea] = useState('')
  const [city, setCity] = useState('')
  const [addrState, setAddrState] = useState('')
  const [pincode, setPincode] = useState('')
  const [saveForNext, setSaveForNext] = useState(true)
  const [savingAddr, setSavingAddr] = useState(false)

  const searchRef = useRef<HTMLInputElement>(null)
  const acRef = useRef<any>(null)

  // Load loved ones or society address
  useEffect(() => {
    if (!userId) return
    if (isNri) {
      setLoadingLOs(true)
      supabase
        .from('loved_ones')
        .select('id, full_name, elder_profiles(address)')
        .eq('family_user_id', userId)
        .order('created_at')
        .then(({ data }) => {
          const los: LovedOneWithAddr[] = (data || []).map((lo: any) => ({
            id: lo.id,
            full_name: lo.full_name,
            savedAddress: (lo.elder_profiles as any[])?.[0]?.address || null,
          }))
          setLovedOnes(los)
          setLoadingLOs(false)
          if (los.length === 1) {
            setSelectedLO(los[0])
            onRecipientNameChange(los[0].full_name)
            setView('saved')
          }
        })
    } else {
      supabase.from('society_members').select('name, flat_number, area, society_name')
        .eq('user_id', userId).maybeSingle()
        .then(({ data }) => {
          const addr = [data?.flat_number, data?.society_name, data?.area].filter(Boolean).join(', ')
          setSocietyAddr(addr)
          if (data?.name) onRecipientNameChange(data.name)
        })
    }
  }, [userId, isNri]) // eslint-disable-line react-hooks/exhaustive-deps

  // Mount Google Autocomplete when in 'new' view
  useEffect(() => {
    if (view !== 'new' || !GMAPS_KEY) return
    let mounted = true
    loadGoogleMaps(GMAPS_KEY).then(() => {
      if (!mounted || !searchRef.current || acRef.current) return
      acRef.current = new window.google!.maps!.places!.Autocomplete(
        searchRef.current,
        { componentRestrictions: { country: 'in' }, fields: ['address_components', 'geometry'] }
      )
      acRef.current.addListener('place_changed', () => {
        const place = acRef.current!.getPlace()
        const get = (t: string) => place.address_components?.find((c: any) => c.types.includes(t))?.long_name || ''
        setArea(get('sublocality_level_1') || get('sublocality') || get('neighborhood'))
        setCity(get('locality') || get('administrative_area_level_2'))
        setAddrState(get('administrative_area_level_1'))
        setPincode(get('postal_code'))
        setErr('')
      })
    })
    return () => {
      mounted = false
      if (acRef.current) {
        window.google?.maps?.event?.clearInstanceListeners(acRef.current)
        acRef.current = null
      }
    }
  }, [view]) // eslint-disable-line react-hooks/exhaustive-deps

  function pickSavedAddress(addr: string) {
    setConfirmedAddr(addr)
    onAddressReady(addr)
    setErr('')
  }

  async function confirmNewAddress() {
    const h = house.trim()
    if (!h) { setErr('Enter the flat / house number.'); return }
    if (!city) { setErr('Search and select an address first.'); return }
    if (!pincode) { setErr('PIN code is missing — choose from search results.'); return }
    const addr = [h, area, landmark.trim(), city, addrState, pincode].filter(Boolean).join(', ')
    if (saveForNext) {
      setSavingAddr(true)
      if (isNri && selectedLO?.id) {
        await supabase.from('elder_profiles')
          .upsert({ loved_one_id: selectedLO.id, address: addr }, { onConflict: 'loved_one_id' })
        setSelectedLO(lo => lo ? { ...lo, savedAddress: addr } : lo)
      }
      setSavingAddr(false)
    }
    setConfirmedAddr(addr)
    onAddressReady(addr)
    setErr('')
    setView('saved')
  }

  const canConfirmNew = house.trim().length > 0 && city.length > 0 && pincode.length > 0
  const currentSavedAddr = isNri ? selectedLO?.savedAddress : societyAddr

  // ── VIEW: Who are we visiting? ─────────────────────────────────────────────
  if (view === 'recipient') {
    return (
      <div className="flex flex-col gap-3">
        <SectionLabel>Who are we visiting?</SectionLabel>
        {loadingLOs ? (
          <div className="flex justify-center py-10">
            <Loader2 size={22} className="ce-spin text-[#AEAEAE]" />
          </div>
        ) : lovedOnes.length === 0 ? (
          <div className="bg-amber-50 border border-amber-200 rounded-[18px] px-4 py-5">
            <p className="text-[14px] font-bold text-amber-800 mb-1">No care recipients added yet</p>
            <p className="text-[13px] text-amber-700 leading-relaxed mb-3">Add your loved one's details in your profile, then return here to book.</p>
            <a href="/dashboard/profile" className="text-[13.5px] font-bold text-[#0E2A1F] underline">Add care recipient →</a>
          </div>
        ) : (
          lovedOnes.map(lo => (
            <button
              key={lo.id}
              onClick={() => { setSelectedLO(lo); onRecipientNameChange(lo.full_name); setView('saved'); setErr('') }}
              className="w-full flex items-center gap-3 bg-[#FAF7F2] rounded-[18px] px-4 py-4 text-left min-h-[76px] border-2 border-transparent transition-all duration-150 active:border-[#A8D5B5]"
            >
              <div className="w-11 h-11 rounded-full bg-[#0E2A1F] flex items-center justify-center shrink-0 text-[17px] font-bold text-[#A8D5B5]">
                {lo.full_name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-bold text-[#1D1D1F] truncate">{lo.full_name}</p>
                <p className="text-[12px] text-[#6E6E73] mt-0.5 truncate">
                  {lo.savedAddress || 'No saved address'}
                </p>
              </div>
              <ArrowRight size={16} color="#AEAEAE" className="shrink-0" />
            </button>
          ))
        )}
      </div>
    )
  }

  // ── VIEW: Choose address ───────────────────────────────────────────────────
  if (view === 'saved') {
    const recipName = isNri ? selectedLO?.full_name : undefined
    return (
      <div className="flex flex-col gap-4">

        {/* Back + recipient name */}
        {isNri && lovedOnes.length > 1 && (
          <button
            onClick={() => { setSelectedLO(null); setConfirmedAddr(''); onAddressReady(''); setView('recipient') }}
            className="flex items-center gap-1.5 text-[13px] text-[#6E6E73] font-semibold -mb-1 min-h-[36px]"
          >
            <ArrowLeft size={13} /> Choose recipient
          </button>
        )}
        {recipName && (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#0E2A1F] flex items-center justify-center text-[12px] font-bold text-[#A8D5B5] shrink-0">
              {recipName.charAt(0).toUpperCase()}
            </div>
            <p className="text-[14.5px] font-bold text-[#1D1D1F]">Visiting {recipName}</p>
          </div>
        )}

        <SectionLabel>Choose address</SectionLabel>

        {/* Saved address */}
        {currentSavedAddr ? (
          <button
            onClick={() => pickSavedAddress(currentSavedAddr)}
            className={`w-full flex items-start gap-3 rounded-[18px] px-4 py-4 text-left min-h-[64px] border-2 transition-all duration-200 ${
              confirmedAddr === currentSavedAddr ? 'border-[#0E2A1F] bg-[#F0F7F2]' : 'border-[#EDE8E0] bg-[#FAF7F2]'
            }`}
          >
            <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${confirmedAddr === currentSavedAddr ? 'bg-[#0E2A1F]' : 'bg-[#EDE8E0]'}`}>
              {confirmedAddr === currentSavedAddr
                ? <Check size={14} color="#fff" strokeWidth={3} />
                : <MapPin size={14} color="#6E6E73" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-[11.5px] font-bold mb-0.5 uppercase tracking-[0.06em] ${confirmedAddr === currentSavedAddr ? 'text-[#0E2A1F]' : 'text-[#6E6E73]'}`}>
                Saved address
              </p>
              <p className="text-[13.5px] text-[#1D1D1F] leading-relaxed">{currentSavedAddr}</p>
            </div>
          </button>
        ) : null}

        {/* Visit different location */}
        <button
          onClick={() => { setHouse(''); setLandmark(''); setArea(''); setCity(''); setAddrState(''); setPincode(''); setView('new'); setErr('') }}
          className="flex items-center gap-3 text-[13.5px] font-semibold text-[#0E2A1F] rounded-[18px] px-4 py-4 min-h-[56px] border-2 border-dashed border-[#A8D5B5] w-full transition-all"
        >
          <div className="w-8 h-8 rounded-full border-2 border-[#0E2A1F] flex items-center justify-center text-[18px] font-bold leading-none shrink-0">
            +
          </div>
          {currentSavedAddr ? 'Visit a different location' : 'Add address'}
        </button>

        {/* Notes */}
        <FieldBlock label="Special instructions (optional)">
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Gate code, lift, medicines to remind, anything the companion should know…"
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

  // ── VIEW: Add new address ──────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4">
      <button
        onClick={() => { setView('saved'); setErr('') }}
        className="flex items-center gap-1.5 text-[13px] text-[#6E6E73] font-semibold -mb-1 min-h-[36px]"
      >
        <ArrowLeft size={13} /> Back
      </button>

      <SectionLabel>New address</SectionLabel>

      {/* Search field */}
      <div className="bg-[#FAF7F2] rounded-[16px] px-4 py-3.5 flex items-center gap-3 border-2 border-transparent focus-within:border-[#A8D5B5] transition-all">
        <MapPin size={16} color="#6E6E73" className="shrink-0" />
        <input
          ref={searchRef}
          type="text"
          placeholder="Search address…"
          className="flex-1 bg-transparent border-none outline-none text-[14.5px] text-[#1D1D1F] placeholder:text-[#AEAEAE]"
          autoFocus
          autoComplete="off"
        />
      </div>
      {!GMAPS_KEY && (
        <p className="text-[11.5px] text-amber-600 -mt-2 px-1">Set VITE_GOOGLE_MAPS_API_KEY to enable address search.</p>
      )}

      {/* Auto-populated confirmation */}
      {city && (
        <div className="bg-green-50 border border-green-200 rounded-[14px] px-4 py-3 flex items-start gap-2">
          <Check size={13} className="text-green-700 shrink-0 mt-0.5" strokeWidth={3} />
          <p className="text-[12.5px] text-green-700 leading-relaxed">
            <strong>{city}</strong>{addrState ? `, ${addrState}` : ''}{pincode ? ` — ${pincode}` : ''}{area ? ` · ${area}` : ''}
          </p>
        </div>
      )}

      {/* House / Flat — required */}
      <div className="bg-[#FAF7F2] rounded-[14px] px-4 py-3">
        <label className="block text-[10.5px] font-bold uppercase tracking-[0.08em] text-[#6E6E73] mb-1.5">House / Flat No. *</label>
        <input
          value={house}
          onChange={e => { setHouse(e.target.value); setErr('') }}
          placeholder="e.g. Flat 4B, Sunrise Apartments"
          className="w-full bg-transparent border-none outline-none text-[14.5px] text-[#1D1D1F]"
        />
      </div>

      {/* Landmark — optional */}
      <div className="bg-[#FAF7F2] rounded-[14px] px-4 py-3">
        <label className="block text-[10.5px] font-bold uppercase tracking-[0.08em] text-[#6E6E73] mb-1.5">Landmark (optional)</label>
        <input
          value={landmark}
          onChange={e => setLandmark(e.target.value)}
          placeholder="e.g. Near Apollo Hospital"
          className="w-full bg-transparent border-none outline-none text-[14.5px] text-[#1D1D1F]"
        />
      </div>

      {/* Save toggle */}
      <button
        onClick={() => setSaveForNext(v => !v)}
        className="flex items-center gap-3 text-left py-1"
      >
        <div className={`w-5 h-5 rounded-[5px] border-2 flex items-center justify-center shrink-0 transition-all ${saveForNext ? 'bg-[#0E2A1F] border-[#0E2A1F]' : 'border-[#CCC]'}`}>
          {saveForNext && <Check size={11} color="#fff" strokeWidth={3} />}
        </div>
        <span className="text-[13px] text-[#3A3A3C]">Save address for next time</span>
      </button>

      {/* Confirm button */}
      <button
        onClick={confirmNewAddress}
        disabled={!canConfirmNew || savingAddr}
        className={`w-full flex items-center justify-center gap-2 bg-[#0E2A1F] text-white text-[15px] font-bold rounded-[16px] py-3.5 min-h-[52px] mt-1 transition-opacity ${canConfirmNew && !savingAddr ? 'opacity-100' : 'opacity-40'}`}
      >
        {savingAddr ? <><Loader2 size={15} className="ce-spin" /> Saving…</> : 'Use this address →'}
      </button>
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
