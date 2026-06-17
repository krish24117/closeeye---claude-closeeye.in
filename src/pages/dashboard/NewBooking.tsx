import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Heart, Building2, Zap, CalendarDays, CheckCircle, Loader2, ShieldCheck } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'

const SERVICES = [
  {
    type: 'companion_visit_single',
    icon: Heart,
    name: 'Companion Visit',
    price: '₹999',
    paise: 99900,
    desc: 'Home visit with wellbeing check, photos and a full report sent to you.',
  },
  {
    type: 'hospital_companion_single',
    icon: Building2,
    name: 'Hospital Companion',
    price: '₹1,499',
    paise: 149900,
    desc: 'Companion accompanies to the appointment and keeps you updated throughout.',
  },
  {
    type: 'emergency_visit',
    icon: Zap,
    name: 'Emergency Visit',
    price: '₹1,999',
    paise: 199900,
    desc: 'Same-day priority dispatch when something feels urgent.',
  },
  {
    type: 'care_plan_4_monthly',
    icon: CalendarDays,
    name: 'Monthly Care Plan',
    price: '₹2,999/mo',
    paise: 299900,
    desc: '4 recurring visits per month with the same companion.',
  },
]

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

function loadRazorpayScript(): Promise<boolean> {
  return new Promise(resolve => {
    if (window.Razorpay) { resolve(true); return }
    const s = document.createElement('script')
    s.src = 'https://checkout.razorpay.com/v1/checkout.js'
    s.onload = () => resolve(true)
    s.onerror = () => resolve(false)
    document.head.appendChild(s)
  })
}

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open(): void }
  }
}

export function DashboardNewBooking() {
  const { user, profile } = useAuth()
  const [lovedOnes, setLovedOnes] = useState<{ id: string; full_name: string; city: string | null }[]>([])
  const [loadingLO, setLoadingLO] = useState(true)

  const [serviceType, setServiceType] = useState('')
  const [lovedOneId, setLovedOneId] = useState('')
  const [visitDate, setVisitDate] = useState('')
  const [visitTime, setVisitTime] = useState('')
  const [notes, setNotes] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [paidAmount, setPaidAmount] = useState('')

  const todayStr = new Date().toISOString().slice(0, 10)

  useEffect(() => {
    supabase.from('loved_ones').select('id,full_name,city').order('full_name')
      .then(({ data }) => {
        setLovedOnes(data || [])
        if (data && data.length === 1) setLovedOneId(data[0].id)
        setLoadingLO(false)
      })
  }, [])

  const selectedService = SERVICES.find(s => s.type === serviceType)

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
          } else {
            setPaidAmount(selectedService?.price || '')
            setSuccess(true)
          }
          setSubmitting(false)
        },
        modal: {
          ondismiss: () => {
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

  if (success) {
    return (
      <div className="animate-fade-in max-w-md mx-auto text-center py-12 space-y-5">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle size={32} className="text-green-600" />
        </div>
        <div>
          <h1 className="font-serif text-2xl text-green-900 mb-2">Booking confirmed</h1>
          <p className="text-sm text-gray-500 leading-relaxed">
            Your {paidAmount && <strong className="text-green-800">{paidAmount} </strong>}payment was received.
            Our coordinator will call within <strong>24 hours</strong> to confirm the visit and assign your companion.
          </p>
        </div>
        <Link
          to="/dashboard/bookings"
          className="inline-flex items-center gap-2 bg-green-800 hover:bg-green-700 text-white font-semibold px-6 py-3 rounded-xl transition-colors text-sm"
        >
          View my bookings →
        </Link>
      </div>
    )
  }

  return (
    <div className="animate-fade-in max-w-xl space-y-1">
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-serif text-2xl text-green-900">Book a visit</h1>
        <p className="text-gray-400 text-sm mt-1">Securely pay via UPI, card, or net banking.</p>
      </div>

      {loadingLO ? (
        <div className="flex items-center gap-2 text-sm text-gray-400 py-8">
          <Loader2 size={16} className="animate-spin" /> Loading…
        </div>
      ) : lovedOnes.length === 0 ? (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center">
          <p className="font-semibold text-amber-900 mb-2">Add a loved one first</p>
          <p className="text-sm text-amber-700 mb-4">Add your parent or family member's profile before booking.</p>
          <Link to="/dashboard/loved-ones"
            className="inline-block bg-amber-600 text-white font-semibold text-sm px-5 py-2.5 rounded-xl hover:bg-amber-700 transition-colors">
            Add loved one
          </Link>
        </div>
      ) : (
        <form onSubmit={handlePay} className="space-y-5">

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
            </div>
          </div>

          {/* ── Step 3: When ─────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">3 · Preferred date & time</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1.5 block">Date</label>
                <input
                  type="date"
                  value={visitDate}
                  onChange={e => setVisitDate(e.target.value)}
                  min={todayStr}
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
                  {TIME_SLOTS.map(t => (
                    <option key={t} value={t}>{formatTimeLabel(t)}</option>
                  ))}
                </select>
              </div>
            </div>
            <p className="text-xs text-gray-400">Our coordinator will confirm the exact time when they call.</p>
          </div>

          {/* ── Step 4: Notes ────────────────────────────────── */}
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

          {/* ── Order summary + Pay ───────────────────────────── */}
          {selectedService && (
            <div className="bg-green-900 rounded-2xl p-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-white font-semibold text-sm">{selectedService.name}</p>
                <p className="text-green-300 text-xs mt-0.5">UPI · Cards · Net Banking · Wallets</p>
              </div>
              <p className="font-serif text-xl text-white flex-shrink-0">{selectedService.price}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || !serviceType}
            className="w-full bg-green-800 hover:bg-green-700 disabled:opacity-50 text-white font-semibold py-3.5 rounded-xl transition-colors text-sm flex items-center justify-center gap-2"
          >
            {submitting ? (
              <><Loader2 size={16} className="animate-spin" /> Processing…</>
            ) : selectedService ? (
              `Pay ${selectedService.price} via Razorpay`
            ) : (
              'Select a service to continue'
            )}
          </button>

          <div className="flex items-center justify-center gap-1.5 text-xs text-gray-400 pb-2">
            <ShieldCheck size={12} />
            Secured by Razorpay · Close Eye never stores your payment details
          </div>

        </form>
      )}
    </div>
  )
}
