// src/pages/companion/Layout.tsx
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { Home, Calendar, Wallet, LogOut, Menu, X } from 'lucide-react'
import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import { useGeolocation } from '@/lib/useGeolocation'
import clsx from 'clsx'

const NAV = [
  { to: '/companion', icon: Home, label: 'My Visits', end: true },
  { to: '/companion/schedule', icon: Calendar, label: 'Schedule' },
  { to: '/companion/earnings', icon: Wallet, label: 'Earnings' },
]

export function CompanionLayout() {
  const { user, profile, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const [activeBookingId, setActiveBookingId] = useState<string | null>(null)
  const [bannerDismissed, setBannerDismissed] = useState(false)

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setOpen(false)
  }, [location.pathname])

  // Prevent body scroll when sidebar open on mobile
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  const checkActiveBooking = useCallback(async () => {
    if (!user) { setActiveBookingId(null); return }
    const { data, error } = await supabase.from('bookings')
      .select('id')
      .eq('companion_id', user.id)
      .eq('status', 'in_progress')
      .limit(1)
      .maybeSingle()
    if (error) { console.error('Failed to check active visit:', error); return }
    setActiveBookingId(data?.id ?? null)
    setBannerDismissed(false)
  }, [user])

  useEffect(() => { checkActiveBooking() }, [checkActiveBooking, location.pathname])

  useEffect(() => {
    window.addEventListener('closeeye:active-booking-changed', checkActiveBooking)
    return () => window.removeEventListener('closeeye:active-booking-changed', checkActiveBooking)
  }, [checkActiveBooking])

  const handleLocationUpdate = useCallback(async (pos: { lat: number; lng: number }) => {
    if (!user || !activeBookingId) return
    const { error } = await supabase.from('companion_locations').upsert({
      companion_id: user.id,
      booking_id: activeBookingId,
      lat: pos.lat,
      lng: pos.lng,
      updated_at: new Date().toISOString(),
    })
    if (error) console.error('Failed to update location:', error)
  }, [user, activeBookingId])

  const { error: geoError } = useGeolocation(activeBookingId !== null, handleLocationUpdate, 12000)

  async function handleSignOut() {
    await signOut()
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className={clsx(
        'fixed inset-y-0 left-0 z-50 w-56 bg-green-900 text-white flex flex-col transition-transform duration-200 ease-in-out',
        'md:translate-x-0',
        open ? 'translate-x-0' : '-translate-x-full'
      )}>
        <div className="p-5 border-b border-white/10">
          <p className="font-serif text-lg">close <span className="text-green-300">eye</span></p>
          <p className="text-xs text-white/40 mt-0.5">Companion Portal</p>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {NAV.map(n => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) => clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                isActive ? 'bg-white/15 text-white' : 'text-white/60 hover:text-white hover:bg-white/10'
              )}
            >
              <n.icon size={16} /> {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-white/10">
          <p className="text-sm font-medium text-white mb-3 truncate">{profile?.full_name}</p>
          <button onClick={handleSignOut} className="flex items-center gap-2 text-xs text-white/50 hover:text-white">
            <LogOut size={14}/> Sign out
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="flex-1 md:ml-56 min-w-0">
        {/* Mobile header */}
        <header className="bg-white border-b border-gray-100 px-4 py-4 flex items-center gap-3 md:hidden sticky top-0 z-30">
          <button
            onClick={() => setOpen(!open)}
            className="text-green-800 p-1 rounded-lg hover:bg-green-50 transition-colors"
            aria-label="Toggle menu"
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
          <p className="font-serif text-lg text-green-900">close eye</p>
        </header>

        <main className="p-4 sm:p-6 max-w-3xl mx-auto space-y-4">
          {activeBookingId !== null && geoError && !bannerDismissed && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-xl p-3 flex items-center justify-between gap-3">
              <span>{geoError}</span>
              <button onClick={() => setBannerDismissed(true)} className="font-semibold underline whitespace-nowrap flex-shrink-0">Dismiss</button>
            </div>
          )}
          <Outlet />
        </main>
      </div>
    </div>
  )
}
