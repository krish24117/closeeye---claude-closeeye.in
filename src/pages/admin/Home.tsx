import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Calendar, Activity, ClipboardList, ChevronRight, AlertCircle, AlertTriangle } from 'lucide-react'
import { format, startOfDay, endOfDay } from 'date-fns'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { SERVICE_NAMES, STATUS_COLORS } from '@/lib/booking-labels'
import { Skeleton } from '@/components/ui/Skeleton'

// ── Skeletons ──────────────────────────────────────────────────────────────────

function ActionStripSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 space-y-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-8 w-12" />
          <Skeleton className="h-3 w-20" />
        </div>
      ))}
    </div>
  )
}

function FeedSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3.5">
          <Skeleton className="w-2 h-2 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3 w-2/3" />
            <Skeleton className="h-2.5 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Status dot ─────────────────────────────────────────────────────────────────

function StatusDot({ status }: { status: string }) {
  const cls =
    status === 'in_progress'        ? 'bg-green-500 animate-pulse' :
    status === 'pending'            ? 'bg-amber-400' :
    status === 'confirmed'          ? 'bg-blue-400' :
    status === 'companion_assigned' ? 'bg-purple-400' :
    status === 'completed'          ? 'bg-gray-300' :
    'bg-gray-200'
  return <span className={`w-2 h-2 rounded-full flex-shrink-0 ${cls}`} />
}

// ── Action card ────────────────────────────────────────────────────────────────

