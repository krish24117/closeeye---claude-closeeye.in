'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Sparkles, Activity, IndianRupee, CalendarCheck, ShieldCheck, Users, UserPlus, CreditCard,
  MapPin, FileText, ScrollText, Menu, X, ArrowUpRight, Rocket, Sunrise, Brain, ShieldAlert,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Logo } from '@/components/ui/logo'
import { Avatar } from '@/components/family/avatar'
import { Overlay } from '@/components/family/overlay'
import { UserMenu } from '@/components/ui/user-menu'
import { useFamilyData } from '@/components/family/family-data-provider'
import { cn } from '@/lib/utils'

const NAV: { href: string; label: string; icon: LucideIcon; match: (p: string) => boolean }[] = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, match: (p) => p === '/admin' },
  { href: '/admin/briefing', label: 'Briefing', icon: Sunrise, match: (p) => p.startsWith('/admin/briefing') },
  { href: '/admin/insights', label: 'Insights', icon: Sparkles, match: (p) => p.startsWith('/admin/insights') },
  { href: '/admin/understanding', label: 'Understanding', icon: Brain, match: (p) => p.startsWith('/admin/understanding') },
  { href: '/admin/abuse', label: 'Abuse guards', icon: ShieldAlert, match: (p) => p.startsWith('/admin/abuse') },
  { href: '/admin/operations', label: 'Operations', icon: Activity, match: (p) => p.startsWith('/admin/operations') },
  { href: '/admin/finance', label: 'Finance', icon: IndianRupee, match: (p) => p.startsWith('/admin/finance') },
  { href: '/admin/bookings', label: 'Bookings', icon: CalendarCheck, match: (p) => p.startsWith('/admin/bookings') },
  { href: '/admin/care-team', label: 'Care Team', icon: ShieldCheck, match: (p) => p.startsWith('/admin/care-team') },
  { href: '/admin/families', label: 'Families', icon: Users, match: (p) => p.startsWith('/admin/families') },
  { href: '/admin/leads', label: 'Leads', icon: UserPlus, match: (p) => p.startsWith('/admin/leads') },
  { href: '/admin/founder', label: 'Founder', icon: Rocket, match: (p) => p.startsWith('/admin/founder') },
  { href: '/admin/memberships', label: 'Memberships', icon: CreditCard, match: (p) => p.startsWith('/admin/memberships') },
  { href: '/admin/coverage', label: 'Coverage', icon: MapPin, match: (p) => p.startsWith('/admin/coverage') },
  { href: '/admin/content', label: 'Content', icon: FileText, match: (p) => p.startsWith('/admin/content') },
  { href: '/admin/audit', label: 'Audit Logs', icon: ScrollText, match: (p) => p.startsWith('/admin/audit') },
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
          </Link>
        )
      })}
    </nav>
  )
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { identity } = useFamilyData()
  const [menu, setMenu] = React.useState(false)

  const menuProps = {
    name: identity.fullName,
    email: identity.email,
    avatarUrl: identity.avatarUrl,
    initials: identity.initials,
    roleLabel: 'Super Admin',
    profileHref: '/admin',
    accountHref: '/admin',
    notificationsHref: '/admin',
    avatarTone: 'solid' as const,
  }

  const SidebarInner = (
    <>
      <Link href="/admin" className="flex items-center gap-2.5 px-6 py-5" onClick={() => setMenu(false)}>
        <Logo variant="sidebar" sublabel="Operations Admin" />
      </Link>
      <NavList pathname={pathname} onNavigate={() => setMenu(false)} />
      <div className="m-3 flex flex-col gap-2">
        <Link href="/pm" className="flex items-center gap-2 rounded-md border border-line bg-ivory px-3 py-2.5 text-caption font-semibold text-ink transition-colors hover:border-green/40">
          <ArrowUpRight className="h-4 w-4 text-green" strokeWidth={1.75} /> Presence Console
        </Link>
        <div className="flex items-center gap-3 rounded-md border border-line bg-ivory p-3">
          <Avatar initials={identity.initials} src={identity.avatarUrl} alt={identity.fullName} size="sm" tone="solid" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-body-sm font-semibold text-ink">{identity.fullName}</p>
            <p className="truncate text-caption text-muted">Super Admin</p>
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
            <div className="flex-1" />
            <div className="ml-auto flex items-center gap-1">
              <UserMenu {...menuProps} loginPath="/auth" className="ml-1" />
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
    </div>
  )
}
