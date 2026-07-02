import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Heart, Building2, Zap, ShoppingBag, Wrench, AlertTriangle, CheckCircle, Loader2, ShieldCheck, Plus, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { ON_DEMAND_SERVICES } from '@/lib/one-time-services'
import { loadRazorpayScript } from '@/lib/razorpay'

const RELATIONSHIPS = ['Mother', 'Father', 'Grandmother', 'Grandfather', 'Other']

const SERVICE_ICONS: Record<string, typeof Heart> = {
  home_visit: Heart,
  hospital_assistance_half_day: Building2,
  hospital_assistance_full_day: Building2,
  emergency_support_visit: Zap,
  grocery_medicine_assistance: ShoppingBag,
  home_maintenance_coordination: Wrench,
}

const SERVICES = ON_DEMAND_SERVICES.map(s => ({
  ...s,
  icon: SERVICE_ICONS[s.type] ?? AlertTriangle,
}))

const TIME_SLOTS = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
  '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
  '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
  '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00',
]

function formatTimeLabel(t: string) {
  const [h, m] = t.split(':').map(Number)
  const ampm = h < 12 ? 'AM' : 'PM'
  const hour = h % 12 || 12
  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`
}

export function DashboardNewBooking() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const paymentSucceeded = useRef(false)

  const [lovedOnes, setLovedOnes] = useState<{ id: string; full_name: string; city: string | null }[]>([])
  const [loadingLO, setLoadingLO] = useState(true)

  const [showAddMember, setShowAddMember] = useState(false)
  const [newName, setNewName] = useState('')
  const [newCity, setNewCity] = useState('')
  const [newRelationship, setNewRelationship] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [savingMember, setSavingMember] = useState(false)
  const [addMemberError, setAddMemberError] = useState<string | null>(null)

  const preselectedService = searchParams.get('service')
  const [serviceType, setServiceType] = useState(
    preselectedService && SERVICES.some(s => s.type === preselectedService) ? preselectedService : ''
  )
  const [lovedOneId, setLovedOneId] = useState('')
  const [visitDate, setVisitDate] = useState('')
  const [visitTime, setVisitTime] = useState('')
  const [notes, setNotes] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [emergencyDone, setEmergencyDone] = useState(false)

  function istDateStr(offsetDays = 0): string {
    const d = new Date(Date.now() + (5.5 + offsetDays * 24) * 60 * 60 * 1000)
    return d.toISOString().slice(0, 10)
  }
  function istNowMin(): number {
    const d = new Date(Date.now() + 5.5 * 60 * 60 * 1000)
    return d.getUTCHours() * 60 + d.getUTCMinutes()
  }
  const BUFFER_MIN = 180 // 3-hour minimum booking notice
  const todayStr   = istDateStr()
  // If past 17:00 IST (last slot 20:00 minus 3h buffer), no slots remain today — require tomorrow
  const minDateStr = istNowMin() + BUFFER_MIN >= 20 * 60 ? istDateStr(1) : todayStr
  function availableSlots(dateStr: string): string[] {
    if (dateStr !== todayStr) return TIME_SLOTS
    const cutoff = istNowMin() + BUFFER_MIN
    return TIME_SLOTS.filter(t => +t.slice(0, 2) * 60 + +t.slice(3, 5) > cutoff)
  }

  useEffect(() => {
    ;(async () => {
      try {
        const { data } = await supabase.from('loved_ones').select('id,full_name,city').order('full_name')
        setLovedOnes(data || [])
        if (data && data.length === 1) setLovedOneId(data[0].id)
      } catch (err) {
        console.error('loved_ones load failed:', err)
      } finally {
        setLoadingLO(false)
      }
    })()
  }, [])

  const selectedService = SERVICES.find(s => s.type === serviceType)
  const isEmergency = serviceType === 'emergency_support_visit'

  async function handleAddMember() {
    if (!user) return
    if (!newName.trim()) { setAddMemberError('Full name is required.'); return }
    if (!newCity.trim()) { setAddMemberError('City is required.'); return }

    setSavingMember(true)
    setAddMemberError(null)
    try {
      const { data, error: insertErr } = await supabase
        .from('loved_ones')
        .insert({
          full_name: newName.trim(),
          city: newCity.trim(),
          relationship: newRelationship || null,
          phone: newPhone.trim() || null,
          address: '',
          family_user_id: user.id,
        })
        .select('id,full_name,city')
        .single()

      if (insertErr || !data) throw insertErr ?? new Error('Family member could not be created')

      setLovedOnes(prev => [...prev, data].sort((a, b) => a.full_name.localeCompare(b.full_name)))
      setLovedOneId(data.id)
      setShowAddMember(false)
      setNewName('')
      setNewCity('')
      setNewRelationship('')
      setNewPhone('')
    } catch {
      setAddMemberError('Could not add family member — please try again.')
    } finally {
      setSavingMember(false)
    }
  }

  async function handleEmergency(e: React.FormEvent) {
    e.preventDefault()
    if (!lovedOneId) { setError('Please select who this visit is for.'); return }
    if (!user) { setError('You must be signed in.'); return }
    setSubmitting(true); setError(null)
    try {
      const lovedOneName = lovedOnes.find(lo => lo.id === lovedOneId)?.full_name || ''
      const { error: fnErr } = await supabase.functions.invoke('submit-booking-request', {
        body: {
          service_id: 'emergency_support_visit',
          service_name: 'Emergency Support Visit',
          amount_paise: 300000,
          scheduled_at_ist: null,
          recipient_name: lovedOneName,
          recipient_address: '',
          requester_whatsapp: profile?.whatsapp_number || '',
          notes: notes.trim() || null,
          is_emergency: true,
        },
      })
      if (fnErr) throw fnErr
      setEmergencyDone(true)
    } catch {
      setError("Couldn't send the request. Please call +91 90002 21261 directly.")
    } finally {
      setSubmitting(false)
    }
  }

  function handleSubmit(e: React.FormEvent) {
    if (isEmergency) return handleEmergency(e)
    return handlePay(e)
  }

  async function handlePay(e: React.FormEvent) {
    e.preventDefault()
    if (!serviceType) { setError('Please select a service.'); return }
    if (!lovedOneId)  { setError('Please select who this visit is for.'); return }
    if (!visitDate)   { setError('Please pick a date.'); return }
    if (!visitTime)   { setError('Please pick a preferred time.'); return }
    if (!user)        { setError('You must be signed in.'); return }

    const scheduledAt = `${visitDate}T${visitTime}:00`

    setSubmitting(true)
    setError(null)

    try {
      const { data, error: fnErr } = await supabase.functions.invoke('razorpay-create-order', {
        body: {
          service_type: serviceType,
          loved_one_id: lovedOneId,
          scheduled_at: scheduledAt,
          amount_paise: selectedService!.paise,
          notes: notes.trim() || undefined,
        },
      })

      if (fnErr || !data?.order_id) {
        throw new Error(data?.error || 'Could not create order — please try again.')
      }

      const loaded = await loadRazorpayScript()
      if (!loaded) throw new Error('Could not load payment gateway. Please refresh and try again.')

      const rzp = new window.Razorpay({
        key: data.key_id,
        order_id: data.order_id,
        amount: data.amount,
        currency: data.currency,
        name: 'Close Eye',
        description: selectedService!.name,
        image: '/favicon.svg',
        theme: { color: '#14532d' },
        prefill: {
          name: profile?.full_name || '',
          email: user?.email || '',
          contact: profile?.whatsapp_number || '',
        },
        handler: async (response: {
          razorpay_payment_id: string
          razorpay_order_id: string
          razorpay_signature: string
        }) => {
          setSubmitting(true)
          try {
            const { data: vd, error: ve } = await supabase.functions.invoke('razorpay-verify-payment', {
              body: {
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id:   response.razorpay_order_id,
                razorpay_signature:  response.razorpay_signature,
                booking_id:          data.booking_id,
              },
            })
            if (ve || !vd?.success) {
              setError('Payment received but verification failed — contact support with payment ID: ' + response.razorpay_payment_id)
              setSubmitting(false)
            } else {
              paymentSucceeded.current = true
              navigate(`/dashboard/booking-confirmation?id=${data.booking_id}`, { replace: true })
            }
          } catch {
            setError('Payment received but verification failed — contact support with payment ID: ' + response.razorpay_payment_id)
            setSubmitting(false)
          }
        },
        modal: {
          ondismiss: () => {
            if (paymentSucceeded.current) return
            setError('Payment cancelled. Your booking has been saved — contact us on WhatsApp to complete it.')
            setSubmitting(false)
          },
        },
      })

      rzp.open()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong — please try again.')
      setSubmitting(false)
    }
  }

  return (
    <div className="animate-fade-in max-w-xl space-y-1">
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-serif text-2xl text-green-900">Book a visit</h1>
        <p className="text-gray-400 text-sm mt-1">Securely pay via UPI, card, or net banking.</p>
      </div>

      {emergencyDone ? (
        <div className="text-center py-10">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={32} className="text-green-700" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Request sent</h2>
          <p className="text-gray-500 text-sm leading-relaxed">
            Our team has been alerted. A companion will contact you within 30 minutes.
          </p>
        </div>
      ) : loadingLO ? (
        <div className="flex items-center gap-2 text-sm text-gray-400 py-8">
          <Loader2 size={16} className="animate-spin" /> Loading…
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-4 flex items-start justify-between gap-3">
              <span>{error}</span>
              <button type="button" onClick={() => setError(null)} className="text-red-400 hover:text-red-600 font-bold flex-shrink-0">✕</button>
            </div>
          )}

          {/* ── Step 1: Service ─────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">1 · Choose a service</p>
            <div className="space-y-2">
              {SERVICES.map(s => {
                const Icon = s.icon
                const selected = serviceType === s.type
                return (
                  <button
                    key={s.type}
                    type="button"
                    onClick={() => setServiceType(s.type)}
                    className={`w-full text-left flex items-start gap-3 rounded-xl border-2 px-4 py-3 transition-all ${
                      selected
                        ? 'border-green-600 bg-green-50'
                        : 'border-gray-100 hover:border-green-200 bg-gray-50/50'
                    }`}
                  >
                    <div className={`mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${selected ? 'bg-green-600 text-white' : 'bg-white text-gray-400 border border-gray-200'}`}>
                      <Icon size={15} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className={`text-sm font-semibold ${selected ? 'text-green-900' : 'text-gray-800'}`}>{s.name}</p>
                        <span className={`text-xs font-bold flex-shrink-0 ${selected ? 'text-green-700' : 'text-gray-500'}`}>{s.price}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{s.desc}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* ── Step 2: Who ──────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">2 · Who is this visit for?</p>
            <div className="space-y-2">
              {lovedOnes.map(lo => (
                <button
                  key={lo.id}
                  type="button"
                  onClick={() => setLovedOneId(lo.id)}
                  className={`w-full text-left flex items-center justify-between gap-3 rounded-xl border-2 px-4 py-3 transition-all ${
                    lovedOneId === lo.id
                      ? 'border-green-600 bg-green-50'
                      : 'border-gray-100 hover:border-green-200 bg-gray-50/50'
                  }`}
                >
                  <div>
                    <p className={`text-sm font-semibold ${lovedOneId === lo.id ? 'text-green-900' : 'text-gray-800'}`}>{lo.full_name}</p>
                    {lo.city && <p className="text-xs text-gray-400">{lo.city}</p>}
                  </div>
                  {lovedOneId === lo.id && <CheckCircle size={16} className="text-green-600 flex-shrink-0" />}
                </button>
              ))}

              {!showAddMember && (
                <button
                  type="button"
                  onClick={() => setShowAddMember(true)}
                  className="w-full flex items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-gray-200 px-4 py-3 text-sm font-medium text-gray-500 hover:border-green-300 hover:text-green-700 hover:bg-green-50/50 transition-colors"
                >
                  <Plus size={15} /> Add a new family member
                </button>
              )}

              {showAddMember && (
                <div className="rounded-xl border-2 border-green-200 bg-green-50/50 p-4 space-y-3 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-green-900">New family member</p>
                    <button
                      type="button"
                      onClick={() => { setShowAddMember(false); setAddMemberError(null) }}
                      aria-label="Cancel"
                      className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-white transition-colors"
                    >
                      <X size={15} />
                    </button>
                  </div>

                  {addMemberError && (
                    <p className="text-red-600 text-xs">{addMemberError}</p>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-500 mb-1.5 block">Full name *</label>
                      <input
                        type="text"
                        value={newName}
                        onChange={e => setNewName(e.target.value)}
                        placeholder="e.g. Sunita Reddy"
                        className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-green-600 bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1.5 block">City *</label>
                      <input
                        type="text"
                        value={newCity}
                        onChange={e => setNewCity(e.target.value)}
                        placeholder="Hyderabad"
                        className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-green-600 bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1.5 block">Relationship</label>
                      <select
                        value={newRelationship}
                        onChange={e => setNewRelationship(e.target.value)}
                        className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-green-600 bg-white"
                      >
                        <option value="">— Select —</option>
                        {RELATIONSHIPS.map(r => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1.5 block">Phone number <span className="text-gray-400">(optional)</span></label>
                      <input
                        type="tel"
                        value={newPhone}
                        onChange={e => setNewPhone(e.target.value)}
                        placeholder="+91 98765 43210"
                        className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-green-600 bg-white"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddMember}
                    disabled={savingMember}
                    className="w-full bg-green-800 hover:bg-green-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
                  >
                    {savingMember ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : 'Save & select'}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* ── Step 3: When (regular) / Get help now (emergency) ── */}
          {isEmergency ? (
            <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-5 space-y-4">
              <p className="text-xs font-semibold text-red-600 uppercase tracking-wider">3 · Get help now</p>
              <a
                href="tel:+919000221261"
                className="flex items-center justify-center gap-3 bg-red-700 hover:bg-red-600 text-white rounded-xl py-4 text-base font-bold transition-colors no-underline"
                style={{ textDecoration: 'none' }}
              >
                📞 Call +91 90002 21261
              </a>
              <p className="text-xs text-red-500 text-center">Call first if this is urgent — we dispatch immediately.</p>
              <div>
                <label className="text-xs text-gray-500 mb-1.5 block">What's happening? <span className="text-gray-400">(optional)</span></label>
                <input
                  type="text"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="e.g. Chest pain, fell at home, needs hospital…"
                  className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-red-400 bg-white"
                />
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">3 · Preferred date & time</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1.5 block">Date</label>
                  <input
                    type="date"
                    value={visitDate}
                    onChange={e => { setVisitDate(e.target.value); setVisitTime('') }}
                    min={minDateStr}
                    required
                    className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-green-600 bg-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1.5 block">Time</label>
                  <select
                    value={visitTime}
                    onChange={e => setVisitTime(e.target.value)}
                    required
                    className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-green-600 bg-white"
                  >
                    <option value="">— Pick a time —</option>
                    {availableSlots(visitDate).map(t => (
                      <option key={t} value={t}>{formatTimeLabel(t)}</option>
                    ))}
                  </select>
                </div>
              </div>
              <p className="text-xs text-gray-400">Bookings require at least 3 hours notice. Our coordinator will confirm the exact time.</p>
            </div>
          )}

          {/* ── Step 4: Notes (regular only — emergency note is in step 3) ── */}
          {!isEmergency && (
            <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">4 · Notes <span className="normal-case font-normal">(optional)</span></p>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={3}
                placeholder="Access code, gate number, medications to remind about, things the companion should know…"
                className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-green-600 resize-none"
              />
            </div>
          )}

          {/* ── Order summary + Submit ─────────────────────────── */}
          {selectedService && (
            isEmergency ? (
              <div className="bg-red-900 rounded-2xl p-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-white font-semibold text-sm">Emergency Support Visit</p>
                  <p className="text-red-300 text-xs mt-0.5">Our team is alerted immediately</p>
                </div>
                <p className="font-serif text-xl text-white flex-shrink-0">₹3,000</p>
              </div>
            ) : (
              <div className="bg-green-900 rounded-2xl p-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-white font-semibold text-sm">{selectedService.name}</p>
                  <p className="text-green-300 text-xs mt-0.5">UPI · Cards · Net Banking · Wallets</p>
                </div>
                <p className="font-serif text-xl text-white flex-shrink-0">{selectedService.price}</p>
              </div>
            )
          )}

          <button
            type="submit"
            disabled={submitting || !serviceType}
            className={`w-full disabled:opacity-50 text-white font-semibold py-3.5 rounded-xl transition-colors text-sm flex items-center justify-center gap-2 ${
              isEmergency ? 'bg-red-700 hover:bg-red-600' : 'bg-green-800 hover:bg-green-700'
            }`}
          >
            {submitting ? (
              <><Loader2 size={16} className="animate-spin" /> {isEmergency ? 'Alerting team…' : 'Processing…'}</>
            ) : isEmergency ? (
              'Request emergency visit →'
            ) : selectedService ? (
              `Pay ${selectedService.price} via Razorpay`
            ) : (
              'Select a service to continue'
            )}
          </button>

          {!isEmergency && (
            <div className="flex items-center justify-center gap-1.5 text-xs text-gray-400 pb-2">
              <ShieldCheck size={12} />
              Secured by Razorpay · Close Eye never stores your payment details
            </div>
          )}

        </form>
      )}
    </div>
  )
}
