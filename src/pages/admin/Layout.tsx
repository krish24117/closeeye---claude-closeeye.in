import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { Home, Calendar, Users, Heart, Wallet, FileText, MapPin, LogOut, Menu, X } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { Logo } from '@/components/ui/Logo'
import clsx from 'clsx'

const NAV = [
  { to: '/admin', icon: Home, label: 'Overview', end: true },
  { to: '/admin/bookings', icon: Calendar, label: 'Bookings' },
  { to: '/admin/companions', icon: Users, label: 'Companions' },
  { to: '/admin/families', icon: Heart, label: 'Families' },
  { to: '/admin/payments', icon: Wallet, label: 'Payments' },
  { to: '/admin/reports', icon: FileText, label: 'Visit Reports' },
  { to: '/admin/live-map', icon: MapPin, label: 'Live Map' },
]

export function AdminLayout() {
  const { profile, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

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

  async function handleSignOut() {
    await signOut()
    navigate('/')
  }

  const initials = profile?.full_name
    ?.split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('') || 'U'

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className={clsx(
        'fixed inset-y-0 left-0 z-50 w-64 bg-green-900 text-white flex flex-col transition-transform duration-200 ease-in-out',
        'md:translate-x-0',
        open ? 'translate-x-0' : '-translate-x-full'
      )}>
        <div className="p-6 border-b border-white/10 flex items-center gap-2.5">
          <Logo className="w-8 h-8 flex-shrink-0" />
          <div className="min-w-0">
            <p className="font-serif text-xl leading-tight">close <span className="text-green-300">eye</span></p>
            <p className="text-xs text-white/50">Admin Portal</p>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {NAV.map(n => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) => clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                isActive
                  ? 'bg-white text-green-900 font-semibold shadow-sm'
                  : 'text-white/55 hover:text-white hover:bg-white/10'
              )}
            >
              <n.icon size={17} />
              {n.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-sm font-bold flex-shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-white truncate">{profile?.full_name || 'User'}</p>
              <p className="text-xs text-white/40">Admin account</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 text-xs text-white/50 hover:text-white transition-colors"
          >
            <LogOut size={14} /> Sign out
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
      <div className="flex-1 md:ml-64 min-w-0">
        {/* Mobile header */}
        <header className="bg-white border-b border-gray-100 px-4 py-4 flex items-center gap-3 md:hidden sticky top-0 z-30">
          <button
            onClick={() => setOpen(!open)}
            className="text-green-800 p-1 rounded-lg hover:bg-green-50 transition-colors"
            aria-label="Toggle menu"
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
          <Logo className="w-6 h-6" />
          <p className="font-serif text-lg text-green-900">close eye</p>
        </header>

        <main className="p-4 sm:p-6 max-w-6xl mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
