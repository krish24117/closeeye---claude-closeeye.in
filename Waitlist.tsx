import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Menu, X, Bell } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import clsx from 'clsx'

const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/services', label: 'Services' },
  { href: '/about', label: 'About' },
  { href: '/faq', label: 'FAQ' },
  { href: '/contact', label: 'Contact' },
]

export function Navbar() {
  const [open, setOpen] = useState(false)
  const { user, profile, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const dashLink = profile?.role === 'companion' ? '/companion' : '/dashboard'

  return (
    <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-green-100">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">

        {/* Logo */}
        <Link to="/" className="font-serif text-xl text-green-900 tracking-tight">
          close <span className="text-green-600">eye</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map(l => (
            <Link
              key={l.href}
              to={l.href}
              className={clsx(
                'px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                location.pathname === l.href
                  ? 'bg-green-50 text-green-800'
                  : 'text-gray-500 hover:text-green-800 hover:bg-green-50'
              )}
            >
              {l.label}
            </Link>
          ))}
        </div>

        {/* CTAs */}
        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <>
              <button
                onClick={() => navigate(dashLink)}
                className="flex items-center gap-2 text-sm font-medium text-green-800 hover:text-green-600 transition-colors"
              >
                <Bell size={16} />
                Dashboard
              </button>
              <button
                onClick={signOut}
                className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link
                to="/auth"
                className="text-sm font-medium text-green-800 border border-green-200 px-4 py-2 rounded-lg hover:bg-green-50 transition-colors"
              >
                Sign in
              </Link>
              <Link
                to="/waitlist"
                className="text-sm font-semibold bg-green-800 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
              >
                Join Waitlist
              </Link>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden p-2 text-green-800"
          onClick={() => setOpen(!open)}
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-green-100 bg-white px-6 py-4 space-y-1 animate-fade-in">
          {NAV_LINKS.map(l => (
            <Link
              key={l.href}
              to={l.href}
              onClick={() => setOpen(false)}
              className="block px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-green-50 hover:text-green-800"
            >
              {l.label}
            </Link>
          ))}
          <div className="pt-3 border-t border-green-50 flex flex-col gap-2">
            {user ? (
              <>
                <Link to={dashLink} onClick={() => setOpen(false)} className="block text-center py-2.5 bg-green-800 text-white rounded-lg text-sm font-semibold">Dashboard</Link>
                <button onClick={signOut} className="text-sm text-gray-400 text-center">Sign out</button>
              </>
            ) : (
              <>
                <Link to="/auth" onClick={() => setOpen(false)} className="block text-center py-2.5 border border-green-200 text-green-800 rounded-lg text-sm font-medium">Sign in</Link>
                <Link to="/waitlist" onClick={() => setOpen(false)} className="block text-center py-2.5 bg-green-800 text-white rounded-lg text-sm font-semibold">Join Waitlist</Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}
