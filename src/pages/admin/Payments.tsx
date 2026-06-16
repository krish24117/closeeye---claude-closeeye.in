import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Spinner } from '@/components/ui/Skeleton'
import { format } from 'date-fns'
import { TrendingUp, Banknote, PieChart, Clock } from 'lucide-react'
import { STATUS_COLORS } from '@/lib/booking-labels'

export function AdminPayments() {
  const [bookings, setBookings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase.from('bookings')
        .select('id,amount_paise,companion_payout_paise,payment_status,status,created_at,companion_id,companions(full_name)')
        .order('created_at', { ascending: false })
      if (error) throw error
      setBookings(data || [])
    } catch (err) {
      console.error('Failed to load payments:', err)
      setError('Something went wrong — please try again.')
    } finally {
      setLoading(false)
    }
  }

  const totalRevenue = bookings.filter(b => b.payment_status === 'paid' || b.payment_status === 'received').reduce((sum, b) => sum + (b.amount_paise || 0), 0)
  const totalPayouts = bookings.filter(b => b.status === 'completed').reduce((sum, b) => sum + (b.companion_payout_paise || 0), 0)
  const margin = totalRevenue - totalPayouts
  const pendingPaymentCount = bookings.filter(b => b.payment_status === 'pending').length

  if (loading) return <Spinner />

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-serif text-2xl text-green-900">Payments</h1>
        <p className="text-gray-400 text-sm mt-1">Revenue, companion payouts, and platform margin.</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-4 flex items-center justify-between gap-3">
          {error}
          <button onClick={load} className="font-semibold underline whitespace-nowrap">Retry</button>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {([
          { icon: TrendingUp, label: 'Total Revenue', value: `₹${(totalRevenue / 100).toLocaleString('en-IN')}` },
          { icon: Banknote, label: 'Companion Payouts', value: `₹${(totalPayouts / 100).toLocaleString('en-IN')}` },
          { icon: PieChart, label: 'Platform Margin', value: `₹${(margin / 100).toLocaleString('en-IN')}` },
          { icon: Clock, label: 'Pending Payments', value: pendingPaymentCount },
        ] as const).map(c => (
          <div key={c.label} className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#e8f5e9] text-[#2d6a4f] flex items-center justify-center mb-3">
              <c.icon size={17} />
            </div>
            <p className="font-serif text-2xl text-green-900">{c.value}</p>
            <p className="text-xs text-gray-400 mt-1">{c.label}</p>
          </div>
        ))}
      </div>

      {bookings.length === 0 ? (
        <div className="text-center py-20 bg-green-50 rounded-2xl">
          <p className="text-4xl mb-3">💳</p>
          <p className="font-semibold text-green-900">No bookings yet</p>
          <p className="text-sm text-gray-400 mt-1">Payments will appear here once bookings are made.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold">Companion</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold text-right">Amount</th>
                <th className="px-4 py-3 font-semibold text-right">Payout</th>
                <th className="px-4 py-3 font-semibold text-right">Margin</th>
                <th className="px-4 py-3 font-semibold">Payment</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map(b => (
                <tr key={b.id} className="border-b border-gray-50 last:border-0">
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{format(new Date(b.created_at), 'dd MMM yyyy')}</td>
                  <td className="px-4 py-3 text-gray-700">{b.companions?.full_name || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[b.status] || 'bg-gray-100 text-gray-500'}`}>
                      {b.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-green-800 whitespace-nowrap">₹{(b.amount_paise / 100).toLocaleString('en-IN')}</td>
                  <td className="px-4 py-3 text-right text-gray-600 whitespace-nowrap">
                    {b.companion_payout_paise != null ? `₹${(b.companion_payout_paise / 100).toLocaleString('en-IN')}` : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600 whitespace-nowrap">
                    {b.companion_payout_paise != null ? `₹${((b.amount_paise - b.companion_payout_paise) / 100).toLocaleString('en-IN')}` : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${b.payment_status === 'paid' || b.payment_status === 'received' ? 'bg-green-100 text-green-700' : 'bg-orange-50 text-orange-700'}`}>
                      {b.payment_status === 'received' ? 'Received' : b.payment_status === 'paid' ? 'Paid' : 'Pending'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
