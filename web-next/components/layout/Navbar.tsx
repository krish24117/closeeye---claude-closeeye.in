'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X } from 'lucide-react'
import { Logo } from '@/components/ui/Logo'
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
  const pathname = usePathname()

  // Close mobile menu on route change
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname?.startsWith(href)
  }

  return (
    <>
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-green-100 pt-[env(safe-area-inset-top)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">

          {/* Logo */}
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 font-serif text-xl text-green-900 tracking-tight flex-shrink-0"
            onClick={() => setOpen(false)}
          >
            <Logo className="w-8 h-8" />
            close <span className="text-green-600">eye</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-0.5">
            {NAV_LINKS.map(l => (
              <Link
                key={l.href}
                href={l.href}
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
            <Link
              href="/auth"
              className="text-sm font-medium text-green-800 border border-green-200 px-4 py-2 rounded-lg hover:bg-green-50 transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/waitlist"
              className="text-sm font-semibold bg-green-800 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
            >
              Join Waitlist
            </Link>
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
        'fixed top-16 left-0 right-0 bg-white z-40 md:hidden border-b border-green-100 shadow-lg transition-all duration-200',
        open ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'
      )}>
        <div className="px-4 py-3 space-y-1">
          {NAV_LINKS.map(l => (
            <Link
              key={l.href}
              href={l.href}
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
          <Link
            href="/waitlist"
            className="block text-center py-3 bg-green-800 text-white rounded-xl text-sm font-semibold"
          >
            Join Waitlist
          </Link>
          <Link
            href="/auth"
            className="block text-center py-3 border border-green-200 text-green-800 rounded-xl text-sm font-medium"
          >
            Sign in
          </Link>
        </div>
      </div>
    </>
  )
}
