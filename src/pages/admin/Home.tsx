import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Calendar, Clock, Activity, CheckCircle, Users, Heart, FileText, Wallet, ArrowRight, MapPin } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { StatsSkeleton } from '@/components/ui/Skeleton'

export function AdminHome() {
  const [stats, setStats] = useState({
    totalBookings: 0,
    pendingBookings: 0,
    activeVisits: 0,
    completedVisits: 0,
    companions: 0,
    families: 0,
    reports: 0,
    revenuePaise: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const [bookingsRes, companionsRes, familiesRes, reportsRes] = await Promise.all([
        supabase.from('bookings').select('status,payment_status,amount_paise'),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'companion'),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'family'),
        supabase.from('visit_reports').select('id', { count: 'exact', head: true }),
      ])
      const firstError = bookingsRes.error || companionsRes.error || familiesRes.error || reportsRes.error
      if (firstError) throw firstError

      const bookings = bookingsRes.data || []
      const revenuePaise = bookings
        .filter(b => b.payment_status === 'paid')
        .reduce((sum, b) => sum + (b.amount_paise || 0), 0)

      setStats({
        totalBookings: bookings.length,
        pendingBookings: bookings.filter(b => b.status === 'pending').length,
        activeVisits: bookings.filter(b => b.status === 'in_progress').length,
        completedVisits: bookings.filter(b => b.status === 'completed').length,
        companions: companionsRes.count || 0,
        families: familiesRes.count || 0,
        reports: reportsRes.count || 0,
        revenuePaise,
      })
    } catch (err) {
      console.error('Failed to load admin stats:', err)
      setError('Something went wrong — please try again.')
    } finally {
      setLoading(false)
    }
  }

  const cardColor = 'bg-[#e8f5e9] text-[#2d6a4f]'
  const cards = [
    { icon: Calendar, label: 'Total Bookings', value: stats.totalBookings, href: '/admin/bookings', color: cardColor },
    { icon: Clock, label: 'Pending Bookings', value: stats.pendingBookings, href: '/admin/bookings', color: cardColor },
    { icon: Activity, label: 'Active Visits', value: stats.activeVisits, href: '/admin/live-map', color: cardColor },
    { icon: CheckCircle, label: 'Completed Visits', value: stats.completedVisits, href: '/admin/bookings', color: cardColor },
    { icon: Users, label: 'Companions', value: stats.companions, href: '/admin/companions', color: cardColor },
    { icon: Heart, label: 'Families', value: stats.families, href: '/admin/families', color: cardColor },
    { icon: FileText, label: 'Visit Reports', value: stats.reports, href: '/admin/reports', color: cardColor },
    { icon: Wallet, label: 'Total Revenue', value: `₹${(stats.revenuePaise / 100).toLocaleString('en-IN')}`, href: '/admin/payments', color: cardColor },
  ]

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in">
      <div>
        <h1 className="font-serif text-2xl text-green-900">Overview</h1>
        <p className="text-gray-400 text-sm mt-1">A snapshot of bookings, companions, and families.</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-4 flex items-center justify-between gap-3">
          {error}
          <button onClick={load} className="font-semibold underline whitespace-nowrap">Retry</button>
        </div>
      )}

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

      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: 'All Bookings', href: '/admin/bookings', icon: Calendar, desc: 'Assign companions and manage status' },
          { label: 'Manage Companions', href: '/admin/companions', icon: Users, desc: 'Approve, promote, or remove companions' },
          { label: 'Live Map', href: '/admin/live-map', icon: MapPin, desc: 'See companions on active visits' },
        ].map(q => (
          <Link key={q.href} to={q.href} className="bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-card transition-shadow group">
            <q.icon size={18} className="text-green-600 mb-2" />
            <p className="font-semibold text-green-900 text-sm mb-1 group-hover:text-green-700 transition-colors">{q.label}</p>
            <p className="text-xs text-gray-400 flex items-center gap-1">{q.desc} <ArrowRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" /></p>
          </Link>
        ))}
      </div>
    </div>
  )
}
