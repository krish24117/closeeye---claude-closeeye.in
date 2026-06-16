import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Calendar, Heart, FileText, Bell, Plus, ArrowRight } from 'lucide-react'
import { format } from 'date-fns'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import { StatsSkeleton } from '@/components/ui/Skeleton'

export function DashboardHome() {
  const { profile } = useAuth()
  const [stats, setStats] = useState({ bookings: 0, lovedOnes: 0, reports: 0, unread: 0 })
  const [nextVisit, setNextVisit] = useState<any>(null)
  const [lastVisit, setLastVisit] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const [b, l, r, n, nv, lv] = await Promise.all([
        supabase.from('bookings').select('id', { count: 'exact', head: true }),
        supabase.from('loved_ones').select('id', { count: 'exact', head: true }),
        supabase.from('visit_reports').select('id', { count: 'exact', head: true }),
        supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('read', false),
        supabase.from('bookings')
          .select('id,scheduled_at,loved_ones(full_name)')
          .in('status', ['companion_assigned', 'in_progress'])
          .gte('scheduled_at', new Date().toISOString())
          .order('scheduled_at', { ascending: true })
          .limit(1)
          .maybeSingle(),
        supabase.from('bookings')
          .select('id,completed_at,loved_ones(full_name)')
          .eq('status', 'completed')
          .order('completed_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ])
      const firstError = b.error || l.error || r.error || n.error
      if (firstError) throw firstError
      setStats({ bookings: b.count || 0, lovedOnes: l.count || 0, reports: r.count || 0, unread: n.count || 0 })
      setNextVisit(nv.data || null)
      setLastVisit(lv.data || null)
    } catch (err) {
      console.error('Failed to load dashboard stats:', err)
      setError('Something went wrong — please try again.')
    } finally {
      setLoading(false)
    }
  }

  const cards = [
    { icon: Calendar, label: 'Total Bookings', value: stats.bookings, href: '/dashboard/bookings', color: 'bg-blue-50 text-blue-700' },
    { icon: Heart, label: 'Loved Ones', value: stats.lovedOnes, href: '/dashboard/loved-ones', color: 'bg-pink-50 text-pink-700' },
    { icon: FileText, label: 'Visit Reports', value: stats.reports, href: '/dashboard/reports', color: 'bg-amber-50 text-amber-700' },
    { icon: Bell, label: 'Unread Alerts', value: stats.unread, href: '/dashboard/notifications', color: 'bg-green-50 text-green-700' },
  ]

  const firstName = profile?.full_name?.split(' ')[0] || 'there'

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="font-serif text-xl sm:text-2xl text-green-900">{greeting}, {firstName} 👋</h1>
        <p className="text-gray-400 text-sm mt-1">Here's how your family is doing.</p>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-4 flex items-center justify-between gap-3">
          {error}
          <button onClick={load} className="font-semibold underline whitespace-nowrap">Retry</button>
        </div>
      )}

      {/* At a glance — next & last visit */}
      {!loading && (nextVisit || lastVisit) && (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Next visit</p>
            {nextVisit ? (
              <>
                <p className="font-semibold text-green-900 text-sm">{(nextVisit.loved_ones as any)?.full_name}</p>
                <p className="text-xs text-gray-500 mt-0.5">{format(new Date(nextVisit.scheduled_at), 'EEE d MMM · h:mm a')}</p>
              </>
            ) : (
              <p className="text-xs text-gray-400">No upcoming visits</p>
            )}
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Last visit</p>
            {lastVisit ? (
              <>
                <p className="font-semibold text-green-900 text-sm">{(lastVisit.loved_ones as any)?.full_name}</p>
                <p className="text-xs text-gray-500 mt-0.5">{lastVisit.completed_at ? format(new Date(lastVisit.completed_at), 'd MMM yyyy') : '—'}</p>
              </>
            ) : (
              <p className="text-xs text-gray-400">No visits yet</p>
            )}
          </div>
        </div>
      )}

      {/* Stats */}
      {loading ? <StatsSkeleton /> : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {cards.map(c => (
            <Link key={c.label} to={c.href} className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-100 hover:shadow-card transition-shadow">
              <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center mb-3 ${c.color}`}>
                <c.icon size={17} />
              </div>
              <p className="font-serif text-2xl sm:text-3xl text-green-900">{c.value}</p>
              <p className="text-xs text-gray-400 mt-1">{c.label}</p>
            </Link>
          ))}
        </div>
      )}

      {/* Empty state for new users */}
      {!loading && stats.lovedOnes === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 sm:p-6">
          <p className="font-semibold text-amber-900 mb-1 text-sm">👋 Welcome to Close Eye!</p>
          <p className="text-sm text-amber-700 mb-4">Start by adding your loved one's profile so we can match the right companion for them.</p>
          <Link
            to="/dashboard/loved-ones"
            className="inline-flex items-center gap-2 bg-amber-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-amber-700 transition-colors"
          >
            <Plus size={16} /> Add your loved one
          </Link>
        </div>
      )}

      {/* Book a visit CTA */}
      <div className="bg-gradient-to-br from-green-800 to-green-700 rounded-2xl p-5 sm:p-7 text-white">
        <h2 className="font-serif text-lg sm:text-xl mb-2">Book a visit</h2>
        <p className="text-white/65 text-sm mb-5">Schedule a companion visit, hospital trip, or emergency support.</p>
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            to="/dashboard/new-booking"
            className="inline-flex items-center justify-center gap-2 bg-white text-green-900 font-semibold text-sm px-5 py-2.5 rounded-xl hover:bg-green-50 transition-colors"
          >
            <Plus size={16} /> New booking
          </Link>
          <Link
            to="/dashboard/bookings"
            className="inline-flex items-center justify-center gap-2 border border-white/30 text-white text-sm font-medium px-5 py-2.5 rounded-xl hover:bg-white/10 transition-colors"
          >
            View all bookings <ArrowRight size={14} />
          </Link>
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: 'View Visit Reports', href: '/dashboard/reports', icon: FileText, desc: 'See photos and notes from past visits' },
          { label: 'Manage Loved Ones', href: '/dashboard/loved-ones', icon: Heart, desc: 'Add or update family member profiles' },
          { label: 'Notifications', href: '/dashboard/notifications', icon: Bell, desc: `${stats.unread} unread alert${stats.unread !== 1 ? 's' : ''}` },
        ].map(q => (
          <Link key={q.href} to={q.href} className="bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-card transition-shadow group">
            <q.icon size={18} className="text-green-600 mb-2" />
            <p className="font-semibold text-green-900 text-sm mb-1 group-hover:text-green-700 transition-colors">{q.label}</p>
            <p className="text-xs text-gray-400">{q.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
