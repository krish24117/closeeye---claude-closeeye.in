// src/pages/dashboard/NewBooking.tsx
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'

const BOOKING_SERVICES = [
  { type: 'companion_visit_single',  name: 'Companion Visit',    price: '₹999',      paise: 99900,  desc: 'Friendly home visit, wellbeing check, photos and a full report sent to you.' },
  { type: 'hospital_companion_single', name: 'Hospital Companion', price: '₹1,499',  paise: 149900, desc: 'Companion accompanies to appointment, updates family throughout.' },
  { type: 'emergency_visit',         name: 'Emergency Visit',    price: '₹1,999',    paise: 199900, desc: 'Same-day dispatch when something feels off — priority response.' },
  { type: 'care_plan_4_monthly',     name: 'Monthly Care Plan',  price: '₹2,999/mo', paise: 299900, desc: '4 recurring visits per month with the same companion.' },
]

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

export function DashboardNewBooking() {
  const { user, profile } = useAuth()
  const [lovedOnes, setLovedOnes] = useState<any[]>([])
  const [loadingLO, setLoadingLO] = useState(true)

  const [serviceType, setServiceType] = useState('')
  const [lovedOneId, setLovedOneId] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [notes, setNotes] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [paidAmount, setPaidAmount] = useState<string>('')

  useEffect(() => {
    supabase.from('loved_ones').select('id,full_name,city').order('full_name')
      .then(({ data }) => {
        setLovedOnes(data || [])
        if (data && data.length === 1) setLovedOneId(data[0].id)
        setLoadingLO(false)
      })
  }, [])

  const selectedService = BOOKING_SERVICES.find(s => s.type === serviceType)

  async function handlePay(e: React.FormEvent) {
    e.preventDefault()
    if (!serviceType)   { setError('Please select a service.'); return }
    if (!lovedOneId)    { setError('Please select a loved one.'); return }
    if (!scheduledAt)   { setError('Please choose a preferred date and time.'); return }
    if (!user)          { setError('You must be signed in to book.'); return }

    setSubmitting(true)
    setError(null)

    try {
      // 1. Create Razorpay order + booking via edge function
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

      // 2. Load checkout script
      const loaded = await loadRazorpayScript()
      if (!loaded) throw new Error('Could not load payment gateway. Please refresh and try again.')

      // 3. Open Razorpay modal
      const rzp = new window.Razorpay({
        key: data.key_id,
        order_id: data.order_id,
        amount: data.amount,
        currency: data.currency,
        name: 'Close Eye',
        description: selectedService!.name,
        image: '/favicon.svg',
        theme: { color: '#1a3a2a' },
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
          // 4. Verify signature server-side
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
            setError('Payment received but verification failed — please contact support with your payment ID: ' + response.razorpay_payment_id)
          } else {
            setPaidAmount(selectedService?.price || '')
            setSuccess(true)
          }
          setSubmitting(false)
        },
        modal: {
          ondismiss: () => {
            setError('Payment was cancelled. Your booking request has been saved — contact us on WhatsApp to complete payment.')
            setSubmitting(false)
          },
        },
      })

      rzp.open()
    } catch (err: any) {
      console.error('Payment error:', err)
      setError(err.message || 'Something went wrong — please try again.')
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="animate-fade-in max-w-lg mx-auto text-center space-y-6 py-8">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto text-3xl">🎉</div>
        <div>
          <h1 className="font-serif text-2xl text-green-900 mb-3">Payment confirmed!</h1>
          <p className="text-sm text-gray-600 leading-relaxed">
            Your {paidAmount && <strong>{paidAmount} </strong>}payment was received. Our care coordinator will contact you within <strong>24 hours</strong> to confirm visit details and assign your companion.
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
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div>
        <h1 className="font-serif text-2xl text-green-900">Book a visit</h1>
        <p className="text-gray-400 text-sm mt-1">Pay securely via Razorpay — UPI, cards, net banking all accepted.</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-4">
          {error}
        </div>
      )}

      {loadingLO ? (
        <div className="text-sm text-gray-400">Loading...</div>
      ) : lovedOnes.length === 0 ? (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center">
          <p className="font-semibold text-amber-900 mb-2">Add a loved one first</p>
          <p className="text-sm text-amber-700 mb-4">You need to add your parent or family member's profile before booking a visit.</p>
          <Link to="/dashboard/loved-ones" className="inline-block bg-amber-600 text-white font-semibold text-sm px-5 py-2.5 rounded-xl hover:bg-amber-700 transition-colors">
            Add loved one
          </Link>
        </div>
      ) : (
        <form onSubmit={handlePay} className="space-y-6">

          {/* Service selection */}
          <div>
            <label className="block text-sm font-semibold text-green-900 mb-3">Select a service *</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {BOOKING_SERVICES.map(s => (
                <button
                  key={s.type}
                  type="button"
                  onClick={() => setServiceType(s.type)}
                  className={`text-left rounded-2xl border-2 p-4 transition-all ${serviceType === s.type ? 'border-green-600 bg-green-50' : 'border-gray-100 bg-white hover:border-green-300'}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-green-900 text-sm">{s.name}</p>
                    <span className="text-xs font-bold text-green-700 whitespace-nowrap">{s.price}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">{s.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Loved one */}
          <div>
            <label className="block text-sm font-semibold text-green-900 mb-1.5">Who is this visit for? *</label>
            <select
              value={lovedOneId}
              onChange={e => setLovedOneId(e.target.value)}
              required
              className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-green-600"
            >
              <option value="">— Select —</option>
              {lovedOnes.map(lo => (
                <option key={lo.id} value={lo.id}>{lo.full_name}{lo.city ? ` · ${lo.city}` : ''}</option>
              ))}
            </select>
          </div>

          {/* Date & time */}
          <div>
            <label className="block text-sm font-semibold text-green-900 mb-1.5">Preferred date & time *</label>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={e => setScheduledAt(e.target.value)}
              min={new Date().toISOString().slice(0, 16)}
              required
              className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-green-600"
            />
            <p className="text-xs text-gray-400 mt-1">Our coordinator will confirm the final time when they call you.</p>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-semibold text-green-900 mb-1.5">Notes for the companion <span className="font-normal text-gray-400">(optional)</span></label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder="Any special instructions, access details, or things the companion should know..."
              className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-green-600 resize-none"
            />
          </div>

          {/* Order summary */}
          {selectedService && (
            <div className="bg-green-50 rounded-2xl p-4 flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-green-900 text-sm">{selectedService.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">UPI · Cards · Net Banking · Wallets</p>
              </div>
              <p className="font-serif text-xl text-green-900 flex-shrink-0">{selectedService.price}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || !serviceType}
            className="w-full bg-green-800 hover:bg-green-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors text-sm flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Processing…
              </>
            ) : selectedService ? (
              `Pay ${selectedService.price} via Razorpay`
            ) : (
              'Select a service to continue'
            )}
          </button>

          <p className="text-xs text-center text-gray-400">
            Secured by Razorpay · Your payment details are never stored by Close Eye
          </p>
        </form>
      )}
    </div>
  )
}
