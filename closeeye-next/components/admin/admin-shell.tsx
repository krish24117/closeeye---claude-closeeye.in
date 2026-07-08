'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Sparkles, Activity, IndianRupee, CalendarCheck, ShieldCheck, Users, CreditCard,
  MapPin, FileText, ScrollText, Settings, Search, Bell, Menu, X, ArrowRight, ArrowUpRight,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { LogoMark } from '@/components/ui/logo'
import { Avatar } from '@/components/family/avatar'
import { Overlay } from '@/components/family/overlay'
import { ADMIN, ALERTS, FAMILIES } from '@/lib/admin-data'
import { cn } from '@/lib/utils'

const NAV: { href: string; label: string; icon: LucideIcon; match: (p: string) => boolean; badge?: number }[] = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, match: (p) => p === '/admin' },
  { href: '/admin/insights', label: 'Insights', icon: Sparkles, match: (p) => p.startsWith('/admin/insights') },
  { href: '/admin/operations', label: 'Operations', icon: Activity, match: (p) => p.startsWith('/admin/operations') },
  { href: '/admin/finance', label: 'Finance', icon: IndianRupee, match: (p) => p.startsWith('/admin/finance') },
  { href: '/admin/bookings', label: 'Bookings', icon: CalendarCheck, match: (p) => p.startsWith('/admin/bookings') },
  { href: '/admin/care-team', label: 'Care Team', icon: ShieldCheck, match: (p) => p.startsWith('/admin/care-team') },
  { href: '/admin/families', label: 'Families', icon: Users, match: (p) => p.startsWith('/admin/families') },
  { href: '/admin/memberships', label: 'Memberships', icon: CreditCard, match: (p) => p.startsWith('/admin/memberships') },
  { href: '/admin/coverage', label: 'Coverage', icon: MapPin, match: (p) => p.startsWith('/admin/coverage') },
  { href: '/admin/content', label: 'Content', icon: FileText, match: (p) => p.startsWith('/admin/content') },
  { href: '/admin/audit', label: 'Audit Logs', icon: ScrollText, match: (p) => p.startsWith('/admin/audit') },
  { href: '/admin/settings', label: 'Settings', icon: Settings, match: (p) => p.startsWith('/admin/settings') },
]

