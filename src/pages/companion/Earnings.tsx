import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isWithinInterval } from 'date-fns'
import { TrendingUp, Banknote, Clock, CheckCircle2 } from 'lucide-react'
import { SERVICE_NAMES } from '@/lib/booking-labels'
import { Skeleton } from '@/components/ui/Skeleton'

type Tab = 'history' | 'week' | 'month'

function formatDuration(b: any): string {
  if (!b.checked_in_at || !b.checked_out_at) return '—'
  const mins = Math.round((new Date(b.checked_out_at).getTime() - new Date(b.checked_in_at).getTime()) / 60000)
  if (mins < 60) return `${mins} min`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
          <Skeleton className="w-9 h-9 rounded-xl" />
          <Skeleton className="h-7 w-16" />
          <Skeleton className="h-3 w-20" />
        </div>
      ))}
    </div>
  )
}

function ListSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="px-4 py-3 flex items-center justify-between gap-3">
          <div className="space-y-1.5 flex-1">
            <Skeleton className="h-3.5 w-32" />
            <Skeleton className="h-2.5 w-24" />
          </div>
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  )
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

  const now = new Date()
  const monthStart = startOfMonth(now)
  const monthEnd   = endOfMonth(now)

  const thisMonthPaise = bookings
    .filter(b => b.completed_at && isWithinInterval(new Date(b.completed_at), { start: monthStart, end: monthEnd }))
    .reduce((sum, b) => sum + (b.companion_payout_paise || 0), 0)
  const pendingCount  = bookings.filter(b => b.companion_payout_paise == null).length
  const allTimePaise  = bookings.reduce((sum, b) => sum + (b.companion_payout_paise || 0), 0)

  const weekGroups: Record<string, { start: Date; end: Date; total: number; count: number }> = {}
  const monthGroups: Record<string, { label: string; total: number; count: number }> = {}
  for (const b of bookings) {
    if (!b.completed_at) continue
    const d = new Date(b.completed_at)
    const wk = startOfWeek(d, { weekStartsOn: 1 })
    const wkKey = wk.toISOString()
    if (!weekGroups[wkKey]) weekGroups[wkKey] = { start: wk, end: endOfWeek(wk, { weekStartsOn: 1 }), total: 0, count: 0 }
    weekGroups[wkKey].total += b.companion_payout_paise || 0
    weekGroups[wkKey].count += 1

    const mKey = format(d, 'yyyy-MM')
    if (!monthGroups[mKey]) monthGroups[mKey] = { label: format(d, 'MMMM yyyy'), total: 0, count: 0 }
    monthGroups[mKey].total += b.companion_payout_paise || 0
    monthGroups[mKey].count += 1
  }
  const weekRows  = Object.values(weekGroups).sort((a, b) => b.start.getTime() - a.start.getTime())
  const monthRows = Object.entries(monthGroups).sort((a, b) => b[0].localeCompare(a[0])).map(([, v]) => v)

  return (
    <div className="space-y-5 animate-fade-in">

      {/* Header */}
      <div>
        <h1 className="font-serif text-2xl text-green-900">Earnings</h1>
        <p className="text-gray-400 text-sm mt-0.5">Your payout history and totals.</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-4 flex items-center justify-between gap-3">
          {error}
          <button onClick={load} className="font-semibold underline whitespace-nowrap">Retry</button>
        </div>
      )}

      {/* ── STAT CARDS ──────────────────────────────────────────────────────── */}
      {loading ? <StatsSkeleton /> : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: Banknote,     label: 'This Month',       value: `₹${(thisMonthPaise / 100).toLocaleString('en-IN')}`, sub: format(now, 'MMMM yyyy') },
            { icon: Clock,        label: 'Pending',          value: pendingCount,                                          sub: 'Awaiting payout'        },
            { icon: CheckCircle2, label: 'Completed Visits', value: bookings.length,                                       sub: 'All time'               },
            { icon: TrendingUp,   label: 'All-Time',         value: `₹${(allTimePaise / 100).toLocaleString('en-IN')}`,   sub: 'Total earned'           },
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

      {/* ── TABS + CONTENT ───────────────────────────────────────────────────── */}
      {loading ? <ListSkeleton /> : bookings.length === 0 ? (
        <div className="text-center py-16 bg-green-50 rounded-2xl">
          <p className="text-4xl mb-3">💰</p>
          <p className="font-semibold text-green-900">No completed visits yet</p>
          <p className="text-sm text-gray-400 mt-1">Your earnings will appear here after visits are completed.</p>
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
            <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
              {bookings.map(b => (
                <div key={b.id} className="px-4 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-green-900 truncate">{b.loved_ones?.full_name}</p>
                    <p className="text-xs text-gray-400 mt-0.5 truncate">
                      {SERVICE_NAMES[b.service_type] || b.service_type}
                      {b.completed_at ? ` · ${format(new Date(b.completed_at), 'dd MMM yyyy')}` : ''}
                      {' · '}{formatDuration(b)}
                    </p>
                  </div>
                  {b.companion_payout_paise != null ? (
                    <p className="font-semibold text-green-800 text-sm whitespace-nowrap flex-shrink-0">
                      ₹{(b.companion_payout_paise / 100).toLocaleString('en-IN')}
                    </p>
                  ) : (
                    <span className="text-xs font-semibold text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full flex-shrink-0">Pending</span>
                  )}
                </div>
              ))}
            </div>
          )}

          {tab === 'week' && (
            <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
              {weekRows.map(row => (
                <div key={row.start.toISOString()} className="px-4 py-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-green-900">{format(row.start, 'dd MMM')} – {format(row.end, 'dd MMM yyyy')}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{row.count} visit{row.count === 1 ? '' : 's'}</p>
                  </div>
                  <p className="font-semibold text-green-800">₹{(row.total / 100).toLocaleString('en-IN')}</p>
                </div>
              ))}
            </div>
          )}

          {tab === 'month' && (
            <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
              {monthRows.map(row => (
                <div key={row.label} className="px-4 py-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-green-900">{row.label}</p>
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
