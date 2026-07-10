'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Users, CalendarClock, ShieldCheck, MessageCircle, MessagesSquare, TriangleAlert,
  CalendarDays, BarChart3, Siren, Menu, X, Ambulance, Headset,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { LogoMark } from '@/components/ui/logo'
import { Avatar } from '@/components/family/avatar'
import { Overlay } from '@/components/family/overlay'
import { UserMenu } from '@/components/ui/user-menu'
import { useFamilyData } from '@/components/family/family-data-provider'
import { SITE } from '@/lib/site'
import { cn } from '@/lib/utils'

const NAV: { href: string; label: string; icon: LucideIcon; match: (p: string) => boolean }[] = [
  { href: '/console', label: 'Dashboard', icon: LayoutDashboard, match: (p) => p === '/console' },
  { href: '/console/families', label: 'Families', icon: Users, match: (p) => p.startsWith('/console/families') },
  { href: '/console/visits', label: "Today's Visits", icon: CalendarClock, match: (p) => p.startsWith('/console/visits') },
  { href: '/console/guardians', label: 'Care Team', icon: ShieldCheck, match: (p) => p.startsWith('/console/guardians') },
  { href: '/console/messages', label: 'Messages', icon: MessageCircle, match: (p) => p.startsWith('/console/messages') },
  { href: '/console/guardian-messages', label: 'Guardian chat', icon: MessagesSquare, match: (p) => p.startsWith('/console/guardian-messages') },
  { href: '/console/escalations', label: 'Escalations', icon: TriangleAlert, match: (p) => p.startsWith('/console/escalations') },
  { href: '/console/calendar', label: 'Calendar', icon: CalendarDays, match: (p) => p.startsWith('/console/calendar') },
  { href: '/console/reports', label: 'Reports', icon: BarChart3, match: (p) => p.startsWith('/console/reports') },
]

function NavList({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav className="flex flex-1 flex-col gap-1 px-3">
      {NAV.map((item) => {
        const active = item.match(pathname)
        const Icon = item.icon
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex items-center gap-3 rounded-sm px-3 py-2.5 text-body-sm font-medium transition-colors',
              active ? 'bg-accent-soft text-green' : 'text-muted hover:bg-ink/[0.03] hover:text-ink',
            )}
          >
            <Icon className="h-5 w-5 shrink-0" strokeWidth={active ? 2 : 1.75} />
            <span className="flex-1">{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}

export function ConsoleShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { identity } = useFamilyData()
  const [menu, setMenu] = React.useState(false)
  const [sos, setSos] = React.useState(false)

  const menuProps = {
    name: identity.fullName,
    email: identity.email,
    avatarUrl: identity.avatarUrl,
    initials: identity.initials,
    roleLabel: 'Presence Manager',
    profileHref: '/console',
    accountHref: '/console',
    notificationsHref: '/console',
  }

  const SidebarInner = (
    <>
      <Link href="/console" className="flex items-center gap-2.5 px-6 py-5" onClick={() => setMenu(false)}>
        <LogoMark className="h-8 w-8 shrink-0" />
        <span className="flex flex-col leading-none">
          <span className="text-[1.15rem] font-extrabold lowercase leading-none tracking-[-0.02em] text-ink">close eye</span>
          <span className="mt-1 text-[0.6rem] font-semibold uppercase tracking-[0.16em] text-muted">Presence Console</span>
        </span>
      </Link>
      <NavList pathname={pathname} onNavigate={() => setMenu(false)} />
      <div className="m-3 flex items-center gap-3 rounded-md border border-line bg-ivory p-3">
        <Avatar initials={identity.initials} src={identity.avatarUrl} alt={identity.fullName} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-body-sm font-semibold text-ink">{identity.fullName}</p>
          <p className="truncate text-caption text-muted">Presence Manager</p>
        </div>
        <span className="h-2 w-2 rounded-full bg-success" aria-label="Online" />
      </div>
    </>
  )

  return (
    <div className="min-h-dvh bg-ivory lg:flex">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-line bg-card lg:flex">{SidebarInner}</aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-30 border-b border-line bg-ivory/90 backdrop-blur-xl">
          <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
            <button type="button" onClick={() => setMenu(true)} className="grid h-10 w-10 place-items-center rounded-full text-ink hover:bg-ink/[0.04] lg:hidden" aria-label="Menu">
              <Menu className="h-5 w-5" strokeWidth={1.75} />
            </button>

            <div className="flex-1" />

            <div className="ml-auto flex items-center gap-1">
              <button type="button" onClick={() => setSos(true)} className="grid h-10 w-10 place-items-center rounded-full border border-error/30 text-error hover:bg-error/10" aria-label="Emergency">
                <Siren className="h-5 w-5" strokeWidth={1.75} />
              </button>
              <UserMenu {...menuProps} className="ml-1" />
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>

      {/* Mobile nav drawer */}
      <Overlay open={menu} onClose={() => setMenu(false)}>
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <span className="text-body-sm font-bold text-ink">Presence Console</span>
          <button onClick={() => setMenu(false)} aria-label="Close" className="grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-accent-soft"><X className="h-5 w-5" strokeWidth={1.5} /></button>
        </div>
        <div className="flex max-h-[70vh] flex-col overflow-y-auto py-3">{SidebarInner}</div>
      </Overlay>

      {/* Emergency — real numbers only (108 + CloseEye support line). */}
      <Overlay open={sos} onClose={() => setSos(false)}>
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-error/10 text-error"><Siren className="h-5 w-5" strokeWidth={1.5} /></span>
            <h2 className="text-h4">Emergency</h2>
          </div>
          <button onClick={() => setSos(false)} aria-label="Close" className="grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-accent-soft"><X className="h-5 w-5" strokeWidth={1.5} /></button>
        </div>
        <div className="flex flex-col gap-3 px-6 py-5">
          <a href="tel:108" className="flex min-h-[3.5rem] items-center justify-center gap-2 rounded-sm bg-error py-4 text-body font-semibold text-ivory hover:opacity-90"><Ambulance className="h-5 w-5" strokeWidth={1.75} /> Emergency services · 108</a>
          <a href={SITE.phoneHref} className="flex min-h-[3.25rem] items-center justify-center gap-2 rounded-sm border border-line py-3 text-body font-semibold text-ink hover:border-accent"><Headset className="h-5 w-5 text-green" strokeWidth={1.75} /> Call {SITE.name} support</a>
        </div>
      </Overlay>
    </div>
  )
}
