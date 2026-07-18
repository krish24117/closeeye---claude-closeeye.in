'use client'

/**
 * The Workspace shell — Phase 2, Sprint 1. The ONE chrome for CloseEye's canonical home.
 *
 * Primary navigation is the five Owners (docs/ownership_registry.md), in the constitutional
 * order Home · Ask · People · Activity · Care. Billing and Settings are overflow, behind the
 * Account menu. Navigation is stable; Workspace *state* (Sprint 2) reshapes Home, never this map
 * (docs/workspace_state_model.md — "navigation organizes capabilities; state organizes attention").
 *
 * UNIFIED AUTH ENTRY: one guard for the whole Workspace, via the app's auth provider (useAuth) —
 * not /space's ad-hoc OAuth. This resolves Navigation Law 6 for the new routes. /space/* runs in
 * AppShell "lite" mode (no FamilyDataProvider), so this shell reads ONLY useAuth.
 *
 * Ships BEHIND current routing: nothing links here by default; /family and the existing /space
 * page are untouched. Sprints 2–5 fill Home and each Owner; this sprint is the skeleton.
 */
import * as React from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Home, MessageCircle, Users, Activity, HeartHandshake, CreditCard, Settings, Siren, UserPlus, LogOut } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useAuth } from '@/components/auth/auth-provider'
import { supabase } from '@/lib/supabase'
import { Logo } from '@/components/ui/logo'
import { emergencyDial, DEFAULT_REGION_CODE } from '@/lib/platform/regions'
import { PRIMARY_NAV, OVERFLOW_NAV, isActive } from '@/lib/workspace/nav'
import { cn } from '@/lib/utils'

// Icons are presentation, keyed by canonical route; the nav data itself lives in lib/workspace/nav.
const ICONS: Record<string, LucideIcon> = {
  '/space': Home,
  '/space/ask': MessageCircle,
  '/space/people': Users,
  '/space/activity': Activity,
  '/space/care': HeartHandshake,
  '/space/billing': CreditCard,
  '/space/settings': Settings,
}

function initialsFrom(name?: string | null, email?: string | null) {
  const raw = (name || email?.split('@')[0] || '').trim()
  const parts = raw ? raw.split(/\s+/) : []
  return (parts.slice(0, 2).map((s) => s[0]).join('') || '?').toUpperCase()
}

