import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Calendar, Heart, FileText, Bell, Plus,
  AlertTriangle, Phone, BadgeCheck, X, ChevronRight,
  Clock, MapPin, ArrowRight, CreditCard, CheckCircle,
} from 'lucide-react'
import { format, formatDistanceToNow, differenceInDays } from 'date-fns'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import { PLAN_NAMES, type PlanId } from '@/lib/subscription-plans'

export function DashboardHome() {
  const { profile } = useAuth()

  const [lovedOnes, setLovedOnes] = useState<any[]>([])
  const [stats, setStats] = useState({ bookings: 0, reports: 0, unread: 0 })
  const [nextVisit, setNextVisit] = useState<any>(null)
  const [lastVisit, setLastVisit] = useState<any>(null)
  const [companion, setCompanion] = useState<{ companion: any; scheduled_at: string } | null>(null)
  const [subscription, setSubscription] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [companionPhotoUrl, setCompanionPhotoUrl] = useState<string | null>(null)

  const [sosOpen, setSosOpen] = useState(false)
  const [sosSending, setSosSending] = useState(false)
  const [sosDone, setSosDone] = useState(false)

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

      const [loRes, bCount, rCount, nCount, nvRes, lvRes, cbRes, sbRes] = await Promise.all([
        supabase.from('loved_ones').select('id, full_name, city').order('full_name'),
        supabase.from('bookings').select('id', { count: 'exact', head: true }),
        supabase.from('visit_reports').select('id', { count: 'exact', head: true }),
        supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('read', false),
        supabase.from('bookings')
          .select('id, scheduled_at, status, loved_ones(full_name)')
          .in('status', ['pending', 'confirmed', 'companion_assigned', 'in_progress'])
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
        supabase.from('subscriptions').select('*').maybeSingle(),
      ])

      if (bCount.error || rCount.error || nCount.error) throw bCount.error || rCount.error || nCount.error

      setLovedOnes(loRes.data || [])
      setStats({ bookings: bCount.count || 0, reports: rCount.count || 0, unread: nCount.count || 0 })
      setNextVisit(nvRes.data || null)
      setLastVisit(lvRes.data || null)
      setCompanion(cbRes.data?.companions ? { companion: cbRes.data.companions, scheduled_at: cbRes.data.scheduled_at } : null)
      setSubscription(sbRes.data || null)
    } catch (err) {
      console.error('Dashboard load error:', err)
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
      setSosOpen(false)
    } finally {
      setSosSending(false)
    }
  }

  const firstName = profile?.full_name?.split(' ')[0] || 'there'
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const daysUntilNext = nextVisit ? differenceInDays(new Date(nextVisit.scheduled_at), new Date()) : null
  const isNewUser = !loading && lovedOnes.length === 0

  return (
    <div className="space-y-4 animate-fade-in" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 6rem)' }}>

      {/* ── Greeting ───────────────────────────────────────── */}
      <div className="pt-1">
        <h1 className="font-serif text-2xl text-green-900">{greeting}, {firstName}</h1>
        <p className="text-gray-400 text-sm mt-0.5">
          {isNewUser ? "Welcome to Close Eye — let's get started." : "Here's your family's wellbeing at a glance."}
        </p>
      </div>

      {/* ── Alerts ─────────────────────────────────────────── */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-4 flex items-center justify-between gap-3">
          {error}
          <button onClick={load} className="font-semibold underline whitespace-nowrap">Retry</button>
        </div>
      )}
      {sosDone && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle size={16} className="flex-shrink-0" />
          Emergency alert sent to all family members.
          <button onClick={() => setSosDone(false)} className="ml-auto"><X size={15} /></button>
        </div>
      )}

      {/* ── New-user onboarding ─────────────────────────────── */}
      {isNewUser && (
        <div className="bg-gradient-to-br from-green-800 to-green-700 rounded-2xl p-6 text-white">
          <div className="w-12 h-12 bg-white/15 rounded-2xl flex items-center justify-center mb-4">
            <Heart size={22} className="text-white" />
          </div>
          <h2 className="font-serif text-xl mb-2">Add your loved one</h2>
          <p className="text-white/70 text-sm leading-relaxed mb-5">
            Start by adding your parent or family member's profile — we'll match the right companion for them.
          </p>
          <Link
            to="/dashboard/loved-ones"
            className="inline-flex items-center gap-2 bg-white text-green-900 font-semibold text-sm px-5 py-2.5 rounded-xl hover:bg-green-50 transition-colors"
          >
            <Plus size={16} /> Add loved one
          </Link>
        </div>
      )}

      {/* ── Loved ones row ─────────────────────────────────── */}
      {!loading && lovedOnes.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Your loved ones</p>
            <Link to="/dashboard/loved-ones" className="text-xs text-green-700 font-semibold hover:underline">
              Manage →
            </Link>
          </div>
          <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-hide">
            {lovedOnes.map(lo => (
              <div
                key={lo.id}
                className="flex-shrink-0 bg-white rounded-2xl border border-gray-100 px-4 py-3 flex items-center gap-3 min-w-[170px]"
              >
                <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-green-700 font-bold text-lg">{lo.full_name?.[0]}</span>
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-green-900 text-sm truncate leading-tight">{lo.full_name}</p>
                  {lo.city && (
                    <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                      <MapPin size={10} className="flex-shrink-0" />{lo.city}
                    </p>
                  )}
                </div>
              </div>
            ))}
            <Link
              to="/dashboard/loved-ones"
              className="flex-shrink-0 w-14 bg-gray-50 hover:bg-gray-100 border border-dashed border-gray-200 rounded-2xl flex items-center justify-center transition-colors"
            >
              <Plus size={18} className="text-gray-400" />
            </Link>
          </div>
        </div>
      )}

      {/* ── Next visit card ─────────────────────────────────── */}
      {!loading && (
        nextVisit ? (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            {/* Header strip */}
            <div className={`px-5 py-3 flex items-center justify-between ${
              daysUntilNext === 0 ? 'bg-green-700' :
              daysUntilNext !== null && daysUntilNext <= 2 ? 'bg-green-600' : 'bg-green-50'
            }`}>
              <p className={`text-xs font-semibold uppercase tracking-wider ${
                daysUntilNext !== null && daysUntilNext <= 2 ? 'text-white/80' : 'text-green-700'
              }`}>
                Next visit
              </p>
              {daysUntilNext !== null && (
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                  daysUntilNext <= 2
                    ? 'bg-white/20 text-white'
                    : 'bg-green-100 text-green-700'
                }`}>
                  {daysUntilNext === 0 ? 'Today' : daysUntilNext === 1 ? 'Tomorrow' : `In ${daysUntilNext} days`}
                </span>
              )}
            </div>

            {/* Body */}
            <div className="p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-green-900 text-base leading-tight">
                    {(nextVisit.loved_ones as any)?.full_name}
                  </p>
                  <p className="text-sm text-gray-500 mt-1 flex items-center gap-1.5">
                    <Clock size={13} className="flex-shrink-0" />
                    {format(new Date(nextVisit.scheduled_at), 'EEE, d MMM · h:mm a')}
                  </p>
                  <VisitStatusBadge status={nextVisit.status} />
                </div>
                <Link
                  to="/dashboard/bookings"
                  className="flex items-center gap-0.5 text-xs text-green-700 font-semibold hover:underline mt-1 flex-shrink-0"
                >
                  All <ChevronRight size={13} />
                </Link>
              </div>

              {/* Companion row */}
              {companion && (
                <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-green-100 flex-shrink-0 overflow-hidden">
                    {companionPhotoUrl
                      ? <img src={companionPhotoUrl} alt={companion.companion.full_name} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-green-700 font-bold text-base">{companion.companion.full_name?.[0]}</div>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-sm font-semibold text-green-900 truncate">{companion.companion.full_name}</p>
                      {companion.companion.verified && (
                        <span className="inline-flex items-center gap-0.5 bg-blue-50 text-blue-600 text-xs px-1.5 py-0.5 rounded-full font-medium flex-shrink-0">
                          <BadgeCheck size={10} /> Verified
                        </span>
                      )}
                    </div>
                    {companion.companion.rating != null && (
                      <p className="text-xs text-amber-500 mt-0.5">
                        {'★'.repeat(Math.round(companion.companion.rating))}{'☆'.repeat(5 - Math.round(companion.companion.rating))}
                        <span className="text-gray-400 ml-1">{companion.companion.rating.toFixed(1)}</span>
                      </p>
                    )}
                  </div>
                  {companion.companion.phone && (
                    <a
                      href={`tel:${companion.companion.phone}`}
                      className="w-9 h-9 bg-green-50 hover:bg-green-100 rounded-xl flex items-center justify-center text-green-600 transition-colors flex-shrink-0"
                      title={`Call ${companion.companion.full_name}`}
                    >
                      <Phone size={16} />
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : !isNewUser ? (
          /* No upcoming visits nudge */
          <div className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center flex-shrink-0">
              <Calendar size={20} className="text-amber-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-green-900 text-sm">No upcoming visits</p>
              <p className="text-xs text-gray-400 mt-0.5">Schedule a visit to keep your loved ones checked on.</p>
            </div>
            <Link
              to="/dashboard/new-booking"
              className="flex-shrink-0 bg-green-800 hover:bg-green-700 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-colors"
            >
              Book now
            </Link>
          </div>
        ) : null
      )}

      {/* ── Last visit + stat row ───────────────────────────── */}
      {!loading && !isNewUser && (
        <div className="grid grid-cols-3 gap-3">
          <Link to="/dashboard/bookings" className="bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-sm transition-shadow">
            <div className="w-8 h-8 bg-blue-50 rounded-xl flex items-center justify-center mb-3">
              <Calendar size={15} className="text-blue-500" />
            </div>
            <p className="font-serif text-2xl text-green-900 leading-none">{stats.bookings}</p>
            <p className="text-xs text-gray-400 mt-1">Bookings</p>
          </Link>
          <Link to="/dashboard/reports" className="bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-sm transition-shadow">
            <div className="w-8 h-8 bg-amber-50 rounded-xl flex items-center justify-center mb-3">
              <FileText size={15} className="text-amber-500" />
            </div>
            <p className="font-serif text-2xl text-green-900 leading-none">{stats.reports}</p>
            <p className="text-xs text-gray-400 mt-1">Reports</p>
          </Link>
          <Link to="/dashboard/notifications" className="relative bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-sm transition-shadow">
            {stats.unread > 0 && (
              <span className="absolute top-3 right-3 w-2 h-2 bg-red-500 rounded-full" />
            )}
            <div className="w-8 h-8 bg-green-50 rounded-xl flex items-center justify-center mb-3">
              <Bell size={15} className="text-green-600" />
            </div>
            <p className="font-serif text-2xl text-green-900 leading-none">{stats.unread}</p>
            <p className="text-xs text-gray-400 mt-1">Unread</p>
          </Link>
        </div>
      )}

      {/* ── Last completed visit ────────────────────────────── */}
      {!loading && lastVisit && (
        <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center flex-shrink-0">
            <CheckCircle size={18} className="text-emerald-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-400 font-medium">Last completed visit</p>
            <p className="text-sm font-semibold text-green-900 mt-0.5 truncate">
              {(lastVisit.loved_ones as any)?.full_name}
            </p>
            <p className="text-xs text-gray-400">
              {lastVisit.completed_at
                ? formatDistanceToNow(new Date(lastVisit.completed_at), { addSuffix: true })
                : 'Date unknown'}
            </p>
          </div>
          <Link to="/dashboard/reports" className="flex items-center gap-1 text-xs text-green-700 font-semibold hover:underline flex-shrink-0">
            View report <ArrowRight size={12} />
          </Link>
        </div>
      )}

      {/* ── Book a visit CTA ────────────────────────────────── */}
      {!isNewUser && (
        <Link
          to="/dashboard/new-booking"
          className="flex items-center justify-between bg-green-800 hover:bg-green-700 rounded-2xl p-5 text-white transition-colors group"
        >
          <div>
            <p className="font-serif text-lg leading-tight">Book a visit</p>
            <p className="text-white/55 text-xs mt-1">UPI · Cards · Net Banking accepted</p>
          </div>
          <div className="w-11 h-11 bg-white/15 group-hover:bg-white/25 rounded-xl flex items-center justify-center transition-colors flex-shrink-0">
            <Plus size={20} />
          </div>
        </Link>
      )}

      {/* ── Subscription strip ──────────────────────────────── */}
      {!loading && (
        subscription && ['active', 'authenticated', 'paused'].includes(subscription.status) ? (
          <div className="bg-green-50 border border-green-100 rounded-2xl p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-green-700 rounded-xl flex items-center justify-center flex-shrink-0">
                <CreditCard size={15} className="text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-green-900">
                  {PLAN_NAMES[subscription.plan_id as PlanId]}
                  <span className={`ml-2 text-xs font-normal px-1.5 py-0.5 rounded-full ${
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
        ) : !isNewUser ? (
          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-amber-900">No active plan</p>
              <p className="text-xs text-amber-600 mt-0.5">Subscribe to unlock companion visits</p>
            </div>
            <Link
              to="/dashboard/subscription"
              className="text-xs bg-amber-600 hover:bg-amber-700 text-white font-semibold px-3.5 py-2 rounded-xl transition-colors whitespace-nowrap"
            >
              View Plans
            </Link>
          </div>
        ) : null
      )}

      {/* ── Quick links ─────────────────────────────────────── */}
      {!isNewUser && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Reports', href: '/dashboard/reports', icon: FileText, desc: 'Visit notes & photos', color: 'bg-amber-50 text-amber-500' },
            { label: 'Family', href: '/dashboard/members', icon: Heart, desc: 'Notification members', color: 'bg-pink-50 text-pink-500' },
            { label: 'Bookings', href: '/dashboard/bookings', icon: Calendar, desc: 'Visit history', color: 'bg-blue-50 text-blue-500' },
          ].map(q => (
            <Link
              key={q.href}
              to={q.href}
              className="bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-sm transition-shadow group text-center"
            >
              <div className={`w-9 h-9 ${q.color} rounded-xl flex items-center justify-center mx-auto mb-2.5`}>
                <q.icon size={16} />
              </div>
              <p className="font-semibold text-green-900 text-xs group-hover:text-green-700 transition-colors">{q.label}</p>
              <p className="text-xs text-gray-400 mt-0.5 leading-snug">{q.desc}</p>
            </Link>
          ))}
        </div>
      )}

      {/* ── SOS button ──────────────────────────────────────── */}
      <button
        onClick={() => setSosOpen(true)}
        className="fixed z-40 w-14 h-14 bg-red-600 hover:bg-red-700 active:scale-95 text-white rounded-full shadow-lg flex items-center justify-center transition-all"
        style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 1.5rem)', right: '1.25rem' }}
        title="Emergency SOS"
        aria-label="Emergency SOS"
      >
        <AlertTriangle size={22} />
      </button>

      {/* ── SOS modal ───────────────────────────────────────── */}
      {sosOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center"
          style={{ padding: '1rem 1rem calc(env(safe-area-inset-bottom, 0px) + 1rem)' }}
          onClick={() => setSosOpen(false)}
        >
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

// ── Visit status badge ────────────────────────────────────────────────────────

function VisitStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    pending:            { label: 'Payment received — awaiting companion', cls: 'bg-amber-50 text-amber-700' },
    confirmed:          { label: 'Confirmed', cls: 'bg-blue-50 text-blue-700' },
    companion_assigned: { label: 'Companion assigned', cls: 'bg-green-100 text-green-700' },
    in_progress:        { label: 'Visit in progress', cls: 'bg-green-700 text-white' },
  }
  const s = map[status]
  if (!s) return null
  return (
    <span className={`mt-2 inline-block text-xs px-2 py-0.5 rounded-full font-medium ${s.cls}`}>
      {s.label}
    </span>
  )
}