function ActionCard({
  to, count, label, sub, color, pulse,
}: {
  to: string
  count: number
  label: string
  sub: string
  color: 'green' | 'amber' | 'blue' | 'red'
  pulse?: boolean
}) {
  const cfg = {
    green: { border: 'border-green-200 hover:border-green-400', num: 'text-green-700', sub: 'text-green-600', bg: 'bg-green-50' },
    amber: { border: count > 0 ? 'border-amber-300 hover:border-amber-500' : 'border-gray-100 hover:border-gray-200', num: count > 0 ? 'text-amber-700' : 'text-gray-400', sub: count > 0 ? 'text-amber-600' : 'text-gray-400', bg: count > 0 ? 'bg-amber-50' : 'bg-gray-50' },
    blue:  { border: 'border-blue-200 hover:border-blue-400', num: 'text-blue-700', sub: 'text-blue-600', bg: 'bg-blue-50' },
    red:   { border: 'border-red-300 hover:border-red-500', num: 'text-red-700', sub: 'text-red-600', bg: 'bg-red-50' },
  }[color]

  return (
    <Link to={to} className={`group bg-white rounded-2xl border-2 ${cfg.border} p-4 transition-colors`}>
      <p className={`font-serif text-3xl leading-none ${cfg.num} ${pulse && count > 0 ? 'animate-pulse' : ''}`}>
        {count}
      </p>
      <p className={`text-xs font-semibold mt-1.5 ${cfg.num}`}>{label}</p>
      <p className={`text-[11px] mt-0.5 ${cfg.sub}`}>{sub}</p>
      <p className={`text-[11px] font-semibold mt-2.5 flex items-center gap-1 ${cfg.sub} group-hover:gap-2 transition-all`}>
        View <ChevronRight size={10} />
      </p>
    </Link>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────────

export function AdminHome() {
  const { profile } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // action strip counts
  const [visitsTodayCount, setVisitsTodayCount] = useState(0)
  const [unassignedCount, setUnassignedCount] = useState(0)
  const [newLeadsCount, setNewLeadsCount] = useState(0)

  // lists
  const [todayVisits, setTodayVisits] = useState<any[]>([])
  const [recentFeed, setRecentFeed] = useState<any[]>([])

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const now = new Date()
      const todayStart = startOfDay(now).toISOString()
      const todayEnd   = endOfDay(now).toISOString()

      const [allBookingsRes, todayBookingsRes, newSurveyRes, newWaitlistRes] = await Promise.all([
        supabase.from('bookings')
          .select('id, status, companion_id, payment_status, amount_paise, service_type, scheduled_at, created_at, loved_ones(full_name,city), companions(full_name)')
          .order('created_at', { ascending: false }),
        supabase.from('bookings')
          .select('id, status, service_type, scheduled_at, loved_ones(full_name,city), companions(full_name)')
          .gte('scheduled_at', todayStart)
          .lte('scheduled_at', todayEnd)
          .not('status', 'in', '("cancelled")')
          .order('scheduled_at'),
        supabase.from('survey_responses')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'new'),
        supabase.from('waitlist')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'new'),
      ])

      if (allBookingsRes.error) throw allBookingsRes.error

      const all = allBookingsRes.data || []
      const unassigned = all.filter(b => !b.companion_id && !['completed', 'cancelled'].includes(b.status))

      setUnassignedCount(unassigned.length)
      setVisitsTodayCount(todayBookingsRes.data?.length || 0)
      setNewLeadsCount((newSurveyRes.count || 0) + (newWaitlistRes.count || 0))
      setTodayVisits(todayBookingsRes.data || [])
      setRecentFeed(all.slice(0, 10))
    } catch (err) {
      console.error('Admin overview error:', err)
      setError('Something went wrong — please refresh.')
    } finally {
      setLoading(false)
    }
  }

  const firstName = profile?.full_name?.split(' ')[0] || 'Admin'
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const todayStr = format(new Date(), 'EEEE, d MMM')

  return (
    <div className="space-y-6 pb-10 animate-fade-in">

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl text-green-900">{greeting}, {firstName}</h1>
          <p className="text-gray-400 text-sm mt-0.5">{todayStr}</p>
        </div>
        <Link
          to="/admin/bookings"
          className="flex-shrink-0 flex items-center gap-1.5 bg-green-800 hover:bg-green-700 text-white text-xs font-semibold px-3.5 py-2 rounded-xl transition-colors"
        >
          <Calendar size={13} /> New booking
        </Link>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-4 flex items-center justify-between gap-3">
          {error}
          <button onClick={load} className="font-semibold underline whitespace-nowrap">Retry</button>
        </div>
      )}

      {/* ── ACTION STRIP ──────────────────────────────────────────────────────── */}
      <div>
        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">Right now</p>
        {loading ? <ActionStripSkeleton /> : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <ActionCard
              to="/admin/live-map"
              count={visitsTodayCount}
              label="Visits today"
              sub="Scheduled for today"
              color="green"
              pulse
            />
            <ActionCard
              to="/admin/bookings"
              count={unassignedCount}
              label="Unassigned"
              sub={unassignedCount > 0 ? 'Need a companion' : 'All covered'}
              color="amber"
            />
            <ActionCard
              to="/admin/leads"
              count={newLeadsCount}
              label="New leads"
              sub="Survey + waitlist"
              color="blue"
            />
            {/* SOS — hidden if 0, shown in red if > 0 */}
            {0 > 0 ? (
              <ActionCard
                to="/admin/bookings"
                count={0}
                label="SOS alerts"
                sub="Need immediate action"
                color="red"
                pulse
              />
            ) : (
              <Link to="/admin/bookings" className="group bg-white rounded-2xl border border-gray-100 p-4 transition-colors hover:border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle size={14} className="text-gray-300" />
                  <span className="text-[11px] font-semibold text-gray-300 uppercase tracking-wide">SOS alerts</span>
                </div>
                <p className="text-2xl font-bold text-gray-200">0</p>
                <p className="text-[11px] text-gray-300 mt-1">All clear</p>
              </Link>
            )}
          </div>
        )}
      </div>

      {/* ── TODAY'S VISITS ────────────────────────────────────────────────────── */}
      {!loading && todayVisits.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Today's visits</p>
            <Link to="/admin/live-map" className="text-xs text-green-700 font-semibold flex items-center gap-0.5 hover:underline">
              Live map <ChevronRight size={12} />
            </Link>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
            {todayVisits.map(b => (
              <Link key={b.id} to="/admin/bookings"
                className="flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors first:rounded-t-2xl last:rounded-b-2xl"
              >
                <StatusDot status={b.status} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-green-900 truncate">
                    {(b.loved_ones as any)?.full_name || '—'}
                  </p>
                  <p className="text-xs text-gray-400 truncate">
                    {SERVICE_NAMES[b.service_type] || b.service_type}
                    {b.scheduled_at ? ` · ${format(new Date(b.scheduled_at), 'h:mm a')}` : ''}
                    {(b.companions as any)?.full_name ? ` · ${(b.companions as any).full_name}` : ' · Unassigned'}
                  </p>
                </div>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0 ${STATUS_COLORS[b.status] || 'bg-gray-100 text-gray-500'}`}>
                  {b.status.replace(/_/g, ' ')}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ── RECENT ACTIVITY ───────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Recent bookings</p>
          <Link to="/admin/bookings" className="text-xs text-green-700 font-semibold flex items-center gap-0.5 hover:underline">
            All <ChevronRight size={12} />
          </Link>
        </div>
        {loading ? <FeedSkeleton /> : recentFeed.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
            <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <AlertCircle size={20} className="text-green-600" />
            </div>
            <p className="font-semibold text-green-900 text-sm mb-1">No bookings yet</p>
            <p className="text-xs text-gray-400">Activity will appear here once bookings are made.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
            {recentFeed.map(b => (
              <Link key={b.id} to="/admin/bookings"
                className="flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors first:rounded-t-2xl last:rounded-b-2xl"
              >
                <StatusDot status={b.status} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-green-900 truncate">
                      {(b.loved_ones as any)?.full_name || '—'}
                    </p>
                    <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${STATUS_COLORS[b.status] || 'bg-gray-100 text-gray-500'}`}>
                      {b.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5 truncate">
                    {SERVICE_NAMES[b.service_type] || b.service_type}
                    {b.scheduled_at ? ` · ${format(new Date(b.scheduled_at), 'd MMM, h:mm a')}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {!b.companion_id && !['completed', 'cancelled'].includes(b.status) && (
                    <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-lg">
                      NEEDS COMPANION
                    </span>
                  )}
                  {(b.companions as any)?.full_name && (
                    <p className="text-xs text-gray-400 hidden sm:block truncate max-w-[100px]">
                      {(b.companions as any).full_name}
                    </p>
                  )}
                  <ChevronRight size={14} className="text-gray-300" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Quick links */}
      {!loading && (
        <div>
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">Quick access</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { to: '/admin/companions', icon: Activity, label: 'Companions', sub: 'Roster & approvals' },
              { to: '/admin/families', icon: ClipboardList, label: 'Families', sub: 'All registered families' },
              { to: '/admin/payments', icon: Calendar, label: 'Payments', sub: 'Revenue & payouts' },
            ].map(c => (
              <Link key={c.to} to={c.to} className="bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-card-hover transition-shadow group">
                <p className="text-sm font-semibold text-green-900">{c.label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{c.sub}</p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
