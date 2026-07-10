'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home,
  Users,
  CalendarDays,
  FolderLock,
  BadgeCheck,
  MessageCircle,
  Settings,
  User,
  Bell,
  Siren,
  Phone,
  MapPin,
  Stethoscope,
  X,
} from 'lucide-react'
import { Logo } from '@/components/ui/logo'
import { Avatar } from '@/components/family/avatar'
import { Overlay } from '@/components/family/overlay'
import { AvatarLink } from '@/components/ui/avatar-link'
import { useFamilyData } from '@/components/family/family-data-provider'
import { SITE } from '@/lib/site'
import type { LovedOne } from '@/lib/db/types'
import { cn } from '@/lib/utils'

const DESKTOP_NAV = [
  { href: '/family', label: 'Overview', icon: Home },
  { href: '/family/members', label: 'Family', icon: Users },
  { href: '/family/visits', label: 'Visits', icon: CalendarDays },
  { href: '/family/documents', label: 'Documents', icon: FolderLock },
  { href: '/family/membership', label: 'Membership', icon: BadgeCheck },
  { href: '/family/connect', label: 'Connect', icon: MessageCircle },
  { href: '/family/profile', label: 'Settings', icon: Settings },
]

const MOBILE_NAV = [
  { href: '/family', label: 'Home', icon: Home },
  { href: '/family/members', label: 'Family', icon: Users },
  { href: '/family/visits', label: 'Visits', icon: CalendarDays },
  { href: '/family/connect', label: 'Connect', icon: MessageCircle },
  { href: '/family/profile', label: 'Profile', icon: User },
]

function isActive(pathname: string, href: string) {
  return href === '/family' ? pathname === '/family' : pathname.startsWith(href)
}

