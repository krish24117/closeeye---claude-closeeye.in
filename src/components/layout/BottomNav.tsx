import { Link, useLocation } from 'react-router-dom'
import { Home, MessageCircle, HeartHandshake, ClipboardList, User } from 'lucide-react'

export function BottomNav() {
  const { pathname } = useLocation()
  const isHome = pathname === '/'

  return (
    <nav className="ce-bottom-nav" aria-label="Quick navigation">
      <div className="ce-bottom-nav-inner">
        <Link to="/" className={`ce-bottom-nav-item${pathname === '/' ? ' is-active' : ''}`}>
          <Home size={24} strokeWidth={1.8} />
          <span className="ce-bottom-nav-label">Home</span>
        </Link>

        <a href={isHome ? '#ask' : '/#ask'} className="ce-bottom-nav-item">
          <MessageCircle size={24} strokeWidth={1.8} />
          <span className="ce-bottom-nav-label">Ask</span>
        </a>

        <Link to="/services" className={`ce-bottom-nav-item${pathname === '/services' ? ' is-active' : ''}`}>
          <HeartHandshake size={24} strokeWidth={1.8} />
          <span className="ce-bottom-nav-label">Services</span>
        </Link>

        <a href={isHome ? '#wa-report' : '/#wa-report'} className="ce-bottom-nav-item">
          <ClipboardList size={24} strokeWidth={1.8} />
          <span className="ce-bottom-nav-label">Updates</span>
        </a>

        <Link
          to="/auth"
          className={`ce-bottom-nav-item${pathname.startsWith('/auth') || pathname.startsWith('/dashboard') ? ' is-active' : ''}`}
        >
          <User size={24} strokeWidth={1.8} />
          <span className="ce-bottom-nav-label">Profile</span>
        </Link>
      </div>
    </nav>
  )
}
