'use client'

/**
 * Operations Workspace shell. The navigation is organized into SECTIONS (a future-proof structure:
 * add a module — Partners, Billing, Compliance, AI — by appending one entry, no restructuring) and
 * each section may carry sub-items shown when it is active. Every destination is an EXISTING admin
 * route; this shell only reorganizes and deep-links — it rebuilds nothing. Cloza has a single
 * reserved home in the rail (<ClozaSlot/>) so the copilot can drop in during Phase ③ untouched.
 */
import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Rocket, Activity, ShieldCheck, Headset, BarChart3, IndianRupee, MapPin, Users, Settings, Menu, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Logo } from '@/components/ui/logo'
import { Avatar } from '@/components/family/avatar'
import { Overlay } from '@/components/family/overlay'
import { UserMenu } from '@/components/ui/user-menu'
import { useFamilyData } from '@/components/family/family-data-provider'
import { ClozaSlot } from '@/components/admin/cloza-slot'
import { cn } from '@/lib/utils'

interface SubItem { href: string; label: string }
interface Section { label: string; icon: LucideIcon; href: string; children?: SubItem[] }

// The 9 approved sections. Every href is an existing route; `children` are the pages that live under
// a section. To add a module later, append a Section — the layout absorbs it with no redesign.
const SECTIONS: Section[] = [
  { label: 'Founder', icon: Rocket, href: '/admin/founder' },
  { label: 'Operations', icon: Activity, href: '/admin/operations', children: [
    { href: '/admin/operations', label: 'Overview' }, { href: '/admin/bookings', label: 'Bookings' } ] },
  { label: 'Guardian', icon: ShieldCheck, href: '/admin/guardian', children: [
    { href: '/admin/guardian', label: 'Overview' }, { href: '/admin/care-team', label: 'Care Team' } ] },
  { label: 'Presence Manager', icon: Headset, href: '/admin/presence' },
  { label: 'Analytics', icon: BarChart3, href: '/admin/insights', children: [
    { href: '/admin/insights', label: 'Insights' }, { href: '/admin/understanding', label: 'Understanding' }, { href: '/admin/briefing', label: 'Briefing' } ] },
  { label: 'Finance', icon: IndianRupee, href: '/admin/finance', children: [
    { href: '/admin/finance', label: 'Overview' }, { href: '/admin/memberships', label: 'Memberships' } ] },
  { label: 'Coverage', icon: MapPin, href: '/admin/coverage' },
  { label: 'Users', icon: Users, href: '/admin/families', children: [
    { href: '/admin/families', label: 'Families' }, { href: '/admin/leads', label: 'Leads' } ] },
  { label: 'Settings', icon: Settings, href: '/admin/settings', children: [
    { href: '/admin/settings', label: 'General' }, { href: '/admin/content', label: 'Content' }, { href: '/admin/audit', label: 'Audit Logs' }, { href: '/admin/abuse', label: 'Abuse Guards' } ] },
]

const hrefActive = (pathname: string, href: string) => pathname === href || pathname.startsWith(href + '/')
const sectionActive = (pathname: string, s: Section) =>
  [s.href, ...(s.children?.map((c) => c.href) ?? [])].some((h) => hrefActive(pathname, h))

function NavList({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 py-1">
      {SECTIONS.map((s) => {
        const active = sectionActive(pathname, s)
        const Icon = s.icon
        return (
          <div key={s.label}>
            <Link href={s.href} onClick={onNavigate} aria-current={active && hrefActive(pathname, s.href) ? 'page' : undefined}
              className={cn('flex items-center gap-3 rounded-sm px-3 py-2.5 text-body-sm font-medium transition-colors', active ? 'bg-accent-soft text-green' : 'text-muted hover:bg-ink/[0.03] hover:text-ink')}>
              <Icon className="h-5 w-5 shrink-0" strokeWidth={active ? 2 : 1.75} />
              <span className="flex-1">{s.label}</span>
            </Link>
            {active && s.children && s.children.length > 1 && (
              <div className="mb-1 ms-3.5 flex flex-col gap-0.5 border-s border-line ps-3 pt-0.5">
                {s.children.map((c) => {
                  const on = hrefActive(pathname, c.href)
                  return (
                    <Link key={c.href} href={c.href} onClick={onNavigate} aria-current={on ? 'page' : undefined}
                      className={cn('rounded-sm px-2.5 py-1.5 text-caption font-medium transition-colors', on ? 'text-green' : 'text-muted hover:text-ink')}>
                      {c.label}
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
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
        <Logo variant="sidebar" sublabel="Operations" />
      </Link>
      <NavList pathname={pathname} onNavigate={() => setMenu(false)} />
      <div className="m-3 flex flex-col gap-2">
        <ClozaSlot />
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
          <span className="text-body-sm font-bold text-ink">Operations</span>
          <button onClick={() => setMenu(false)} aria-label="Close" className="grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-accent-soft"><X className="h-5 w-5" strokeWidth={1.5} /></button>
        </div>
        <div className="flex max-h-[75vh] flex-col overflow-y-auto py-3">{SidebarInner}</div>
      </Overlay>
    </div>
  )
}
