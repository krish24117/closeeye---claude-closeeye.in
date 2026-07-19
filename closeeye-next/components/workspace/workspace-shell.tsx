'use client'

/**
 * The Workspace shell — the ONE chrome for CloseEye's canonical home.
 *
 * Navigation is the Dock (2026-07-19): on mobile, four tabs around a central Connect **orb** —
 * Home · People · ⬢ · Activity · Profile. Connect leaves the tab row and becomes the primary
 * action; tapping the orb opens the Connect sheet (a launcher into the real /space/connect engine).
 * Care is hidden until phase 2. Profile is the Settings Owner, and it now holds the account actions
 * that used to sit behind a mobile avatar menu — so that menu is gone on mobile. Desktop keeps its
 * sidebar; there the orb is a Connect button that opens the same sheet.
 *
 * Increment A is STRUCTURE: the orb rests (still). Its breath + states + the whisper, with the
 * background / Low-Power pause-guards, are Increment B; voice is Increment C.
 *
 * /space/* runs in AppShell "lite" mode, so this shell reads ONLY useAuth.
 */
import * as React from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Home, MessageCircle, Users, Activity, HeartHandshake, CreditCard, UserRound, Siren, UserPlus, LogOut } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useAuth } from '@/components/auth/auth-provider'
import { supabase } from '@/lib/supabase'
import { Logo } from '@/components/ui/logo'
import { emergencyDial, DEFAULT_REGION_CODE } from '@/lib/platform/regions'
import { PRIMARY_NAV, OVERFLOW_NAV, CONNECT_HREF, isActive } from '@/lib/workspace/nav'
import { CARE_ENABLED } from '@/lib/platform/capability'
import { ConnectSheet } from '@/components/workspace/connect-sheet'
import { cn } from '@/lib/utils'

// Care is a phase-2 launch — hidden from the dock until NEXT_PUBLIC_CARE_ENABLED=true. The nav
// DATA (nav.ts / Ownership Registry) stays complete; only the render drops the Care tab.
const VISIBLE_PRIMARY_NAV = PRIMARY_NAV.filter((i) => CARE_ENABLED || i.href !== '/space/care')

// Icons are presentation, keyed by canonical route; the nav data itself lives in lib/workspace/nav.
const ICONS: Record<string, LucideIcon> = {
  '/space': Home,
  '/space/people': Users,
  '/space/connect': MessageCircle,
  '/space/activity': Activity,
  '/space/settings': UserRound, // Profile
  '/space/care': HeartHandshake,
  '/space/billing': CreditCard,
}

function initialsFrom(name?: string | null, email?: string | null) {
  const raw = (name || email?.split('@')[0] || '').trim()
  const parts = raw ? raw.split(/\s+/) : []
  return (parts.slice(0, 2).map((s) => s[0]).join('') || '?').toUpperCase()
}

