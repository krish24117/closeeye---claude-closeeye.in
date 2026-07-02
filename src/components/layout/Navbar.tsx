import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Menu, X, Bell, ChevronDown } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { LogoLockup } from '@/components/ui/Logo'
import clsx from 'clsx'

const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/services', label: 'Services' },
  { href: '/companions', label: 'Companions' },
  { href: '/about', label: 'About' },
  { href: '/faq', label: 'FAQ' },
  { href: '/contact', label: 'Contact' },
]

export function Navbar() {
  const [open, setOpen] = useState(false)
  const { user, profile, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  // Close mobile menu on route change
  useEffect(() => {
    setOpen(false)
  }, [location.pathname])

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  const dashLink = profile?.role === 'companion' ? '/companion' : '/dashboard'

  const isActive = (href: string) => {
    if (href === '/') return location.pathname === '/'
    return location.pathname.startsWith(href)
  }

  return (
    <>
      <nav className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-[0_1px_8px_rgba(0,0,0,0.04)] pt-[env(safe-area-inset-top)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-[72px] flex items-center justify-between">

          {/* Logo */}
          <Link to="/" style={{ textDecoration: 'none', flexShrink: 0 }} onClick={() => setOpen(false)}>
            <LogoLockup fontSize={20} color="dark" />
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-0.5">
            {NAV_LINKS.map(l => (
              <Link
                key={l.href}
                to={l.href}
                className={clsx(
                  'px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  isActive(l.href)
                    ? 'bg-green-50 text-green-800'
                    : 'text-gray-500 hover:text-green-800 hover:bg-green-50'
                )}
              >
                {l.label}
              </Link>
            ))}
          </div>

          {/* Desktop CTAs */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => navigate(dashLink)}
                  className="flex items-center gap-2 text-sm font-medium text-green-800 hover:text-green-600 transition-colors"
                >
                  <Bell size={16} />
                  Dashboard
                </button>
                <div className="w-px h-4 bg-gray-200" />
                <button
                  onClick={async () => { await signOut(); window.location.replace('/auth') }}
                  className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
                >
                  Sign out
                </button>
              </div>
            ) : (
              <>
                <Link
                  to="/auth"
                  className="text-sm font-medium text-green-800 border border-green-200 px-4 py-2 rounded-lg hover:bg-green-50 transition-colors"
                >
                  Sign in
                </Link>
                <Link
                  to="/auth?mode=signup"
                  className="text-sm font-semibold bg-green-800 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                >
                  Register Family
                </Link>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 text-green-800 rounded-lg hover:bg-green-50 transition-colors"
            onClick={() => setOpen(!open)}
            aria-label={open ? 'Close menu' : 'Open menu'}
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </nav>

      {/* Mobile menu overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/30 z-40 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Mobile menu drawer */}
      <div className={clsx(
        'fixed top-[72px] left-0 right-0 bg-white z-40 md:hidden border-b border-gray-200 shadow-lg transition-all duration-200',
        open ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'
      )}>
        <div className="px-4 py-3 space-y-1">
          {NAV_LINKS.map(l => (
            <Link
              key={l.href}
              to={l.href}
              className={clsx(
                'flex items-center px-3 py-3 rounded-xl text-sm font-medium transition-colors',
                isActive(l.href)
                  ? 'bg-green-50 text-green-800'
                  : 'text-gray-600 hover:bg-green-50 hover:text-green-800'
              )}
            >
              {l.label}
            </Link>
          ))}
        </div>
        <div className="px-4 pb-4 pt-2 border-t border-green-50 flex flex-col gap-2">
          {user ? (
            <>
              <Link
                to={dashLink}
                className="flex items-center justify-center gap-2 py-3 bg-green-800 text-white rounded-xl text-sm font-semibold"
              >
                <Bell size={16} /> Dashboard
              </Link>
              <button
                onClick={async () => { await signOut(); window.location.replace('/auth') }}
                className="py-2.5 text-sm text-gray-400 text-center hover:text-gray-600"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link
                to="/auth?mode=signup"
                className="block text-center py-3 bg-green-800 text-white rounded-xl text-sm font-semibold"
              >
                Register Family
              </Link>
              <Link
                to="/auth"
                className="block text-center py-3 border border-green-200 text-green-800 rounded-xl text-sm font-medium"
              >
                Sign in
              </Link>
            </>
          )}
        </div>
      </div>
    </>
  )
}
