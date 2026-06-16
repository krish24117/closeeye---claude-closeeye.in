// src/pages/dashboard/NewBooking.tsx
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'

const BOOKING_SERVICES = [
  { type: 'companion_visit_single', name: 'Companion Visit', price: '₹999', paise: 99900, desc: 'Friendly home visit, wellbeing check, photos and a full report sent to you.' },
  { type: 'hospital_companion_single', name: 'Hospital Companion', price: '₹1,499', paise: 149900, desc: 'Companion accompanies to appointment, updates family throughout.' },
  { type: 'emergency_visit', name: 'Emergency Visit', price: '₹1,999', paise: 199900, desc: 'Same-day dispatch when something feels off — priority response.' },
  { type: 'care_plan_4_monthly', name: 'Monthly Care Plan', price: '₹2,999/mo', paise: 299900, desc: '4 recurring visits per month with the same companion.' },
]

const WA_LINK = 'https://wa.me/919000221261?text=Hi%20Close%20Eye!%20I%20just%20submitted%20a%20booking%20request%20and%20would%20like%20to%20arrange%20payment%20(UPI%2C%20bank%20transfer%2C%20or%20cash).'

export function DashboardNewBooking() {
  const { user } = useAuth()
  const [lovedOnes, setLovedOnes] = useState<any[]>([])
  const [loadingLO, setLoadingLO] = useState(true)

  const [serviceType, setServiceType] = useState('')
  const [lovedOneId, setLovedOneId] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [notes, setNotes] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    supabase.from('loved_ones').select('id,full_name,city').order('full_name')
      .then(({ data }) => {
        setLovedOnes(data || [])
        if (data && data.length === 1) setLovedOneId(data[0].id)
        setLoadingLO(false)
      })
  }, [])

  const selectedService = BOOKING_SERVICES.find(s => s.type === serviceType)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!serviceType) { setError('Please select a service.'); return }
    if (!lovedOneId) { setError('Please select a loved one.'); return }
    if (!scheduledAt) { setError('Please choose a preferred date and time.'); return }
    if (!user) { setError('You must be signed in to book.'); return }

    setSubmitting(true)
    setError(null)
    try {
      const { error: insertError } = await supabase.from('bookings').insert({
        family_user_id: user.id,
        loved_one_id: lovedOneId,
        service_type: serviceType,
        amount_paise: selectedService!.paise,
        status: 'pending',
        payment_status: 'pending',
        scheduled_at: scheduledAt,
        notes: notes.trim() || null,
      })
      if (insertError) throw insertError
      setSuccess(true)
    } catch (err: any) {
      console.error('Booking failed:', err)
      setError(err.message || 'Could not submit booking — please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="animate-fade-in max-w-lg mx-auto text-center space-y-6 py-8">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto text-3xl">🎉</div>
        <div>
          <h1 className="font-serif text-2xl text-green-900 mb-3">Booking received!</h1>
          <p className="text-sm text-gray-600 leading-relaxed">
            Thank you! Your booking request has been received. Our care coordinator will call you within <strong>24 hours</strong> to confirm your booking and arrange payment.
          </p>
          <p className="text-sm text-gray-500 mt-3">
            We accept <strong className="text-green-800">UPI · Bank Transfer · Cash</strong>
          </p>
        </div>
        <a
          href={WA_LINK}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2.5 bg-[#25D366] hover:bg-[#1ebe5d] text-white font-semibold px-6 py-3 rounded-xl transition-colors text-sm"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
          Chat with us on WhatsApp
        </a>
        <div>
          <Link to="/dashboard/bookings" className="text-sm text-green-700 hover:underline">
            View my bookings →
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div>
        <h1 className="font-serif text-2xl text-green-900">Book a visit</h1>
        <p className="text-gray-400 text-sm mt-1">Our coordinator will call to confirm within 24 hours. Payment via UPI, bank transfer, or cash.</p>
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
        <form onSubmit={handleSubmit} className="space-y-6">

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

          {/* Summary */}
          {selectedService && (
            <div className="bg-green-50 rounded-2xl p-4 flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-green-900 text-sm">{selectedService.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">Payment via UPI · Bank Transfer · Cash</p>
              </div>
              <p className="font-serif text-xl text-green-900 flex-shrink-0">{selectedService.price}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-green-800 hover:bg-green-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors text-sm"
          >
            {submitting ? 'Submitting...' : 'Submit booking request'}
          </button>
        </form>
      )}
    </div>
  )
}
