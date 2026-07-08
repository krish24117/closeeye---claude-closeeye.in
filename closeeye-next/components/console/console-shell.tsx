'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Users, CalendarClock, ShieldCheck, MessageCircle, TriangleAlert,
  CalendarDays, BarChart3, Settings, Search, Bell, Siren, Menu, X, Phone, Ambulance, Headset, ArrowRight,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { LogoMark } from '@/components/ui/logo'
import { Avatar } from '@/components/family/avatar'
import { Overlay } from '@/components/family/overlay'
import { PM, FAMILIES, GUARDIANS, ACTIVITY, STATS, guardianById } from '@/lib/console-data'
import { cn } from '@/lib/utils'

const NAV: { href: string; label: string; icon: LucideIcon; match: (p: string) => boolean; badge?: number }[] = [
  { href: '/console', label: 'Dashboard', icon: LayoutDashboard, match: (p) => p === '/console' },
  { href: '/console/families', label: 'Families', icon: Users, match: (p) => p.startsWith('/console/families') },
  { href: '/console/visits', label: "Today's Visits", icon: CalendarClock, match: (p) => p.startsWith('/console/visits') },
  { href: '/console/guardians', label: 'Care Team', icon: ShieldCheck, match: (p) => p.startsWith('/console/guardians') },
  { href: '/console/messages', label: 'Messages', icon: MessageCircle, match: (p) => p.startsWith('/console/messages') },
  { href: '/console/escalations', label: 'Escalations', icon: TriangleAlert, match: (p) => p.startsWith('/console/escalations'), badge: STATS.highPriority },
  { href: '/console/calendar', label: 'Calendar', icon: CalendarDays, match: (p) => p.startsWith('/console/calendar') },
  { href: '/console/reports', label: 'Reports', icon: BarChart3, match: (p) => p.startsWith('/console/reports') },
  { href: '/console/settings', label: 'Settings', icon: Settings, match: (p) => p.startsWith('/console/settings') },
]

const NOTIF_ICON: Record<string, LucideIcon> = {
  checkin: ShieldCheck, completed: CalendarClock, voice: MessageCircle, photo: Users, request: MessageCircle, story: BarChart3, escalation: TriangleAlert, appointment: CalendarDays, delay: TriangleAlert,
}

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
            {item.badge ? <span className="grid h-5 min-w-5 place-items-center rounded-full bg-error px-1 text-[0.6rem] font-bold text-ivory">{item.badge}</span> : null}
          </Link>
        )
      })}
    </nav>
  )
}