function NavList({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav className="flex flex-1 flex-col gap-0.5 px-3">
      {NAV.map((item) => {
        const active = item.match(pathname)
        const Icon = item.icon
        return (
          <Link key={item.href} href={item.href} onClick={onNavigate} aria-current={active ? 'page' : undefined}
            className={cn('flex items-center gap-3 rounded-sm px-3 py-2.5 text-body-sm font-medium transition-colors', active ? 'bg-accent-soft text-green' : 'text-muted hover:bg-ink/[0.03] hover:text-ink')}>
            <Icon className="h-5 w-5 shrink-0" strokeWidth={active ? 2 : 1.75} />
            <span className="flex-1">{item.label}</span>
            {item.badge ? <span className="grid h-5 min-w-5 place-items-center rounded-full bg-error px-1 text-[0.6rem] font-bold text-ivory">{item.badge}</span> : null}
          </Link>
        )
      })}
    </nav>
  )
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [menu, setMenu] = React.useState(false)
  const [notif, setNotif] = React.useState(false)
  const [q, setQ] = React.useState('')
  const highAlerts = ALERTS.filter((a) => a.severity === 'high').length

  const query = q.trim().toLowerCase()
  const results = query
    ? FAMILIES.filter((f) => `${f.familyName} ${f.memberName} ${f.area}`.toLowerCase().includes(query)).slice(0, 5)
    : []

  const SidebarInner = (
    <>
      <Link href="/admin" className="flex items-center gap-2.5 px-6 py-5" onClick={() => setMenu(false)}>
        <LogoMark className="h-8 w-8 shrink-0" />
        <span className="flex flex-col leading-none">
          <span className="text-[1.15rem] font-extrabold lowercase leading-none tracking-[-0.02em] text-ink">close eye</span>
          <span className="mt-1 text-[0.6rem] font-semibold uppercase tracking-[0.16em] text-muted">Operations Admin</span>
        </span>
      </Link>
      <NavList pathname={pathname} onNavigate={() => setMenu(false)} />
      <div className="m-3 flex flex-col gap-2">
        <Link href="/console" className="flex items-center gap-2 rounded-md border border-line bg-ivory px-3 py-2.5 text-caption font-semibold text-ink transition-colors hover:border-green/40">
          <ArrowUpRight className="h-4 w-4 text-green" strokeWidth={1.75} /> Presence Console
        </Link>
        <div className="flex items-center gap-3 rounded-md border border-line bg-ivory p-3">
          <Avatar initials={ADMIN.initials} size="sm" tone="solid" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-body-sm font-semibold text-ink">{ADMIN.name}</p>
            <p className="truncate text-caption text-muted">{ADMIN.role}</p>
          </div>
        </div>
      </div>
    </>
  )

  return (
    <div className="min-h-dvh bg-ivory lg:flex">
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-line bg-card lg:flex">{SidebarInner}</aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-line bg-ivory/90 backdrop-blur-xl">
          <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
            <button type="button" onClick={() => setMenu(true)} className="grid h-10 w-10 place-items-center rounded-full text-ink hover:bg-ink/[0.04] lg:hidden" aria-label="Menu">
              <Menu className="h-5 w-5" strokeWidth={1.75} />
            </button>
            <div className="relative max-w-md flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" strokeWidth={1.75} />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search families, invoices, a city…" className="w-full rounded-full border border-line bg-card py-2.5 pl-10 pr-16 text-body-sm text-ink placeholder:text-muted/70 focus:border-green focus:outline-none focus:ring-2 focus:ring-green/20" />
              <Link href="/search" aria-label="Global search" className="absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded border border-line bg-ivory px-1.5 py-0.5 text-[0.65rem] font-semibold text-muted transition-colors hover:text-green sm:block">⌘K</Link>
              {results.length > 0 && (
                <div className="absolute left-0 right-0 top-12 z-40 overflow-hidden rounded-md border border-line bg-card shadow-lg">
                  {results.map((f) => (
                    <Link key={f.id} href={`/console/families/${f.id}`} onClick={() => setQ('')} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-accent-soft/40">
                      <span className="min-w-0 flex-1"><span className="block truncate text-body-sm font-semibold text-ink">{f.memberName}</span><span className="block truncate text-caption text-muted">{f.familyName} · {f.area}</span></span>
                      <ArrowRight className="h-4 w-4 shrink-0 text-muted" strokeWidth={1.5} />
                    </Link>
                  ))}
                </div>
              )}
            </div>
            <div className="ml-auto flex items-center gap-1">
              <button type="button" onClick={() => setNotif(true)} className="relative grid h-10 w-10 place-items-center rounded-full text-ink hover:bg-ink/[0.04]" aria-label="Attention center">
                <Bell className="h-5 w-5" strokeWidth={1.75} />
                {highAlerts > 0 && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-error ring-2 ring-ivory" />}
              </button>
              <Avatar initials={ADMIN.initials} size="sm" tone="solid" className="ml-1" />
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>

      <Overlay open={menu} onClose={() => setMenu(false)}>
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <span className="text-body-sm font-bold text-ink">Operations Admin</span>
          <button onClick={() => setMenu(false)} aria-label="Close" className="grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-accent-soft"><X className="h-5 w-5" strokeWidth={1.5} /></button>
        </div>
        <div className="flex max-h-[75vh] flex-col overflow-y-auto py-3">{SidebarInner}</div>
      </Overlay>

      <Overlay open={notif} onClose={() => setNotif(false)}>
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <h2 className="text-h4">Attention center</h2>
          <button onClick={() => setNotif(false)} aria-label="Close" className="grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-accent-soft"><X className="h-5 w-5" strokeWidth={1.5} /></button>
        </div>
        <ul className="max-h-[70vh] overflow-y-auto">
          {ALERTS.map((a) => (
            <li key={a.id} className="border-b border-line px-6 py-3.5 last:border-b-0">
              <p className="text-body-sm font-semibold text-ink">{a.title}</p>
              <p className="text-caption text-muted">{a.action}</p>
            </li>
          ))}
        </ul>
      </Overlay>
    </div>
  )
}
