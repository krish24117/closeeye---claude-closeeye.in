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
import { cn } from '@/lib/utils'
import { PRESENCE_MANAGER, MEMBERS, NOTIFICATIONS } from '@/lib/family-data'

const DESKTOP_NAV = [
  { href: '/family', label: 'Overview', icon: Home },
  { href: '/family/members', label: 'Family', icon: Users },
  { href: '/family/visits', label: 'Visits', icon: CalendarDays },
  { href: '/family/documents', label: 'Documents', icon: FolderLock },
  { href: '/family/membership', label: 'Membership', icon: BadgeCheck },
  { href: '/family/messages', label: 'Messages', icon: MessageCircle },
  { href: '/family/profile', label: 'Settings', icon: Settings },
]

const MOBILE_NAV = [
  { href: '/family', label: 'Home', icon: Home },
  { href: '/family/members', label: 'Family', icon: Users },
  { href: '/family/visits', label: 'Visits', icon: CalendarDays },
  { href: '/family/messages', label: 'Messages', icon: MessageCircle },
  { href: '/family/profile', label: 'Profile', icon: User },
]

function isActive(pathname: string, href: string) {
  return href === '/family' ? pathname === '/family' : pathname.startsWith(href)
}

export function FamilyShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [emergency, setEmergency] = useState(false)
  const [notif, setNotif] = useState(false)
  const unread = NOTIFICATIONS.filter((n) => n.unread).length

  return (
    <div className="min-h-dvh bg-ivory">
      {/* ── Desktop sidebar ─────────────────────────────────────────────── */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-line bg-card px-4 py-6 lg:flex">
        <div className="flex items-center justify-between px-2">
          <Link href="/family" aria-label="Family Space home">
            <Logo />
          </Link>
          <BellButton count={unread} onClick={() => setNotif(true)} />
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
      <EmergencySheet open={emergency} onClose={() => setEmergency(false)} />
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
      href="/family/messages"
      className="mt-auto flex items-center gap-3 rounded-md border border-line bg-ivory p-3 transition-colors hover:border-accent"
    >
      <Avatar initials={PRESENCE_MANAGER.initials} size="sm" />
      <span className="min-w-0">
        <span className="block truncate text-body-sm font-semibold text-ink">{PRESENCE_MANAGER.name}</span>
        <span className="block text-caption text-muted">Your Presence Manager</span>
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
      <ul className="max-h-[70vh] overflow-y-auto">
        {NOTIFICATIONS.map((n) => (
          <li key={n.id} className="flex gap-3 border-b border-line px-6 py-4 last:border-b-0">
            <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', n.unread ? 'bg-success' : 'bg-line')} />
            <div>
              <p className="text-body-sm text-ink">{n.text}</p>
              <p className="mt-0.5 text-caption text-muted">{n.timeLabel}</p>
            </div>
          </li>
        ))}
      </ul>
    </Overlay>
  )
}

function EmergencySheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const contacts = MEMBERS.flatMap((m) => m.emergencyContacts)
  const father = MEMBERS[0]
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
          href={`tel:${PRESENCE_MANAGER.phone.replace(/\s/g, '')}`}
          className="flex items-center justify-center gap-2 rounded-sm bg-error py-4 text-body font-semibold text-ivory transition-opacity hover:opacity-90"
        >
          <Phone className="h-5 w-5" strokeWidth={1.75} /> Call {PRESENCE_MANAGER.name}
        </a>

        <div>
          <p className="text-caption font-semibold uppercase tracking-widest text-muted">Emergency contacts</p>
          <ul className="mt-2 flex flex-col gap-2">
            {contacts.map((c) => (
              <li key={c.name + c.phone}>
                <a href={`tel:${c.phone.replace(/\s/g, '')}`} className="flex items-center justify-between rounded-sm border border-line px-4 py-3 transition-colors hover:border-accent">
                  <span>
                    <span className="block text-body-sm font-semibold text-ink">{c.name}</span>
                    <span className="block text-caption text-muted">{c.relation}</span>
                  </span>
                  <Phone className="h-4 w-4 text-green" strokeWidth={1.5} />
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-sm border border-line p-4">
            <p className="flex items-center gap-1.5 text-caption font-semibold uppercase tracking-widest text-muted"><MapPin className="h-3.5 w-3.5" /> Nearest hospital</p>
            <p className="mt-1.5 text-body-sm text-ink">Apollo Hospitals, Jubilee Hills</p>
            <p className="text-caption text-muted">≈ 3.2 km from {father?.city}</p>
          </div>
          <div className="rounded-sm border border-line p-4">
            <p className="flex items-center gap-1.5 text-caption font-semibold uppercase tracking-widest text-muted"><Stethoscope className="h-3.5 w-3.5" /> Medical notes</p>
            <p className="mt-1.5 text-body-sm text-ink">{father?.medicalNotes[0]}</p>
          </div>
        </div>
        <p className="text-caption text-muted">In a life-threatening emergency, always call 108 (ambulance) first.</p>
      </div>
    </Overlay>
  )
}