export function WorkspaceShell({ children }: { children: React.ReactNode }) {
  const { session, user, loading } = useAuth()
  const pathname = usePathname() || ''
  const router = useRouter()
  const [menuOpen, setMenuOpen] = React.useState(false)

  // Unified authentication entry — one guard, the app's auth provider, the canonical sign-in.
  React.useEffect(() => {
    if (!loading && !session) router.replace('/welcome')
  }, [loading, session, router])

  // Close the Account menu on Escape (a11y — a menu must be dismissible from the keyboard).
  React.useEffect(() => {
    if (!menuOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [menuOpen])

  if (loading || !session) {
    return (
      <div className="grid min-h-dvh place-items-center bg-ivory">
        <span className="text-caption text-muted">Opening your Workspace…</span>
      </div>
    )
  }

  const name = (user?.user_metadata?.full_name as string | undefined) || (user?.user_metadata?.name as string | undefined) || null
  const initials = initialsFrom(name, user?.email)
  const dial = emergencyDial(DEFAULT_REGION_CODE)

  async function signOut() {
    try { await supabase.auth.signOut() } catch {}
    router.replace('/welcome')
  }

  const PrimaryNav = ({ onNavigate, iconsOnly }: { onNavigate?: () => void; iconsOnly?: boolean }) => (
    <>
      {PRIMARY_NAV.map((item) => {
        const active = isActive(pathname, item.href, item.exact)
        const Icon = ICONS[item.href] ?? Home
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green/40',
              iconsOnly
                ? 'flex flex-1 flex-col items-center justify-center gap-1 rounded-sm py-2 text-caption font-medium'
                : 'flex items-center gap-3 rounded-sm px-3 py-2.5 text-body-sm font-medium transition-colors',
              active ? (iconsOnly ? 'text-green' : 'bg-accent-soft text-green') : (iconsOnly ? 'text-muted' : 'text-muted hover:bg-accent-soft/50 hover:text-ink'),
            )}
          >
            <Icon className="h-5 w-5" strokeWidth={1.5} />
            {item.label}
          </Link>
        )
      })}
    </>
  )

  const AccountMenu = () => (
    <>
      <button aria-hidden className="fixed inset-0 z-40 cursor-default" onClick={() => setMenuOpen(false)} />
      <div role="menu" className="absolute right-0 top-12 z-50 w-56 overflow-hidden rounded-lg border border-line bg-card shadow-lg">
        <div className="border-b border-line px-4 py-3">
          <p className="truncate text-body-sm font-semibold text-ink">{name || 'Your account'}</p>
          <p className="truncate text-caption text-muted">{user?.email}</p>
        </div>
        {OVERFLOW_NAV.map((item) => {
          const Icon = ICONS[item.href] ?? Home
          return (
            <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-body-sm text-ink hover:bg-accent-soft/50">
              <Icon className="h-4 w-4 text-muted" strokeWidth={1.75} /> {item.label}
            </Link>
          )
        })}
        {dial.href ? (
          <a href={dial.href} className="flex items-center gap-3 border-t border-line px-4 py-2.5 text-body-sm text-error hover:bg-error/5">
            <Siren className="h-4 w-4" strokeWidth={1.75} /> Emergency · {dial.text.replace(/^.*·\s*/, '')}
          </a>
        ) : (
          <span className="flex items-center gap-3 border-t border-line px-4 py-2.5 text-body-sm text-error">
            <Siren className="h-4 w-4" strokeWidth={1.75} /> {dial.text}
          </span>
        )}
        <button onClick={signOut} className="flex w-full items-center gap-3 border-t border-line px-4 py-2.5 text-left text-body-sm text-ink hover:bg-accent-soft/50">
          <LogOut className="h-4 w-4 text-muted" strokeWidth={1.75} /> Sign out
        </button>
      </div>
    </>
  )

  return (
    <div className="min-h-dvh">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-line bg-card px-4 py-6 lg:flex">
        <Link href="/space" aria-label="Workspace home" className="px-2"><Logo variant="sidebar" /></Link>
        <nav className="mt-8 flex flex-1 flex-col gap-1" aria-label="Workspace"><PrimaryNav /></nav>
        <Link href="/family/add" className="mt-4 flex items-center justify-center gap-2 rounded-sm border border-line py-2.5 text-body-sm font-semibold text-ink transition-colors hover:bg-accent-soft/50">
          <UserPlus className="h-4 w-4" strokeWidth={1.75} /> Add someone
        </Link>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-line bg-ivory/90 px-5 backdrop-blur-xl lg:hidden">
        <Link href="/space" aria-label="Workspace home"><Logo variant="sidebar" /></Link>
        <div className="relative flex items-center gap-1">
          <Link href="/family/add" aria-label="Add someone" className="grid h-11 w-11 place-items-center rounded-full text-muted transition-colors hover:bg-accent-soft/60 hover:text-green">
            <UserPlus className="h-6 w-6" strokeWidth={1.5} />
          </Link>
          <button onClick={() => setMenuOpen((v) => !v)} aria-label="Account" aria-expanded={menuOpen} className="grid h-9 w-9 place-items-center rounded-full bg-green text-body-sm font-semibold text-ivory focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green/40 focus-visible:ring-offset-2">
            {initials}
          </button>
          {menuOpen && <AccountMenu />}
        </div>
      </header>

      {/* Desktop account button (top-right, over content) */}
      <div className="fixed right-6 top-5 z-30 hidden lg:block">
        <div className="relative">
          <button onClick={() => setMenuOpen((v) => !v)} aria-label="Account" aria-expanded={menuOpen} className="grid h-9 w-9 place-items-center rounded-full bg-green text-body-sm font-semibold text-ivory focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green/40 focus-visible:ring-offset-2 shadow-sm">
            {initials}
          </button>
          {menuOpen && <AccountMenu />}
        </div>
      </div>

      {/* Main */}
      <div className="lg:pl-64">
        <main id="main" className="mx-auto max-w-4xl px-5 pb-28 pt-6 sm:px-6 lg:px-10 lg:pb-16 lg:pt-10">{children}</main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex items-stretch border-t border-line bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden" aria-label="Workspace">
        <PrimaryNav iconsOnly />
      </nav>
    </div>
  )
}
