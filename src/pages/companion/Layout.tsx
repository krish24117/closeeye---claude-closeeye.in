// src/pages/companion/Layout.tsx
// Mobile-first PWA shell for companions: fixed forest top bar + 4-tab bottom
// nav. On visit-detail routes the chrome is hidden so the visit flow is fully
// immersive (it renders its own header). Live GPS tracking for an in-progress
// visit and realtime new-assignment notifications run here at the shell level.
import { Outlet, NavLink, useNavigate, useLocation, Link } from 'react-router-dom'
import { useState, useEffect, useCallback } from 'react'
import { TbCalendarEvent, TbWalk, TbWheelchair, TbUser, TbBell, TbCalendarPlus, TbArrowRight } from 'react-icons/tb'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import { useGeolocation } from '@/lib/useGeolocation'
import { initialsOf } from './_shared'

const NAV = [
  { to: '/companion',              icon: TbCalendarEvent, label: 'Today',  match: (p: string) => p === '/companion' },
  { to: '/companion/visit/active', icon: TbWalk,          label: 'Visit',  match: (p: string) => p.startsWith('/companion/visit') },
  { to: '/companion/elders',       icon: TbWheelchair,    label: 'Elders', match: (p: string) => p.startsWith('/companion/elder') },
  { to: '/companion/me',           icon: TbUser,          label: 'Me',     match: (p: string) => p === '/companion/me' || p === '/companion/profile' },
]

export function CompanionLayout() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [activeBookingId, setActiveBookingId] = useState<string | null>(null)
  const [hasNew, setHasNew] = useState(false)
  const [banner, setBanner] = useState<{ name: string; id: string } | null>(null)

  // Visit-detail routes (/companion/visit/<anything>) render immersively.
  const hideChrome = /^\/companion\/visit\//.test(location.pathname)

  const checkActiveBooking = useCallback(async () => {
    if (!user) { setActiveBookingId(null); return }
    const { data, error } = await supabase.from('bookings')
      .select('id')
      .eq('companion_id', user.id)
      .eq('status', 'in_progress')
      .is('checked_out_at', null)
      .limit(1)
      .maybeSingle()
    if (error) { console.error('Failed to check active visit:', error); return }
    setActiveBookingId(data?.id ?? null)
  }, [user])

  useEffect(() => { checkActiveBooking() }, [checkActiveBooking, location.pathname])

  useEffect(() => {
    window.addEventListener('closeeye:active-booking-changed', checkActiveBooking)
    return () => window.removeEventListener('closeeye:active-booking-changed', checkActiveBooking)
  }, [checkActiveBooking])

  // Realtime: new visit assignments → bell dot + slide-down banner.
  useEffect(() => {
    if (!user) return
    const ch = supabase.channel(`companion-shell-${user.id}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'bookings', filter: `companion_id=eq.${user.id}` },
        async (payload) => {
          const row = payload.new as { id?: string; status?: string; loved_one_id?: string } | null
          checkActiveBooking()
          if (row?.status === 'companion_assigned' && row.id) {
            let name = 'a family'
            if (row.loved_one_id) {
              const { data } = await supabase.from('loved_ones').select('full_name').eq('id', row.loved_one_id).maybeSingle()
              if (data?.full_name) name = data.full_name
            }
            setHasNew(true)
            setBanner({ name, id: row.id })
          }
        })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [user, checkActiveBooking])

  // Auto-dismiss the banner after 5s.
  useEffect(() => {
    if (!banner) return
    const t = setTimeout(() => setBanner(null), 5000)
    return () => clearTimeout(t)
  }, [banner])

  // Live location upload while a visit is in progress (powers admin live map).
  const handleLocationUpdate = useCallback(async (pos: { lat: number; lng: number }) => {
    if (!user || !activeBookingId) return
    const { error } = await supabase.from('companion_locations').upsert({
      companion_id: user.id, booking_id: activeBookingId,
      lat: pos.lat, lng: pos.lng, updated_at: new Date().toISOString(),
    })
    if (error) console.error('Failed to update location:', error)
  }, [user, activeBookingId])

  useGeolocation(activeBookingId !== null, handleLocationUpdate, 12000)

  const initials = initialsOf(profile?.full_name)

  // Immersive visit flow — no shell chrome, but keep tracking alive above.
  if (hideChrome) {
    return <div className="min-h-screen bg-[#F5F5F7]"><Outlet /></div>
  }

  return (
    <div className="ce-comp-shell">
      {/* ── Top bar ───────────────────────────────────────────────────── */}
      <header className="ce-comp-top">
        <Link to="/companion" aria-label="Close Eye companion home"
          className="w-[26px] h-[26px] rounded-full bg-white/15 flex items-center justify-center flex-shrink-0">
          <span className="text-[12px] font-bold text-[#A8D5B5] leading-none">CE</span>
        </Link>

        <div className="flex flex-col items-center gap-px">
          <span className="text-[14px] font-semibold text-white leading-none">close eye</span>
          <span className="text-[10px] text-white/50 leading-none mt-0.5">companion</span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => { setHasNew(false); navigate('/companion') }}
            className="relative p-0.5 text-white" aria-label="Notifications"
          >
            <TbBell size={20} />
            {hasNew && <span className="absolute -top-px -right-px w-[7px] h-[7px] rounded-full bg-[#EF4444]" />}
          </button>
          <Link to="/companion/me" aria-label="My profile"
            className="w-[30px] h-[30px] rounded-full bg-[#A8D5B5]/15 border-[1.5px] border-[#A8D5B5] flex items-center justify-center flex-shrink-0">
            <span className="text-[11px] font-bold text-[#A8D5B5] leading-none">{initials}</span>
          </Link>
        </div>
      </header>

      {/* ── New-assignment banner ─────────────────────────────────────── */}
      {banner && (
        <div className="fixed left-1/2 -translate-x-1/2 w-full max-w-[480px] px-4 z-[200]"
          style={{ top: 'calc(60px + env(safe-area-inset-top))' }}>
          <button
            onClick={() => { setBanner(null); navigate(`/companion/visit/${banner.id}`) }}
            className="ce-comp-banner w-full bg-[#1B4332] rounded-b-2xl px-4 py-3 flex items-center gap-3 text-left shadow-lg"
          >
            <TbCalendarPlus size={18} className="text-[#A8D5B5] flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-bold text-white leading-tight">New visit assigned</p>
              <p className="text-[12px] text-white/70 truncate">{banner.name}</p>
            </div>
            <span className="text-[12px] font-semibold text-[#A8D5B5] flex items-center gap-0.5 flex-shrink-0">
              View <TbArrowRight size={13} />
            </span>
          </button>
        </div>
      )}

      {/* ── Content ───────────────────────────────────────────────────── */}
      <main className="ce-comp-main">
        <Outlet />
      </main>

      {/* ── Bottom nav ────────────────────────────────────────────────── */}
      <nav className="ce-comp-bottom">
        {NAV.map(n => {
          const active = n.match(location.pathname)
          return (
            <NavLink key={n.to} to={n.to} className={`ce-comp-tab ${active ? 'is-active' : ''}`}>
              <span className="ce-comp-tab-dot" />
              <span className="relative">
                <n.icon size={22} />
                {n.to === '/companion/visit/active' && activeBookingId && (
                  <span className="absolute -top-0.5 -right-1 w-2 h-2 bg-[#A8D5B5] rounded-full ring-2 ring-white" />
                )}
              </span>
              <span className="ce-comp-tab-label">{n.label}</span>
            </NavLink>
          )
        })}
      </nav>
    </div>
  )
}