export function WorkspaceShell({ children }: { children: React.ReactNode }) {
  const { session, user, loading, onboardingComplete } = useAuth()
  const pathname = usePathname() || ''
  const router = useRouter()
  const [menuOpen, setMenuOpen] = React.useState(false)
  const [sheetOpen, setSheetOpen] = React.useState(false)

  // Unified authentication entry — one guard, the app's auth provider, the canonical sign-in.
  // Also closes the deep-link hole: a signed-in user who never onboarded (direct /space link or
  // back-nav) is sent to guided setup instead of a stranded empty Workspace. `=== false` only —
  // never redirect while onboarding status is still resolving (null), so there's no flash/loop.
  React.useEffect(() => {
    if (loading) return
    if (!session) { router.replace('/connect'); return }
    if (onboardingComplete === false) router.replace('/onboarding')
  }, [loading, session, onboardingComplete, router])

  // Close the Account menu on Escape (a11y — a menu must be dismissible from the keyboard).
  React.useEffect(() => {
    if (!menuOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [menuOpen])

  if (loading || !session) {
    return (
      <div className="grid min-h-dvh place-items-center bg-surface">
        <span className="text-caption text-content-muted">Opening your Workspace…</span>
      </div>
    )
  }

  const name = (user?.user_metadata?.full_name as string | undefined) || (user?.user_metadata?.name as string | undefined) || null
  const initials = initialsFrom(name, user?.email)
  const dial = emergencyDial(DEFAULT_REGION_CODE)

  async function signOut() {
    try { await supabase.auth.signOut() } catch {}
    router.replace('/connect')
  }

  // The dock tabs are the visible primary Owners minus Connect (the orb), split evenly around it.
  const tabItems = VISIBLE_PRIMARY_NAV.filter((i) => i.href !== CONNECT_HREF)
  const half = Math.floor(tabItems.length / 2)
  const leftTabs = tabItems.slice(0, half)
  const rightTabs = tabItems.slice(half)

  const DockTab = ({ href, label, exact }: { href: string; label: string; exact?: boolean }) => {
    const Icon = ICONS[href] ?? Home
    return (
      <Link href={href} className="wsp-tab" aria-current={isActive(pathname, href, exact) ? 'page' : undefined}>
        <Icon strokeWidth={1.65} />
        <span>{label}</span>
      </Link>
    )
  }

  // Desktop sidebar navigation — Connect is a button (opens the sheet), the rest are links.
  const SidebarNav = () => (
    <>
      {VISIBLE_PRIMARY_NAV.map((item) => {
        const Icon = ICONS[item.href] ?? Home
        const base = 'flex items-center gap-3 rounded-sm px-3 py-2.5 text-body-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40'
        if (item.href === CONNECT_HREF) {
          return (
            <button key={item.href} onClick={() => setSheetOpen(true)} aria-haspopup="dialog" aria-expanded={sheetOpen} className={cn(base, 'text-content hover:bg-surface-accent/60')}>
              <span className="wsp-orb-mini grid h-5 w-5 place-items-center rounded-full">
                <span className="wsp-orb-mini-core h-1.5 w-1.5 rounded-full" />
              </span>
              {item.label}
            </button>
          )
        }
        const active = isActive(pathname, item.href, item.exact)
        return (
          <Link key={item.href} href={item.href} aria-current={active ? 'page' : undefined} className={cn(base, active ? 'bg-surface-accent text-brand' : 'text-content-muted hover:bg-surface-accent/50 hover:text-content')}>
            <Icon className="h-5 w-5" strokeWidth={1.5} />
            {item.label}
          </Link>
        )
      })}
    </>
  )

  // Account menu (desktop only now) — overflow (Billing) + Emergency + Sign out. Settings became
  // the Profile tab; on mobile the whole account lives inside Profile, so there is no mobile menu.
  const AccountMenu = () => (
    <>
      <button aria-hidden className="fixed inset-0 z-40 cursor-default" onClick={() => setMenuOpen(false)} />
      <div role="menu" className="absolute right-0 top-12 z-50 w-56 overflow-hidden rounded-lg border border-edge bg-surface-raised shadow-lg">
        <div className="border-b border-edge px-4 py-3">
          <p className="truncate text-body-sm font-semibold text-content">{name || 'Your account'}</p>
          <p className="truncate text-caption text-content-muted">{user?.email}</p>
        </div>
        <Link href="/space/settings" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-body-sm text-content hover:bg-surface-accent/50">
          <UserRound className="h-4 w-4 text-content-muted" strokeWidth={1.75} /> Profile
        </Link>
        {OVERFLOW_NAV.map((item) => {
          const Icon = ICONS[item.href] ?? Home
          return (
            <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-body-sm text-content hover:bg-surface-accent/50">
              <Icon className="h-4 w-4 text-content-muted" strokeWidth={1.75} /> {item.label}
            </Link>
          )
        })}
        {dial.href ? (
          <a href={dial.href} className="flex items-center gap-3 border-t border-edge px-4 py-2.5 text-body-sm text-error hover:bg-error/5">
            <Siren className="h-4 w-4" strokeWidth={1.75} /> Emergency · {dial.text.replace(/^.*·\s*/, '')}
          </a>
        ) : (
          <span className="flex items-center gap-3 border-t border-edge px-4 py-2.5 text-body-sm text-error">
            <Siren className="h-4 w-4" strokeWidth={1.75} /> {dial.text}
          </span>
        )}
        <button onClick={signOut} className="flex w-full items-center gap-3 border-t border-edge px-4 py-2.5 text-start text-body-sm text-content hover:bg-surface-accent/50">
          <LogOut className="h-4 w-4 text-content-muted" strokeWidth={1.75} /> Sign out
        </button>
      </div>
    </>
  )

  return (
    <div className="min-h-dvh">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-edge bg-surface-raised px-4 py-6 lg:flex">
        <Link href="/space" aria-label="Workspace home" className="px-2"><Logo variant="sidebar" /></Link>
        <nav className="mt-8 flex flex-1 flex-col gap-1" aria-label="Workspace"><SidebarNav /></nav>
        <Link href="/family/add" className="mt-4 flex items-center justify-center gap-2 rounded-sm border border-edge py-2.5 text-body-sm font-semibold text-content transition-colors hover:bg-surface-accent/50">
          <UserPlus className="h-4 w-4" strokeWidth={1.75} /> Add someone
        </Link>
      </aside>

      {/* Mobile top bar — brand + add someone. The account avatar menu is gone; Profile owns it. */}
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-edge bg-surface/90 px-5 backdrop-blur-xl lg:hidden">
        <Link href="/space" aria-label="Workspace home"><Logo variant="sidebar" /></Link>
        <Link href="/family/add" aria-label="Add someone" className="grid h-11 w-11 place-items-center rounded-full text-content-muted transition-colors hover:bg-surface-accent/60 hover:text-brand">
          <UserPlus className="h-6 w-6" strokeWidth={1.5} />
        </Link>
      </header>

      {/* Desktop account button (top-right, over content) */}
      <div className="fixed right-6 top-5 z-30 hidden lg:block">
        <div className="relative">
          <button onClick={() => setMenuOpen((v) => !v)} aria-label="Account" aria-expanded={menuOpen} className="grid h-9 w-9 place-items-center rounded-full bg-brand text-body-sm font-semibold text-content-inverse focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-2 shadow-sm">
            {initials}
          </button>
          {menuOpen && <AccountMenu />}
        </div>
      </div>

      {/* Main */}
      <div className="lg:ps-64">
        <main id="main" className="mx-auto max-w-4xl px-5 pb-32 pt-6 sm:px-6 lg:px-10 lg:pb-16 lg:pt-10">{children}</main>
      </div>

      {/* Mobile dock — four tabs around the Connect orb */}
      <div className="wsp-dock lg:hidden">
        <nav className="wsp-dock-bar" aria-label="Workspace">
          {leftTabs.map((item) => <DockTab key={item.href} href={item.href} label={item.label} exact={item.exact} />)}
          <div className="wsp-orb-wrap">
            <button className="wsp-orb" aria-haspopup="dialog" aria-expanded={sheetOpen} aria-label="Ask about your family" onClick={() => setSheetOpen(true)}>
              <span className="wsp-orb-core" aria-hidden />
              <span className="wsp-orb-label">Connect</span>
            </button>
          </div>
          {rightTabs.map((item) => <DockTab key={item.href} href={item.href} label={item.label} exact={item.exact} />)}
        </nav>
      </div>

      <ConnectSheet open={sheetOpen} onClose={() => setSheetOpen(false)} />
    </div>
  )
}
