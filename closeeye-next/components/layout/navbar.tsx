'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { Menu, X } from 'lucide-react'
import { Logo } from '@/components/ui/logo'
import { Button } from '@/components/ui/button'
import { UserMenu } from '@/components/ui/user-menu'
import { useAuth } from '@/components/auth/auth-provider'
import { useFamilyData } from '@/components/family/family-data-provider'
import { useScrolled } from '@/hooks/use-scrolled'
import { NAV_ITEMS, type NavItem } from '@/lib/site'
import { cn } from '@/lib/utils'

const EASE = [0.22, 1, 0.36, 1] as const

// Pages whose masthead is dark ink — the transparent navbar sits over a dark hero
// there, so its logo + controls must render light until the bar gets its own bg.
const DARK_HERO_ROUTES = new Set<string>([])

export function Navbar() {
  const scrolled = useScrolled(24)
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)

  const { session } = useAuth()
  const { identity, profile } = useFamilyData()
  const signedIn = !!session

  // A signed-in visitor's menu links to their own role's app surfaces.
  const role = profile?.role
  const dest =
    role === 'companion'
      ? { profileHref: '/guardian/profile', accountHref: '/guardian/profile', notificationsHref: '/guardian/profile' }
      : role === 'admin'
        ? { profileHref: '/admin/settings', accountHref: '/admin/settings', notificationsHref: '/admin/settings' }
        : { profileHref: '/space/settings', accountHref: '/space/settings', notificationsHref: '/space/settings' }
  const menuProps = {
    name: identity.fullName,
    email: identity.email,
    avatarUrl: identity.avatarUrl,
    initials: identity.initials,
    roleLabel: role === 'companion' ? 'Guardian' : role === 'admin' ? 'Admin' : profile ? 'Family' : undefined,
    ...dest,
  }
  // Returning-customer entry — one truthful authenticated action. Signed in → open the real
  // Family Space (/space); signed out → the actual sign-in screen (/auth). Set off by a divider
  // in the drawer so first-time visitors aren't nudged to a login.
  const accountItem: NavItem = signedIn
    ? { label: 'Open Family Space', href: '/space' }
    : { label: 'Sign In', href: '/auth' }

  // Transparent bar over a dark hero → go light so nothing disappears on dark.
  const overDark = DARK_HERO_ROUTES.has(pathname) && !scrolled && !open

  // Lock body scroll while the menu is open; scroll position is preserved.
  useEffect(() => {
    if (!open) return
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-50 transition-colors duration-300 ease-premium',
        scrolled || open
          ? 'border-b border-line bg-ivory/85 backdrop-blur-xl'
          : 'border-b border-transparent bg-transparent',
      )}
    >
      <nav
        className="mx-auto flex h-[4.5rem] max-w-content items-center justify-between px-8"
        aria-label="Primary"
      >
        <Link href="/" aria-label="Close Eye home" className="-my-2 rounded-md py-2">
          <Logo variant="marketing" tone={overDark ? 'light' : 'dark'} />
        </Link>

        {/* Desktop */}
        <ul className="hidden items-center gap-1 lg:flex">
          {NAV_ITEMS.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  'rounded-full px-4 py-2 text-body-sm font-medium transition-colors',
                  overDark
                    ? 'text-white/85 hover:bg-white/10 hover:text-white'
                    : 'text-body/80 hover:bg-accent-soft hover:text-ink',
                )}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
        <div className="hidden items-center gap-2 lg:flex">
          {signedIn ? (
            <>
              <Button asChild size="sm">
                <Link href="/space">Open Family Space</Link>
              </Button>
              <UserMenu {...menuProps} className="ml-1" />
            </>
          ) : (
            <>
              <Link
                href="/auth"
                className={cn(
                  'rounded-full px-4 py-2 text-body-sm font-medium transition-colors',
                  overDark
                    ? 'text-white/85 hover:bg-white/10 hover:text-white'
                    : 'text-body/80 hover:bg-accent-soft hover:text-ink',
                )}
              >
                Sign In
              </Link>
              <Button asChild size="sm">
                <Link href="/auth?intent=join">Start with your Family</Link>
              </Button>
            </>
          )}
        </div>

        {/* Mobile controls — avatar (when signed in) + the 44×44 menu toggle */}
        <div className="flex items-center gap-1 lg:hidden">
          {signedIn && <UserMenu {...menuProps} />}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className={cn(
              'grid h-11 w-11 place-items-center rounded-full transition-colors',
              open
                ? 'bg-accent-soft text-ink'
                : overDark
                  ? 'text-white hover:bg-white/10'
                  : 'text-ink hover:bg-accent-soft',
            )}
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
          >
            {open ? <X className="h-5 w-5" strokeWidth={1.75} /> : <Menu className="h-5 w-5" strokeWidth={1.75} />}
          </button>
        </div>
      </nav>

      {/* Mobile menu — full-height ivory panel, slides down + fades in */}
      <AnimatePresence>
        {open && (
          <motion.div
            className="absolute inset-x-0 top-[4.5rem] z-40 h-[calc(100dvh-4.5rem)] overflow-y-auto border-t border-line bg-ivory lg:hidden"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.24, ease: EASE }}
          >
            <div className="mx-auto max-w-content px-8 pb-10 pt-4">
              <ul className="flex flex-col" aria-label="Menu">
                {NAV_ITEMS.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={close}
                      className="block py-3 text-lead text-ink transition-colors hover:text-green active:opacity-70"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
                {/* Returning customers — set off from the browse funnel */}
                <li className="mt-2 border-t border-line pt-2">
                  <Link
                    href={accountItem.href}
                    onClick={close}
                    className="block py-3 text-lead text-ink transition-colors hover:text-green active:opacity-70"
                  >
                    {accountItem.label}
                  </Link>
                </li>
              </ul>
              <div className="mt-8">
                <Button asChild size="lg" className="w-full">
                  <Link href={signedIn ? '/space' : '/auth?intent=join'} onClick={close}>
                    {signedIn ? 'Open Family Space' : 'Start with your Family'}
                  </Link>
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
