import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Calendar, Clock, Activity, CheckCircle, Users, Heart,
  FileText, Wallet, MapPin, ArrowRight, ChevronRight, AlertCircle,
} from 'lucide-react'
import { format } from 'date-fns'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { SERVICE_NAMES, STATUS_COLORS } from '@/lib/booking-labels'

interface Stats {
  totalBookings: number
  pendingBookings: number
  confirmedBookings: number
  activeVisits: number
  completedVisits: number
  companions: number
  families: number
  reports: number
  revenuePaise: number
}

export function AdminHome() {
  const { profile } = useAuth()
  const [stats, setStats] = useState<Stats>({
    totalBookings: 0, pendingBookings: 0, confirmedBookings: 0,
    activeVisits: 0, completedVisits: 0,
    companions: 0, families: 0, reports: 0, revenuePaise: 0,
  })
  const [recentBookings, setRecentBookings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const [bookingsRes, recentRes, companionsRes, familiesRes, reportsRes] = await Promise.all([
        supabase.from('bookings').select('status, payment_status, amount_paise'),
        supabase.from('bookings')
          .select('id, status, service_type, scheduled_at, created_at, loved_ones(full_name), companions(full_name)')
          .order('created_at', { ascending: false })
          .limit(6),
        supabase.from('companions').select('id', { count: 'exact', head: true }),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'family'),
        supabase.from('visit_reports').select('id', { count: 'exact', head: true }),
      ])

      if (bookingsRes.error) throw bookingsRes.error

      const bookings = bookingsRes.data || []
      const revenuePaise = bookings
        .filter(b => b.payment_status === 'paid')
        .reduce((sum, b) => sum + (b.amount_paise || 0), 0)

      setStats({
        totalBookings: bookings.length,
        pendingBookings: bookings.filter(b => b.status === 'pending').length,
        confirmedBookings: bookings.filter(b => b.status === 'confirmed').length,
        activeVisits: bookings.filter(b => b.status === 'in_progress').length,
        completedVisits: bookings.filter(b => b.status === 'completed').length,
        companions: companionsRes.count || 0,
        families: familiesRes.count || 0,
        reports: reportsRes.count || 0,
        revenuePaise,
      })
      setRecentBookings(recentRes.data || [])
    } catch (err) {
      console.error('Admin overview load error:', err)
      setError('Something went wrong — please try again.')
    } finally {
      setLoading(false)
    }
  }

  const firstName = profile?.full_name?.split(' ')[0] || 'Admin'
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const todayStr = format(new Date(), 'EEEE, d MMM')

  const needsAction = stats.pendingBookings + stats.confirmedBookings

  return (
    <div className="space-y-6 animate-fade-in pb-10">

      {/* ── Header ───────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl text-green-900">{greeting}, {firstName}</h1>
          <p className="text-gray-400 text-sm mt-0.5">{todayStr}</p>
        </div>
        <Link
          to="/admin/bookings"
          className="flex-shrink-0 flex items-center gap-1.5 bg-green-800 hover:bg-green-700 text-white text-xs font-semibold px-3.5 py-2 rounded-xl transition-colors"
        >
          <Calendar size={13} /> All bookings
        </Link>
      </div>

      {/* ── Error ────────────────────────────────────────────── */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-4 flex items-center justify-between gap-3">
          {error}
          <button onClick={load} className="font-semibold underline whitespace-nowrap">Retry</button>
        </div>
      )}

      {/* ── Needs attention ──────────────────────────────────── */}
      {!loading && (
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2.5">Needs attention</p>
          <div className="grid grid-cols-2 gap-3">

            {/* Pending / unassigned */}
            <Link to="/admin/bookings" className="group bg-white rounded-2xl border-2 border-amber-200 p-4 sm:p-5 hover:border-amber-400 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                  <Clock size={18} className="text-amber-600" />
                </div>
                {needsAction > 0 && (
                  <span className="w-5 h-5 bg-amber-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                    {needsAction}
                  </span>
                )}
              </div>
              <p className="font-serif text-3xl text-amber-700 leading-none">{needsAction}</p>
              <p className="text-xs font-semibold text-amber-600 mt-1">Awaiting action</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {stats.pendingBookings} pending · {stats.confirmedBookings} to assign
              </p>
              <p className="text-xs text-amber-600 font-semibold mt-3 flex items-center gap-1 group-hover:gap-2 transition-all">
                Review <ArrowRight size={11} />
              </p>
            </Link>

            {/* Active visits */}
            <Link to="/admin/live-map" className="group bg-white rounded-2xl border-2 border-green-200 p-4 sm:p-5 hover:border-green-400 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                  <Activity size={18} className={`text-green-600 ${stats.activeVisits > 0 ? 'animate-pulse' : ''}`} />
                </div>
                {stats.activeVisits > 0 && (
                  <span className="flex items-center gap-1 text-xs font-bold text-green-600">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />LIVE
                  </span>
                )}
              </div>
              <p className="font-serif text-3xl text-green-700 leading-none">{stats.activeVisits}</p>
              <p className="text-xs font-semibold text-green-600 mt-1">Active visits</p>
              <p className="text-xs text-gray-400 mt-0.5">Companions on the ground now</p>
              <p className="text-xs text-green-600 font-semibold mt-3 flex items-center gap-1 group-hover:gap-2 transition-all">
                Live map <ArrowRight size={11} />
              </p>
            </Link>
          </div>
        </div>
      )}

      {/* ── Business metrics ─────────────────────────────────── */}
      {!loading && (
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2.5">Overview</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { icon: Calendar,    label: 'Total bookings',   value: stats.totalBookings,                              href: '/admin/bookings',   iconCls: 'bg-blue-50 text-blue-500' },
              { icon: CheckCircle, label: 'Completed visits',  value: stats.completedVisits,                            href: '/admin/bookings',   iconCls: 'bg-green-50 text-green-600' },
              { icon: Heart,       label: 'Families',          value: stats.families,                                   href: '/admin/families',   iconCls: 'bg-pink-50 text-pink-500' },
              { icon: Users,       label: 'Companions',        value: stats.companions,                                 href: '/admin/companions', iconCls: 'bg-purple-50 text-purple-500' },
            ].map(c => (
              <Link key={c.label} to={c.href} className="bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-sm transition-shadow">
                <div className={`w-8 h-8 ${c.iconCls} rounded-xl flex items-center justify-center mb-3`}>
                  <c.icon size={15} />
                </div>
                <p className="font-serif text-2xl text-green-900 leading-none">{c.value}</p>
                <p className="text-xs text-gray-400 mt-1">{c.label}</p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ── Revenue + reports row ─────────────────────────────── */}
      {!loading && (
        <div className="grid grid-cols-2 gap-3">
          <Link to="/admin/payments" className="bg-gradient-to-br from-green-800 to-green-700 rounded-2xl p-5 text-white hover:from-green-700 hover:to-green-600 transition-colors">
            <div className="w-9 h-9 bg-white/15 rounded-xl flex items-center justify-center mb-3">
              <Wallet size={17} className="text-white" />
            </div>
            <p className="font-serif text-2xl leading-none">
              ₹{(stats.revenuePaise / 100).toLocaleString('en-IN')}
            </p>
            <p className="text-xs text-white/60 mt-1">Total revenue</p>
            <p className="text-xs text-white/80 font-semibold mt-3 flex items-center gap-1">
              Payments <ArrowRight size={11} />
            </p>
          </Link>

          <div className="grid grid-rows-2 gap-3">
            <Link to="/admin/reports" className="bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-sm transition-shadow flex items-center gap-3">
              <div className="w-8 h-8 bg-amber-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <FileText size={15} className="text-amber-500" />
              </div>
              <div>
                <p className="font-serif text-xl text-green-900 leading-none">{stats.reports}</p>
                <p className="text-xs text-gray-400 mt-0.5">Reports</p>
              </div>
            </Link>
            <Link to="/admin/live-map" className="bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-sm transition-shadow flex items-center gap-3">
              <div className="w-8 h-8 bg-green-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <MapPin size={15} className="text-green-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-green-900 leading-tight">Live map</p>
                <p className="text-xs text-gray-400 mt-0.5">Track companions</p>
              </div>
            </Link>
          </div>
        </div>
      )}

      {/* ── Recent bookings feed ──────────────────────────────── */}
      {!loading && recentBookings.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Recent bookings</p>
            <Link to="/admin/bookings" className="text-xs text-green-700 font-semibold hover:underline flex items-center gap-0.5">
              All <ChevronRight size={12} />
            </Link>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
            {recentBookings.map(b => {
              const cfg = STATUS_COLORS[b.status]
              return (
                <Link
                  key={b.id}
                  to="/admin/bookings"
                  className="flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors first:rounded-t-2xl last:rounded-b-2xl"
                >
                  {/* Status dot */}
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    b.status === 'in_progress'        ? 'bg-green-500 animate-pulse' :
                    b.status === 'pending'            ? 'bg-amber-400' :
                    b.status === 'confirmed'          ? 'bg-blue-400' :
                    b.status === 'companion_assigned' ? 'bg-purple-400' :
                    b.status === 'completed'          ? 'bg-green-300' :
                    'bg-gray-300'
                  }`} />

                  {/* Main info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-green-900 truncate">
                        {(b.loved_ones as any)?.full_name || '—'}
                      </p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg || 'bg-gray-100 text-gray-500'}`}>
                        {b.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {SERVICE_NAMES[b.service_type] || b.service_type}
                      {b.scheduled_at ? ` · ${format(new Date(b.scheduled_at), 'd MMM, h:mm a')}` : ''}
                    </p>
                  </div>

                  {/* Companion */}
                  {(b.companions as any)?.full_name && (
                    <p className="text-xs text-gray-400 flex-shrink-0 hidden sm:block truncate max-w-[100px]">
                      {(b.companions as any).full_name}
                    </p>
                  )}

                  <ChevronRight size={14} className="text-gray-300 flex-shrink-0" />
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* ── No data empty state ───────────────────────────────── */}
      {!loading && stats.totalBookings === 0 && (
        <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
          <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <AlertCircle size={20} className="text-green-600" />
          </div>
          <p className="font-semibold text-green-900 mb-1 text-sm">No data yet</p>
          <p className="text-xs text-gray-400">Bookings, companions and families will appear here once activity begins.</p>
        </div>
      )}

      {/* ── Loading skeleton ──────────────────────────────────── */}
      {loading && (
        <div className="space-y-4 animate-pulse">
          <div className="grid grid-cols-2 gap-3">
            <div className="h-36 bg-gray-100 rounded-2xl" />
            <div className="h-36 bg-gray-100 rounded-2xl" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-gray-100 rounded-2xl" />)}
          </div>
          <div className="h-48 bg-gray-100 rounded-2xl" />
        </div>
      )}
    </div>
  )
}
