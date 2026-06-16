import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isWithinInterval } from 'date-fns'
import { SERVICE_NAMES } from '@/lib/booking-labels'

type Tab = 'history' | 'week' | 'month'

function formatDuration(b: any): string {
  if (!b.checked_in_at || !b.checked_out_at) return '—'
  const mins = Math.round((new Date(b.checked_out_at).getTime() - new Date(b.checked_in_at).getTime()) / 60000)
  if (mins < 60) return `${mins} min`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

export function CompanionEarnings() {
  const { user } = useAuth()
  const [bookings, setBookings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('history')

  useEffect(() => { load() }, [user])

  async function load() {
    if (!user) return
    setLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase.from('bookings')
        .select('id,completed_at,checked_in_at,checked_out_at,amount_paise,companion_payout_paise,loved_ones(full_name),service_type,visit_reports(id)')
        .eq('companion_id', user.id)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
      if (error) throw error
      setBookings(data || [])
    } catch (err) {
      console.error('Failed to load earnings:', err)
      setError('Something went wrong — please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <EarningsSkeleton />

  const now = new Date()
  const monthStart = startOfMonth(now)
  const monthEnd = endOfMonth(now)

  const thisMonthPaise = bookings
    .filter(b => b.completed_at && isWithinInterval(new Date(b.completed_at), { start: monthStart, end: monthEnd }))
    .reduce((sum, b) => sum + (b.companion_payout_paise || 0), 0)
  const pendingCount = bookings.filter(b => b.companion_payout_paise == null).length
  const allTimePaise = bookings.reduce((sum, b) => sum + (b.companion_payout_paise || 0), 0)

  const weekGroups: Record<string, { start: Date; end: Date; total: number; count: number }> = {}
  const monthGroups: Record<string, { label: string; total: number; count: number }> = {}
  for (const b of bookings) {
    if (!b.completed_at) continue
    const d = new Date(b.completed_at)
    const weekStart = startOfWeek(d, { weekStartsOn: 1 })
    const weekKey = weekStart.toISOString()
    if (!weekGroups[weekKey]) weekGroups[weekKey] = { start: weekStart, end: endOfWeek(weekStart, { weekStartsOn: 1 }), total: 0, count: 0 }
    weekGroups[weekKey].total += b.companion_payout_paise || 0
    weekGroups[weekKey].count += 1

    const monthKey = format(d, 'yyyy-MM')
    if (!monthGroups[monthKey]) monthGroups[monthKey] = { label: format(d, 'MMMM yyyy'), total: 0, count: 0 }
    monthGroups[monthKey].total += b.companion_payout_paise || 0
    monthGroups[monthKey].count += 1
  }
  const weekRows = Object.values(weekGroups).sort((a, b) => b.start.getTime() - a.start.getTime())
  const monthRows = Object.entries(monthGroups).sort((a, b) => b[0].localeCompare(a[0])).map(([, v]) => v)

  return (
    <div className="space-y-5 animate-fade-in">
      <h1 className="font-serif text-2xl text-green-900">Earnings</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-4 flex items-center justify-between gap-3">
          {error}
          <button onClick={load} className="font-semibold underline whitespace-nowrap">Retry</button>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5">
          <p className="text-xs text-gray-400 mb-1">This Month</p>
          <p className="font-serif text-2xl sm:text-3xl text-green-900">₹{(thisMonthPaise / 100).toLocaleString('en-IN')}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5">
          <p className="text-xs text-gray-400 mb-1">Pending Payments</p>
          <p className="font-serif text-2xl sm:text-3xl text-green-900">{pendingCount}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5">
          <p className="text-xs text-gray-400 mb-1">Completed Visits</p>
          <p className="font-serif text-2xl sm:text-3xl text-green-900">{bookings.length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5">
          <p className="text-xs text-gray-400 mb-1">All-Time Earnings</p>
          <p className="font-serif text-2xl sm:text-3xl text-green-900">₹{(allTimePaise / 100).toLocaleString('en-IN')}</p>
        </div>
      </div>

      {bookings.length === 0 ? (
        <div className="text-center py-20 bg-green-50 rounded-2xl">
          <p className="text-4xl mb-3">💰</p>
          <p className="font-semibold text-green-900">No completed visits yet</p>
          <p className="text-sm text-gray-400 mt-1">Your earnings will appear here</p>
        </div>
      ) : (
        <>
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
            {([['history', 'History'], ['week', 'By Week'], ['month', 'By Month']] as [Tab, string][]).map(([v, label]) => (
              <button
                key={v}
                onClick={() => setTab(v)}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${tab === v ? 'bg-white text-green-800 shadow-sm' : 'text-gray-400 hover:text-green-800'}`}
              >
                {label}
              </button>
            ))}
          </div>

          {tab === 'history' && (
            <div className="space-y-3">
              {bookings.map(b => (
                <div key={b.id} className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <p className="font-semibold text-green-900 text-sm">{b.loved_ones?.full_name}</p>
                    <p className="text-xs text-gray-400">{SERVICE_NAMES[b.service_type] || b.service_type}</p>
                    {b.completed_at && <p className="text-xs text-gray-400 mt-0.5">{format(new Date(b.completed_at), 'dd MMM yyyy')}</p>}
                    <p className="text-xs text-gray-400 mt-0.5">
                      Duration: {formatDuration(b)} · {b.visit_reports?.length > 0 ? '✓ Report submitted' : 'No report'}
                    </p>
                  </div>
                  {b.companion_payout_paise != null ? (
                    <p className="font-semibold text-green-800">₹{(b.companion_payout_paise / 100).toLocaleString('en-IN')}</p>
                  ) : (
                    <span className="text-xs font-semibold text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">Pending</span>
                  )}
                </div>
              ))}
            </div>
          )}

          {tab === 'week' && (
            <div className="space-y-3">
              {weekRows.map(row => (
                <div key={row.start.toISOString()} className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <p className="font-semibold text-green-900 text-sm">{format(row.start, 'dd MMM')} – {format(row.end, 'dd MMM yyyy')}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{row.count} visit{row.count === 1 ? '' : 's'}</p>
                  </div>
                  <p className="font-semibold text-green-800">₹{(row.total / 100).toLocaleString('en-IN')}</p>
                </div>
              ))}
            </div>
          )}

          {tab === 'month' && (
            <div className="space-y-3">
              {monthRows.map(row => (
                <div key={row.label} className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <p className="font-semibold text-green-900 text-sm">{row.label}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{row.count} visit{row.count === 1 ? '' : 's'}</p>
                  </div>
                  <p className="font-semibold text-green-800">₹{(row.total / 100).toLocaleString('en-IN')}</p>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function EarningsSkeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="h-7 bg-gray-200 rounded-lg w-24" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[1,2,3,4].map(i => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 space-y-2">
            <div className="h-3 bg-gray-100 rounded w-20" />
            <div className="h-8 bg-gray-200 rounded w-24" />
          </div>
        ))}
      </div>
      <div className="space-y-3">
        {[1,2,3].map(i => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 flex justify-between">
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded w-32" />
              <div className="h-3 bg-gray-100 rounded w-20" />
            </div>
            <div className="h-4 bg-gray-200 rounded w-16" />
          </div>
        ))}
      </div>
    </div>
  )
}
