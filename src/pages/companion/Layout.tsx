// src/pages/companion/Layout.tsx
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { Home, Calendar, Wallet, User, LogOut } from 'lucide-react'
import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import { useGeolocation } from '@/lib/useGeolocation'
import { Logo } from '@/components/ui/Logo'
import clsx from 'clsx'

const NAV = [
  { to: '/companion', icon: Home, label: 'Today', end: true },
  { to: '/companion/schedule', icon: Calendar, label: 'Schedule' },
  { to: '/companion/earnings', icon: Wallet, label: 'Earnings' },
  { to: '/companion/profile', icon: User, label: 'Profile' },
]

export function CompanionLayout() {
  const { user, profile, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [activeBookingId, setActiveBookingId] = useState<string | null>(null)
  const [bannerDismissed, setBannerDismissed] = useState(false)

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
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:flex-col fixed inset-y-0 left-0 z-30 w-56 bg-green-900 text-white pt-[env(safe-area-inset-top)]">
        <div className="px-5 py-4 border-b border-white/10 flex items-center gap-2.5">
          <Logo className="w-8 h-8 flex-shrink-0" />
          <div className="min-w-0">
            <p className="font-serif text-lg leading-tight">close <span className="text-green-300">eye</span></p>
            <p className="text-xs text-white/40">Companion Portal</p>
          </div>
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

      {/* Main content */}
      <div className="flex-1 md:ml-56 min-w-0 flex flex-col">
        {/* Mobile header */}
        <header className="bg-white border-b border-gray-100 px-4 py-4 flex items-center justify-between md:hidden sticky top-0 z-20 pt-[env(safe-area-inset-top)]">
          <div className="flex items-center gap-2">
            <Logo className="w-6 h-6" />
            <p className="font-serif text-lg text-green-900">close <span className="text-green-600">eye</span></p>
          </div>
          <button
            onClick={handleSignOut}
            className="text-gray-400 hover:text-green-800 p-1 rounded-lg transition-colors"
            aria-label="Sign out"
          >
            <LogOut size={18} />
          </button>
        </header>

        <main className="flex-1 p-4 sm:p-6 max-w-3xl mx-auto space-y-4 w-full pb-24 md:pb-6">
          {activeBookingId !== null && geoError && !bannerDismissed && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-xl p-3 flex items-center justify-between gap-3">
              <span>{geoError}</span>
              <button onClick={() => setBannerDismissed(true)} className="font-semibold underline whitespace-nowrap flex-shrink-0">Dismiss</button>
            </div>
          )}
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 inset-x-0 z-30 bg-white border-t border-gray-100 grid grid-cols-4 md:hidden pb-[env(safe-area-inset-bottom)]">
        {NAV.map(n => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.end}
            className={({ isActive }) => clsx(
              'flex flex-col items-center justify-center gap-1 py-2.5 text-xs font-medium transition-colors',
              isActive ? 'text-green-800' : 'text-gray-400'
            )}
          >
            <n.icon size={20} />
            {n.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
