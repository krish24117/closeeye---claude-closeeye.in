import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Calendar, Heart, FileText, Bell, Plus, ArrowRight,
  AlertTriangle, Phone, BadgeCheck, ChevronLeft, ChevronRight, CreditCard, X,
} from 'lucide-react'
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameDay, isToday, addMonths, subMonths,
} from 'date-fns'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import { StatsSkeleton } from '@/components/ui/Skeleton'
import { PLAN_NAMES, type PlanId } from '@/lib/subscription-plans'

export function DashboardHome() {
  const { profile } = useAuth()

  const [stats, setStats] = useState({ bookings: 0, lovedOnes: 0, reports: 0, unread: 0 })
  const [nextVisit, setNextVisit] = useState<any>(null)
  const [lastVisit, setLastVisit] = useState<any>(null)
  const [companion, setCompanion] = useState<{ companion: any; scheduled_at: string } | null>(null)
  const [upcomingBookings, setUpcomingBookings] = useState<any[]>([])
  const [subscription, setSubscription] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [companionPhotoUrl, setCompanionPhotoUrl] = useState<string | null>(null)

  const [sosOpen, setSosOpen] = useState(false)
  const [sosSending, setSosSending] = useState(false)
  const [sosDone, setSosDone] = useState(false)

  const [calMonth, setCalMonth] = useState(new Date())
  const [calSelected, setCalSelected] = useState<Date | null>(null)

  useEffect(() => { load() }, [])

  useEffect(() => {
    const c = companion?.companion
    if (!c?.photo_url) return
    supabase.storage.from('companion-photos').createSignedUrl(c.photo_url, 3600).then(({ data }) => {
      if (data?.signedUrl) setCompanionPhotoUrl(data.signedUrl)
    })
  }, [companion])

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const now = new Date().toISOString()
      const twoMonthsLater = new Date(Date.now() + 62 * 24 * 60 * 60 * 1000).toISOString()

      const [b, l, r, n, nv, lv, cb, ub, sb] = await Promise.all([
        supabase.from('bookings').select('id', { count: 'exact', head: true }),
        supabase.from('loved_ones').select('id', { count: 'exact', head: true }),
        supabase.from('visit_reports').select('id', { count: 'exact', head: true }),
        supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('read', false),
        supabase.from('bookings')
          .select('id, scheduled_at, loved_ones(full_name)')
          .in('status', ['companion_assigned', 'in_progress'])
          .gte('scheduled_at', now)
          .order('scheduled_at', { ascending: true })
          .limit(1)
          .maybeSingle(),
        supabase.from('bookings')
          .select('id, completed_at, loved_ones(full_name)')
          .eq('status', 'completed')
          .order('completed_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase.from('bookings')
          .select('id, scheduled_at, companions(id, full_name, phone, photo_url, rating, verified)')
          .in('status', ['companion_assigned', 'in_progress'])
          .gte('scheduled_at', now)
          .order('scheduled_at', { ascending: true })
          .limit(1)
          .maybeSingle(),
        supabase.from('bookings')
          .select('id, scheduled_at, status, loved_ones(full_name)')
          .gte('scheduled_at', now)
          .lte('scheduled_at', twoMonthsLater)
          .order('scheduled_at', { ascending: true }),
        supabase.from('subscriptions').select('*').maybeSingle(),
      ])

      const firstError = b.error || l.error || r.error || n.error
      if (firstError) throw firstError

      setStats({ bookings: b.count || 0, lovedOnes: l.count || 0, reports: r.count || 0, unread: n.count || 0 })
      setNextVisit(nv.data || null)
      setLastVisit(lv.data || null)
      setCompanion(cb.data?.companions ? { companion: cb.data.companions, scheduled_at: cb.data.scheduled_at } : null)
      setUpcomingBookings(ub.data || [])
      setSubscription(sb.data || null)
    } catch (err) {
      console.error('Failed to load dashboard stats:', err)
      setError('Something went wrong — please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function sendSos() {
    setSosSending(true)
    try {
      await supabase.functions.invoke('send-sos-alert')
      setSosDone(true)
      setSosOpen(false)
      setTimeout(() => setSosDone(false), 6000)
    } catch {
      // still close the dialog
      setSosOpen(false)
    } finally {
      setSosSending(false)
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

      {/* SOS sent confirmation */}
      {sosDone && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle size={16} className="flex-shrink-0" />
          Emergency alert sent to all family members.
          <button onClick={() => setSosDone(false)} className="ml-auto"><X size={15} /></button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-4 flex items-center justify-between gap-3">
          {error}
          <button onClick={load} className="font-semibold underline whitespace-nowrap">Retry</button>
        </div>
      )}

      {/* Subscription strip */}
      {!loading && (
        subscription && ['active', 'authenticated', 'paused'].includes(subscription.status) ? (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-green-700 rounded-xl flex items-center justify-center flex-shrink-0">
                <CreditCard size={16} className="text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-green-900">
                  {PLAN_NAMES[subscription.plan_id as PlanId]} Plan
                  <span className={`ml-2 text-xs font-normal px-2 py-0.5 rounded-full ${
                    subscription.status === 'active' ? 'bg-green-200 text-green-800' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {subscription.status === 'active' ? 'Active' : subscription.status === 'paused' ? 'Paused' : 'Activating'}
                  </span>
                </p>
                {subscription.next_billing_at && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    Next billing {format(new Date(subscription.next_billing_at), 'd MMM yyyy')}
                  </p>
                )}
              </div>
            </div>
            <Link to="/dashboard/subscription" className="text-xs text-green-700 font-semibold hover:underline whitespace-nowrap">
              Manage →
            </Link>
          </div>
        ) : (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-amber-900">No active plan</p>
              <p className="text-xs text-amber-700 mt-0.5">Subscribe to unlock companion visits</p>
            </div>
            <Link
              to="/dashboard/subscription"
              className="text-xs bg-amber-600 text-white font-semibold px-3 py-2 rounded-xl hover:bg-amber-700 transition-colors whitespace-nowrap"
            >
              View Plans
            </Link>
          </div>
        )
      )}

      {/* Next / Last visit cards */}
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

      {/* Companion card */}
      {!loading && companion && (
        <CompanionCard companion={companion.companion} scheduledAt={companion.scheduled_at} photoUrl={companionPhotoUrl} />
      )}

      {/* Upcoming visits calendar */}
      {!loading && (
        <MiniCalendar
          bookings={upcomingBookings}
          current={calMonth}
          onPrev={() => setCalMonth(d => subMonths(d, 1))}
          onNext={() => setCalMonth(d => addMonths(d, 1))}
          selected={calSelected}
          onSelectDay={setCalSelected}
        />
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

      {/* Welcome callout for new users */}
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
          { label: 'View Visit Reports', href: '/dashboard/reports', icon: FileText, desc: 'Photos and notes from past visits' },
          { label: 'Family Members', href: '/dashboard/members', icon: Heart, desc: 'Add members for visit notifications' },
          { label: 'Notifications', href: '/dashboard/notifications', icon: Bell, desc: `${stats.unread} unread alert${stats.unread !== 1 ? 's' : ''}` },
        ].map(q => (
          <Link key={q.href} to={q.href} className="bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-card transition-shadow group">
            <q.icon size={18} className="text-green-600 mb-2" />
            <p className="font-semibold text-green-900 text-sm mb-1 group-hover:text-green-700 transition-colors">{q.label}</p>
            <p className="text-xs text-gray-400">{q.desc}</p>
          </Link>
        ))}
      </div>

      {/* SOS floating button */}
      <button
        onClick={() => setSosOpen(true)}
        className="fixed bottom-6 right-5 sm:bottom-8 sm:right-7 z-40 w-14 h-14 bg-red-600 hover:bg-red-700 active:scale-95 text-white rounded-full shadow-lg flex items-center justify-center transition-all"
        title="Emergency SOS"
        aria-label="Emergency SOS"
      >
        <AlertTriangle size={22} />
      </button>

      {/* SOS modal */}
      {sosOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-4" onClick={() => setSosOpen(false)}>
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="text-center mb-5">
              <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <AlertTriangle size={28} className="text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-red-700">Emergency SOS</h3>
              <p className="text-sm text-gray-500 mt-2 leading-relaxed">
                This sends an immediate WhatsApp alert to all your family members asking them to contact you.
              </p>
            </div>
            <div className="flex flex-col gap-2.5">
              <button
                onClick={sendSos}
                disabled={sosSending}
                className="w-full bg-red-600 text-white font-bold py-3 rounded-xl hover:bg-red-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {sosSending ? (
                  <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Sending…</>
                ) : (
                  '🚨 Send Emergency Alert'
                )}
              </button>
              <button
                onClick={() => setSosOpen(false)}
                className="w-full border border-gray-200 text-gray-600 py-3 rounded-xl hover:bg-gray-50 transition-colors text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Companion Card ────────────────────────────────────────────────────────────

function CompanionCard({ companion, scheduledAt, photoUrl }: { companion: any; scheduledAt: string; photoUrl: string | null }) {
  const initials = companion.full_name?.[0] || 'C'
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Your assigned companion</p>
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-green-100 flex-shrink-0 overflow-hidden">
          {photoUrl
            ? <img src={photoUrl} alt={companion.full_name} className="w-full h-full object-cover" />
            : <div className="w-full h-full flex items-center justify-center text-green-700 font-bold text-xl">{initials}</div>
          }
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-green-900">{companion.full_name}</p>
            {companion.verified && (
              <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-full font-medium">
                <BadgeCheck size={11} /> Verified
              </span>
            )}
          </div>
          {companion.rating != null && (
            <p className="text-sm text-amber-500 mt-0.5">
              {'★'.repeat(Math.round(companion.rating))}{'☆'.repeat(5 - Math.round(companion.rating))} {companion.rating.toFixed(1)}
            </p>
          )}
          <p className="text-xs text-gray-400 mt-0.5">
            Visit {format(new Date(scheduledAt), 'EEE d MMM · h:mm a')}
          </p>
        </div>
        {companion.phone && (
          <a
            href={`tel:${companion.phone}`}
            className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center text-green-600 hover:bg-green-100 transition-colors flex-shrink-0"
            title={`Call ${companion.full_name}`}
          >
            <Phone size={17} />
          </a>
        )}
      </div>
    </div>
  )
}

// ── Mini Calendar ─────────────────────────────────────────────────────────────

function MiniCalendar({
  bookings, current, onPrev, onNext, selected, onSelectDay,
}: {
  bookings: any[]
  current: Date
  onPrev: () => void
  onNext: () => void
  selected: Date | null
  onSelectDay: (d: Date | null) => void
}) {
  const days = useMemo(() => {
    const monthStart = startOfMonth(current)
    const monthEnd = endOfMonth(current)
    return eachDayOfInterval({ start: startOfWeek(monthStart), end: endOfWeek(monthEnd) })
  }, [current])

  const byDate = useMemo(() => {
    const map: Record<string, any[]> = {}
    for (const b of bookings) {
      if (!b.scheduled_at) continue
      const key = format(new Date(b.scheduled_at), 'yyyy-MM-dd')
      map[key] = [...(map[key] || []), b]
    }
    return map
  }, [bookings])

  const selectedBookings = selected
    ? bookings.filter(b => b.scheduled_at && isSameDay(new Date(b.scheduled_at), selected))
    : []

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-green-900 text-sm">{format(current, 'MMMM yyyy')}</h3>
        <div className="flex gap-1">
          <button onClick={onPrev} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600">
            <ChevronLeft size={15} />
          </button>
          <button onClick={onNext} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600">
            <ChevronRight size={15} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 mb-1">
        {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
          <div key={d} className="text-center text-xs font-semibold text-gray-300 py-1">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {days.map(day => {
          const key = format(day, 'yyyy-MM-dd')
          const dayBookings = byDate[key] || []
          const inMonth = day.getMonth() === current.getMonth()
          const today = isToday(day)
          const isSelected = selected && isSameDay(day, selected)

          return (
            <button
              key={key}
              onClick={() => {
                if (dayBookings.length > 0 && inMonth) onSelectDay(isSelected ? null : day)
              }}
              className={[
                'relative flex flex-col items-center justify-center aspect-square rounded-xl text-xs transition-colors',
                inMonth ? 'text-gray-700' : 'text-gray-200',
                today ? 'ring-2 ring-green-500 ring-inset font-bold text-green-700' : '',
                isSelected ? 'bg-green-100' : dayBookings.length > 0 && inMonth ? 'hover:bg-green-50 cursor-pointer' : 'cursor-default',
              ].join(' ')}
            >
              <span>{format(day, 'd')}</span>
              {dayBookings.length > 0 && inMonth && (
                <span className="absolute bottom-1 w-1 h-1 bg-green-500 rounded-full" />
              )}
            </button>
          )
        })}
      </div>

      {selected && selectedBookings.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
          <p className="text-xs font-semibold text-gray-400">{format(selected, 'EEEE, d MMMM')}</p>
          {selectedBookings.map(b => (
            <div key={b.id} className="flex items-center gap-3 p-3 bg-green-50 rounded-xl">
              <div className="w-8 h-8 bg-green-200 rounded-lg flex items-center justify-center flex-shrink-0">
                <Calendar size={13} className="text-green-700" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-green-900 truncate">{(b.loved_ones as any)?.full_name}</p>
                <p className="text-xs text-gray-500">{format(new Date(b.scheduled_at), 'h:mm a')}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
