import { Outlet, NavLink, useNavigate, Link } from 'react-router-dom'
import { Home, FileText, MessageCircle, CalendarPlus, User, Bell, LogOut, CalendarCheck2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { Logo } from '@/components/ui/Logo'

const NRI_TABS = [
  { to: '/dashboard', icon: Home, label: 'Home', end: true },
  { to: '/dashboard/bookings', icon: CalendarCheck2, label: 'Bookings' },
  { to: '/dashboard/reports', icon: FileText, label: 'Reports' },
  { to: '/dashboard/ask', icon: MessageCircle, label: 'Ask' },
  { to: '/dashboard/book', icon: CalendarPlus, label: 'Book' },
]
const SOCIETY_TABS = [
  { to: '/dashboard', icon: Home, label: 'Home', end: true },
  { to: '/dashboard/bookings', icon: CalendarCheck2, label: 'Bookings' },
  { to: '/dashboard/ask', icon: MessageCircle, label: 'Ask' },
  { to: '/dashboard/book', icon: CalendarPlus, label: 'Book' },
  { to: '/dashboard/profile', icon: User, label: 'Profile' },
]
// Waitlisted users get a minimal tab set — Ask + Profile only, no booking
const WAITLIST_TABS = [
  { to: '/dashboard', icon: Home, label: 'Home', end: true },
  { to: '/dashboard/ask', icon: MessageCircle, label: 'Ask' },
  { to: '/dashboard/profile', icon: User, label: 'Profile' },
]

export function DashboardLayout() {
  const { profile, loading, signOut } = useAuth()
  const navigate = useNavigate()
  const [menu, setMenu] = useState(false)

  useEffect(() => {
    // Redirect to onboarding only if they are neither a founding member nor a waitlister
    if (!loading && profile && profile.role === 'family' && !profile.is_founding_member && !profile.is_waitlisted) {
      navigate('/onboarding', { replace: true })
    }
  }, [loading, profile, navigate])

  const isWaitlistOnly = profile?.is_waitlisted && !profile?.is_founding_member
  const tabs = isWaitlistOnly ? WAITLIST_TABS : (profile?.user_type === 'nri' ? NRI_TABS : SOCIETY_TABS)

  const initials = (profile?.full_name || 'U').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()

  async function handleSignOut() { await signOut(); navigate('/') }

  return (
    <div className="ce-fam min-h-screen bg-[var(--cream)]">
      {/* Top bar */}
      <header className="ce-fam-top">
        <NavLink to="/dashboard" className="flex items-center gap-1.5">
          <Logo className="w-7 h-7" />
          <span className="ce-fam-brand">close eye</span>
        </NavLink>
        <div className="flex items-center gap-3">
          <NavLink to="/dashboard/reports" aria-label="Notifications" className="text-[var(--gray-dark)] relative">
            <Bell size={22} />
          </NavLink>
          <button onClick={() => setMenu(m => !m)} className="ce-fam-avatar" aria-label="Account">
            {initials}
          </button>
        </div>
        {menu && (
          <div className="ce-fam-menu" onMouseLeave={() => setMenu(false)}>
            <p className="px-3 py-2 text-[13px] font-medium text-[var(--gray-mid)] truncate">{profile?.full_name || 'Your account'}</p>
            <NavLink to="/dashboard/profile" className="ce-fam-menu-item" onClick={() => setMenu(false)}><User size={15} /> Profile</NavLink>
            <button className="ce-fam-menu-item w-full" onClick={handleSignOut}><LogOut size={15} /> Sign out</button>
          </div>
        )}
      </header>

      {/* Upgrade banner for waitlist-only users */}
      {isWaitlistOnly && (
        <div style={{ background: 'var(--forest)', color: '#fff', padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)' }}>
            🌿 You're on the waitlist — ask health questions free (5/month)
          </span>
          <Link to="/onboarding" style={{ background: 'var(--sage)', color: 'var(--forest)', fontWeight: 700, padding: '6px 14px', borderRadius: 100, fontSize: 12, textDecoration: 'none', whiteSpace: 'nowrap' }}>
            Become a Founding Member →
          </Link>
        </div>
      )}

      {/* Scrollable content between the bars */}
      <main className="ce-fam-main">
        <Outlet />
      </main>

      {/* Bottom nav */}
      <nav className="ce-fam-bottom" aria-label="Primary">
        {tabs.map(t => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.end}
            className={({ isActive }) => `ce-fam-tab${isActive ? ' is-active' : ''}`}
          >
            <span className="ce-fam-dot" />
            <t.icon size={22} />
            <span className="ce-fam-tab-label">{t.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