export function FamilyShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { lovedOnes, identity } = useFamilyData()
  const [emergency, setEmergency] = useState(false)
  const [notif, setNotif] = useState(false)
  // Real notifications feed isn't wired yet — show 0 rather than a fabricated count.
  const unread = 0

  return (
    <div className="min-h-dvh bg-ivory">
      {/* ── Desktop sidebar ─────────────────────────────────────────────── */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-line bg-card px-4 py-6 lg:flex">
        <div className="flex items-center justify-between px-2">
          <Link href="/family" aria-label="Family Space home">
            <Logo />
          </Link>
          <div className="flex items-center gap-1">
            <BellButton count={unread} onClick={() => setNotif(true)} />
            <AvatarLink href="/family/profile" initials={identity.initials} avatarUrl={identity.avatarUrl} name={identity.fullName} />
          </div>
        </div>

        <nav className="mt-8 flex flex-1 flex-col gap-1" aria-label="Family Space">
          {DESKTOP_NAV.map((item) => {
            const active = isActive(pathname, item.href)
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-3 rounded-sm px-3 py-2.5 text-body-sm font-medium transition-colors',
                  active ? 'bg-accent-soft text-green' : 'text-muted hover:bg-accent-soft/50 hover:text-ink',
                )}
              >
                <Icon className="h-5 w-5" strokeWidth={1.5} />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <PresenceManagerMini />

        <button
          type="button"
          onClick={() => setEmergency(true)}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-sm border border-error/30 py-3 text-body-sm font-semibold text-error transition-colors hover:bg-error/5"
        >
          <Siren className="h-5 w-5" strokeWidth={1.5} /> Emergency
        </button>
      </aside>

      {/* ── Mobile top bar ──────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-line bg-ivory/90 px-5 backdrop-blur-xl lg:hidden">
        <Link href="/family" aria-label="Family Space home">
          <Logo />
        </Link>
        <div className="flex items-center gap-1">
          <BellButton count={unread} onClick={() => setNotif(true)} />
          <button
            type="button"
            onClick={() => setEmergency(true)}
            aria-label="Emergency"
            className="grid h-11 w-11 place-items-center rounded-full text-error transition-colors hover:bg-error/10"
          >
            <Siren className="h-6 w-6" strokeWidth={1.5} />
          </button>
          <AvatarLink href="/family/profile" initials={identity.initials} avatarUrl={identity.avatarUrl} name={identity.fullName} />
        </div>
      </header>

      {/* ── Main ────────────────────────────────────────────────────────── */}
      <div className="lg:pl-64">
        <main id="main" className="mx-auto max-w-4xl px-5 pb-28 pt-6 sm:px-6 lg:px-10 lg:pb-16 lg:pt-10">
          {children}
        </main>
      </div>

      {/* ── Mobile bottom nav ───────────────────────────────────────────── */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 flex h-[calc(4.5rem+env(safe-area-inset-bottom))] items-stretch border-t border-line bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden"
        aria-label="Family Space"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {MOBILE_NAV.map((item) => {
          const active = isActive(pathname, item.href)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex flex-1 flex-col items-center justify-center gap-1 text-[0.7rem] font-medium transition-colors',
                active ? 'text-green' : 'text-muted',
              )}
            >
              <Icon className="h-6 w-6" strokeWidth={active ? 2 : 1.5} />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <NotifPanel open={notif} onClose={() => setNotif(false)} />
      <EmergencySheet open={emergency} onClose={() => setEmergency(false)} lovedOnes={lovedOnes} />
    </div>
  )
}

function BellButton({ count, onClick }: { count: number; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Notifications${count ? `, ${count} unread` : ''}`}
      className="relative grid h-11 w-11 place-items-center rounded-full text-muted transition-colors hover:bg-accent-soft hover:text-ink"
    >
      <Bell className="h-5 w-5" strokeWidth={1.5} />
      {count > 0 && (
        <span className="absolute right-2 top-2 grid h-4 min-w-4 place-items-center rounded-full bg-success px-1 text-[0.6rem] font-bold text-ivory">
          {count}
        </span>
      )}
    </button>
  )
}

function PresenceManagerMini() {
  return (
    <Link
      href="/family/connect"
      className="mt-auto flex items-center gap-3 rounded-md border border-line bg-ivory p-3 transition-colors hover:border-accent"
    >
      <Avatar initials="CE" size="sm" tone="solid" />
      <span className="min-w-0">
        <span className="block truncate text-body-sm font-semibold text-ink">{SITE.name}</span>
        <span className="block text-caption text-muted">Message your care team</span>
      </span>
    </Link>
  )
}

/* ── Overlays ──────────────────────────────────────────────────────────── */

function NotifPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Overlay open={open} onClose={onClose}>
      <div className="flex items-center justify-between border-b border-line px-6 py-4">
        <h2 className="text-h4">Notifications</h2>
        <button onClick={onClose} aria-label="Close" className="grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-accent-soft">
          <X className="h-5 w-5" strokeWidth={1.5} />
        </button>
      </div>
      <div className="px-6 py-12 text-center">
        <p className="text-body-sm font-semibold text-ink">You&apos;re all caught up</p>
        <p className="mx-auto mt-1 max-w-xs text-caption text-muted">
          Updates about your family&apos;s visits and Presence Stories will appear here.
        </p>
      </div>
    </Overlay>
  )
}

function EmergencySheet({ open, onClose, lovedOnes }: { open: boolean; onClose: () => void; lovedOnes: LovedOne[] }) {
  const contacts = lovedOnes
    .filter((lo) => lo.emergency_contact_name?.trim() && lo.emergency_contact_phone?.trim())
    .map((lo) => ({
      name: lo.emergency_contact_name!.trim(),
      phone: lo.emergency_contact_phone!.trim(),
      forName: lo.full_name.split(/\s+/)[0],
      key: lo.id,
    }))
  const careCards = lovedOnes.filter((lo) => lo.nearest_hospital?.trim() || lo.medical_notes?.trim())

  return (
    <Overlay open={open} onClose={onClose}>
      <div className="flex items-center justify-between border-b border-line px-6 py-4">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-error/10 text-error">
            <Siren className="h-5 w-5" strokeWidth={1.5} />
          </span>
          <h2 className="text-h4">Emergency help</h2>
        </div>
        <button onClick={onClose} aria-label="Close" className="grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-accent-soft">
          <X className="h-5 w-5" strokeWidth={1.5} />
        </button>
      </div>
      <div className="flex flex-col gap-5 overflow-y-auto px-6 py-5">
        <a
          href={SITE.phoneHref}
          className="flex items-center justify-center gap-2 rounded-sm bg-error py-4 text-body font-semibold text-ivory transition-opacity hover:opacity-90"
        >
          <Phone className="h-5 w-5" strokeWidth={1.75} /> Call {SITE.name}
        </a>

        <div>
          <p className="text-caption font-semibold uppercase tracking-widest text-muted">Emergency contacts</p>
          {contacts.length > 0 ? (
            <ul className="mt-2 flex flex-col gap-2">
              {contacts.map((c) => (
                <li key={c.key}>
                  <a href={`tel:${c.phone.replace(/\s/g, '')}`} className="flex items-center justify-between rounded-sm border border-line px-4 py-3 transition-colors hover:border-accent">
                    <span>
                      <span className="block text-body-sm font-semibold text-ink">{c.name}</span>
                      <span className="block text-caption text-muted">For {c.forName}</span>
                    </span>
                    <Phone className="h-4 w-4 text-green" strokeWidth={1.5} />
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-body-sm text-muted">
              Add an emergency contact in each family member&apos;s health profile so it&apos;s ready here.
            </p>
          )}
        </div>

        {careCards.map((lo) => (
          <div key={lo.id} className="grid gap-3 sm:grid-cols-2">
            {lo.nearest_hospital?.trim() && (
              <div className="rounded-sm border border-line p-4">
                <p className="flex items-center gap-1.5 text-caption font-semibold uppercase tracking-widest text-muted"><MapPin className="h-3.5 w-3.5" /> Nearest hospital · {lo.full_name.split(/\s+/)[0]}</p>
                <p className="mt-1.5 text-body-sm text-ink">{lo.nearest_hospital}</p>
              </div>
            )}
            {lo.medical_notes?.trim() && (
              <div className="rounded-sm border border-line p-4">
                <p className="flex items-center gap-1.5 text-caption font-semibold uppercase tracking-widest text-muted"><Stethoscope className="h-3.5 w-3.5" /> Medical notes · {lo.full_name.split(/\s+/)[0]}</p>
                <p className="mt-1.5 text-body-sm text-ink">{lo.medical_notes}</p>
              </div>
            )}
          </div>
        ))}

        <p className="text-caption text-muted">In a life-threatening emergency, always call 108 (ambulance) first.</p>
      </div>
    </Overlay>
  )
}