export function ConsoleShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [menu, setMenu] = React.useState(false)
  const [notif, setNotif] = React.useState(false)
  const [sos, setSos] = React.useState(false)
  const [q, setQ] = React.useState('')

  const query = q.trim().toLowerCase()
  const results = query
    ? [
        ...FAMILIES.filter((f) => `${f.familyName} ${f.memberName} ${f.area} ${f.phone}`.toLowerCase().includes(query)).slice(0, 4).map((f) => ({ href: `/console/families/${f.id}`, title: f.memberName, sub: `${f.familyName} · ${f.area}` })),
        ...GUARDIANS.filter((g) => `${g.name} ${g.city}`.toLowerCase().includes(query)).slice(0, 3).map((g) => ({ href: '/console/guardians', title: g.name, sub: `Guardian · ${g.city}` })),
      ]
    : []

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
        <Avatar initials={PM.initials} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-body-sm font-semibold text-ink">{PM.name}</p>
          <p className="truncate text-caption text-muted">{PM.role}</p>
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

            <div className="relative max-w-md flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" strokeWidth={1.75} />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search families, guardians, a city…"
                className="w-full rounded-full border border-line bg-card py-2.5 pl-10 pr-16 text-body-sm text-ink placeholder:text-muted/70 focus:border-green focus:outline-none focus:ring-2 focus:ring-green/20"
              />
              <Link href="/search" aria-label="Global search" className="pointer-events-auto absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded border border-line bg-ivory px-1.5 py-0.5 text-[0.65rem] font-semibold text-muted transition-colors hover:text-green sm:block">⌘K</Link>
              {results.length > 0 && (
                <div className="absolute left-0 right-0 top-12 z-40 overflow-hidden rounded-md border border-line bg-card shadow-lg">
                  {results.map((r) => (
                    <Link key={r.href + r.title} href={r.href} onClick={() => setQ('')} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-accent-soft/40">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-body-sm font-semibold text-ink">{r.title}</span>
                        <span className="block truncate text-caption text-muted">{r.sub}</span>
                      </span>
                      <ArrowRight className="h-4 w-4 shrink-0 text-muted" strokeWidth={1.5} />
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <div className="ml-auto flex items-center gap-1">
              <button type="button" onClick={() => setNotif(true)} className="relative grid h-10 w-10 place-items-center rounded-full text-ink hover:bg-ink/[0.04]" aria-label="Notifications">
                <Bell className="h-5 w-5" strokeWidth={1.75} />
                <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-success ring-2 ring-ivory" />
              </button>
              <button type="button" onClick={() => setSos(true)} className="grid h-10 w-10 place-items-center rounded-full border border-error/30 text-error hover:bg-error/10" aria-label="Emergency">
                <Siren className="h-5 w-5" strokeWidth={1.75} />
              </button>
              <Avatar initials={PM.initials} size="sm" className="ml-1" />
            </div>
          </div>

          {/* Contextual high-priority banner (calm, not alarming) */}
          {STATS.highPriority > 0 && (
            <Link href="/console/escalations" className="flex items-center gap-2 border-t border-warning/30 bg-warning/[0.08] px-6 py-2 text-caption font-medium text-warning transition-colors hover:bg-warning/[0.12]">
              <TriangleAlert className="h-4 w-4 shrink-0" strokeWidth={1.75} />
              {STATS.highPriority} {STATS.highPriority === 1 ? 'family needs' : 'families need'} attention today
              <span className="ml-auto inline-flex items-center gap-1 font-semibold">Review <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} /></span>
            </Link>
          )}
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

      {/* Notifications */}
      <Overlay open={notif} onClose={() => setNotif(false)}>
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <h2 className="text-h4">Notifications</h2>
          <button onClick={() => setNotif(false)} aria-label="Close" className="grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-accent-soft"><X className="h-5 w-5" strokeWidth={1.5} /></button>
        </div>
        <ul className="max-h-[70vh] overflow-y-auto">
          {ACTIVITY.map((n) => {
            const Icon = NOTIF_ICON[n.kind] ?? Bell
            return (
              <li key={n.id} className="flex gap-3 border-b border-line px-6 py-3.5 last:border-b-0">
                <span className={cn('mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full', n.kind === 'escalation' || n.kind === 'delay' ? 'bg-warning/12 text-warning' : 'bg-accent-soft text-green')}>
                  <Icon className="h-4 w-4" strokeWidth={1.75} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-body-sm text-ink">{n.text}</p>
                  <p className="mt-0.5 text-caption text-muted">{n.timeLabel}</p>
                </div>
              </li>
            )
          })}
        </ul>
      </Overlay>

      {/* Emergency */}
      <Overlay open={sos} onClose={() => setSos(false)}>
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-error/10 text-error"><Siren className="h-5 w-5" strokeWidth={1.5} /></span>
            <h2 className="text-h4">Emergency</h2>
          </div>
          <button onClick={() => setSos(false)} aria-label="Close" className="grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-accent-soft"><X className="h-5 w-5" strokeWidth={1.5} /></button>
        </div>
        <div className="flex flex-col gap-3 px-6 py-5">
          <a href={`tel:${guardianById('g-arjun')?.phone.replace(/\s/g, '')}`} className="flex min-h-[3.25rem] items-center justify-center gap-2 rounded-sm border border-line py-3 text-body font-semibold text-ink hover:border-accent"><ShieldCheck className="h-5 w-5 text-green" strokeWidth={1.75} /> Call the Guardian</a>
          <a href="tel:+919000221261" className="flex min-h-[3.25rem] items-center justify-center gap-2 rounded-sm border border-line py-3 text-body font-semibold text-ink hover:border-accent"><Phone className="h-5 w-5 text-green" strokeWidth={1.75} /> Call the family</a>
          <a href="tel:+914040404040" className="flex min-h-[3.25rem] items-center justify-center gap-2 rounded-sm border border-line py-3 text-body font-semibold text-ink hover:border-accent"><Headset className="h-5 w-5 text-green" strokeWidth={1.75} /> Notify Operations</a>
          <a href="tel:108" className="flex min-h-[3.5rem] items-center justify-center gap-2 rounded-sm bg-error py-4 text-body font-semibold text-ivory hover:opacity-90"><Ambulance className="h-5 w-5" strokeWidth={1.75} /> Emergency services · 108</a>
        </div>
      </Overlay>
    </div>
  )
}
