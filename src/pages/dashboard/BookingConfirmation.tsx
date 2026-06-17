import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { CheckCircle, Calendar, User, MessageCircle, Loader2, ArrowRight } from 'lucide-react'
import { format } from 'date-fns'
import { supabase } from '@/lib/supabase'

const SERVICE_NAMES: Record<string, string> = {
  companion_visit_single:    'Companion Visit',
  hospital_companion_single: 'Hospital Companion',
  emergency_visit:           'Emergency Visit',
  care_plan_4_monthly:       'Monthly Care Plan',
}

interface Booking {
  id: string
  service_type: string
  amount_paise: number
  scheduled_at: string
  razorpay_payment_id: string | null
  paid_at: string | null
  loved_ones: { full_name: string }[] | null
}

export function BookingConfirmationPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const bookingId = params.get('id')

  const [booking, setBooking] = useState<Booking | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!bookingId) {
      navigate('/dashboard', { replace: true })
      return
    }

    supabase
      .from('bookings')
      .select('id, service_type, amount_paise, scheduled_at, razorpay_payment_id, paid_at, loved_ones(full_name)')
      .eq('id', bookingId)
      .eq('payment_status', 'paid')
      .maybeSingle()
      .then(({ data, error }) => {
        if (error || !data) {
          navigate('/dashboard', { replace: true })
        } else {
          setBooking(data as Booking)
        }
        setLoading(false)
      })
  }, [bookingId, navigate])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-green-600" />
      </div>
    )
  }

  if (!booking) return null

  const shortRef = booking.id.slice(0, 8).toUpperCase()
  const serviceName = SERVICE_NAMES[booking.service_type] ?? booking.service_type
  const amountDisplay = `₹${(booking.amount_paise / 100).toLocaleString('en-IN')}`
  const lovedOneName = Array.isArray(booking.loved_ones)
    ? booking.loved_ones[0]?.full_name ?? '—'
    : (booking.loved_ones as { full_name: string } | null)?.full_name ?? '—'
  const scheduledDisplay = booking.scheduled_at
    ? format(new Date(booking.scheduled_at), 'd MMM yyyy, h:mm a')
    : '—'

  return (
    <div className="animate-fade-in max-w-md mx-auto py-6 space-y-5">

      {/* Success banner */}
      <div className="bg-green-800 rounded-2xl p-6 text-center space-y-3">
        <div className="w-14 h-14 bg-white/15 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle size={28} className="text-white" />
        </div>
        <div>
          <h1 className="font-serif text-2xl text-white">Booking confirmed!</h1>
          <p className="text-green-300 text-sm mt-1">Payment received successfully</p>
        </div>
      </div>

      {/* Booking details card */}
      <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-100">
        <div className="px-5 py-4">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">Booking reference</p>
          <p className="font-mono font-bold text-green-900 text-lg">{shortRef}</p>
          <p className="text-xs text-gray-400 mt-0.5">{booking.id}</p>
        </div>

        <div className="px-5 py-4 flex items-center gap-3">
          <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center flex-shrink-0">
            <Calendar size={15} className="text-green-700" />
          </div>
          <div>
            <p className="text-xs text-gray-400">Service</p>
            <p className="text-sm font-semibold text-gray-800">{serviceName}</p>
            <p className="text-xs text-green-700 font-semibold">{amountDisplay} paid</p>
          </div>
        </div>

        <div className="px-5 py-4 flex items-center gap-3">
          <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center flex-shrink-0">
            <User size={15} className="text-green-700" />
          </div>
          <div>
            <p className="text-xs text-gray-400">Visit for</p>
            <p className="text-sm font-semibold text-gray-800">{lovedOneName}</p>
          </div>
        </div>

        <div className="px-5 py-4 flex items-center gap-3">
          <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center flex-shrink-0">
            <Calendar size={15} className="text-green-700" />
          </div>
          <div>
            <p className="text-xs text-gray-400">Preferred date & time</p>
            <p className="text-sm font-semibold text-gray-800">{scheduledDisplay}</p>
          </div>
        </div>
      </div>

      {/* What happens next */}
      <div className="bg-green-50 rounded-2xl p-5 flex gap-3">
        <MessageCircle size={18} className="text-green-700 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-green-900 mb-1">What happens next?</p>
          <p className="text-sm text-green-800 leading-relaxed">
            Your companion will be assigned shortly. We'll notify you on WhatsApp with their name, photo, and confirmed visit time within <strong>24 hours</strong>.
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Link
          to="/dashboard/bookings"
          className="flex-1 flex items-center justify-center gap-2 bg-green-800 hover:bg-green-700 text-white font-semibold py-3 rounded-xl transition-colors text-sm"
        >
          View my bookings <ArrowRight size={15} />
        </Link>
        <Link
          to="/dashboard"
          className="flex-1 flex items-center justify-center gap-2 border-2 border-gray-200 text-gray-600 hover:border-green-600 hover:text-green-800 font-semibold py-3 rounded-xl transition-colors text-sm"
        >
          Go to home
        </Link>
      </div>

    </div>
  )
}
