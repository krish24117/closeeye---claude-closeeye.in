import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { StatsSkeleton, Skeleton } from '@/components/ui/Skeleton'
import { format } from 'date-fns'
import { TrendingUp, Banknote, PieChart, Clock } from 'lucide-react'

const PAYMENT_BADGE: Record<string, string> = {
  paid:     'bg-green-100 text-green-700',
  received: 'bg-green-100 text-green-700',
  pending:  'bg-orange-50 text-orange-700',
  failed:   'bg-red-100 text-red-700',
}

const STATUS_BADGE: Record<string, string> = {
  pending:            'bg-amber-100 text-amber-700',
  confirmed:          'bg-blue-100 text-blue-700',
  companion_assigned: 'bg-purple-100 text-purple-700',
  in_progress:        'bg-green-100 text-green-700',
  completed:          'bg-gray-100 text-gray-500',
  cancelled:          'bg-red-100 text-red-600',
}

function rupees(paise: number | null | undefined) {
  if (paise == null) return <span className="text-gray-300">—</span>
  return <span>₹{(paise / 100).toLocaleString('en-IN')}</span>
}

function TableSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="px-4 py-3.5 flex gap-4">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-28 flex-1" />
          <Skeleton className="h-3 w-16" />
        </div>
      ))}
    </div>
  )
}

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
        .select('id,amount_paise,companion_payout_paise,payment_status,status,created_at,scheduled_at,service_type,companion_id,companions(full_name),loved_ones(full_name)')
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

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  const paidBookings = bookings.filter(b => b.payment_status === 'paid' || b.payment_status === 'received')
  const thisMonth = paidBookings.filter(b => new Date(b.created_at) >= monthStart)

  const totalRevenue  = paidBookings.reduce((s, b) => s + (b.amount_paise || 0), 0)
  const monthRevenue  = thisMonth.reduce((s, b) => s + (b.amount_paise || 0), 0)
  const totalPayouts  = bookings.filter(b => b.status === 'completed').reduce((s, b) => s + (b.companion_payout_paise || 0), 0)
  const margin        = totalRevenue - totalPayouts
  const pendingCount  = bookings.filter(b => b.payment_status === 'pending' && !['cancelled'].includes(b.status)).length

  const fmt = (dt: string) => format(new Date(dt), 'dd MMM yy')

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Header */}
      <div>
        <h1 className="font-serif text-2xl text-green-900">Payments</h1>
        <p className="text-gray-400 text-sm mt-0.5">Revenue, payouts, and platform margin.</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-4 flex items-center justify-between gap-3">
          {error}
          <button onClick={load} className="font-semibold underline">Retry</button>
        </div>
      )}

      {/* Stat cards */}
      {loading ? <StatsSkeleton /> : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { icon: TrendingUp, label: 'Total Revenue',        value: `₹${(totalRevenue / 100).toLocaleString('en-IN')}`,  sub: 'All time paid' },
            { icon: Banknote,   label: 'This month',           value: `₹${(monthRevenue / 100).toLocaleString('en-IN')}`,  sub: format(now, 'MMMM yyyy') },
            { icon: PieChart,   label: 'Platform Margin',      value: `₹${(margin / 100).toLocaleString('en-IN')}`,        sub: 'Revenue − payouts' },
            { icon: Clock,      label: 'Pending Payments',     value: pendingCount,                                        sub: 'Awaiting payment' },
          ].map(c => (
            <div key={c.label} className="bg-white rounded-2xl border border-gray-100 p-4">
              <div className="w-9 h-9 rounded-xl bg-green-50 text-green-700 flex items-center justify-center mb-3">
                <c.icon size={17} />
              </div>
              <p className="font-serif text-2xl text-green-900 leading-none">{c.value}</p>
              <p className="text-xs font-semibold text-gray-700 mt-1">{c.label}</p>
              <p className="text-[11px] text-gray-400 mt-0.5">{c.sub}</p>
            </div>
          ))}
        </div>
      )}

      {/* Payments list */}
      <div>
        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">All payments</p>

        {loading ? <TableSkeleton /> : bookings.length === 0 ? (
          <div className="text-center py-16 bg-green-50 rounded-2xl">
            <p className="text-4xl mb-3">💳</p>
            <p className="font-semibold text-green-900">No bookings yet</p>
            <p className="text-sm text-gray-400 mt-1">Payments will appear here once bookings are made.</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden sm:block bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    <th className="px-4 py-3 text-left">Date</th>
                    <th className="px-4 py-3 text-left">Family / Companion</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3 text-right">Payout</th>
                    <th className="px-4 py-3 text-right">Margin</th>
                    <th className="px-4 py-3 text-left">Payment</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map(b => (
                    <tr key={b.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                      <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{fmt(b.created_at)}</td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-gray-700">{b.loved_ones?.full_name || '—'}</p>
                        <p className="text-xs text-gray-400">{b.companions?.full_name || 'Unassigned'}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_BADGE[b.status] || 'bg-gray-100 text-gray-500'}`}>
                          {b.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-green-800 whitespace-nowrap text-sm">
                        {rupees(b.amount_paise)}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-500 whitespace-nowrap text-sm">
                        {rupees(b.companion_payout_paise)}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-500 whitespace-nowrap text-sm">
                        {b.companion_payout_paise != null ? rupees(b.amount_paise - b.companion_payout_paise) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${PAYMENT_BADGE[b.payment_status] || 'bg-gray-100 text-gray-400'}`}>
                          {b.payment_status === 'received' ? 'Received' : b.payment_status === 'paid' ? 'Paid' : b.payment_status === 'failed' ? 'Failed' : 'Pending'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards — replaces horizontal table to avoid cutoff */}
            <div className="sm:hidden space-y-2">
              {bookings.map(b => (
                <div key={b.id} className="bg-white rounded-2xl border border-gray-100 px-4 py-3 space-y-2">
                  {/* Row 1: family + date */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-green-900">{b.loved_ones?.full_name || '—'}</p>
                      <p className="text-xs text-gray-400">{b.companions?.full_name || 'Unassigned'}</p>
                    </div>
                    <p className="text-xs text-gray-400 whitespace-nowrap">{fmt(b.created_at)}</p>
                  </div>
                  {/* Row 2: amount + payout + margin */}
                  <div className="flex items-center gap-3 text-xs">
                    <span className="font-semibold text-green-800">{b.amount_paise ? `₹${(b.amount_paise/100).toLocaleString('en-IN')}` : '—'}</span>
                    {b.companion_payout_paise != null && (
                      <span className="text-gray-400">payout ₹{(b.companion_payout_paise/100).toLocaleString('en-IN')}</span>
                    )}
                    {b.companion_payout_paise != null && (
                      <span className="text-gray-400">margin ₹{((b.amount_paise - b.companion_payout_paise)/100).toLocaleString('en-IN')}</span>
                    )}
                  </div>
                  {/* Row 3: status badges */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${STATUS_BADGE[b.status] || 'bg-gray-100 text-gray-400'}`}>
                      {b.status.replace(/_/g, ' ')}
                    </span>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${PAYMENT_BADGE[b.payment_status] || 'bg-gray-100 text-gray-400'}`}>
                      {b.payment_status === 'received' ? 'Received' : b.payment_status === 'paid' ? 'Paid' : b.payment_status === 'failed' ? 'Failed' : 'Pending'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
