'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  CalendarDays,
  CircleCheckBig,
  MessageCircle,
  User,
  Siren,
  Phone,
  X,
  Ambulance,
  Bell,
  BellOff,
} from 'lucide-react'
import { LogoMark } from '@/components/ui/logo'
import { Overlay } from '@/components/family/overlay'
import { AvatarLink } from '@/components/ui/avatar-link'
import { SyncStatus } from '@/components/guardian/sync-status'
import { useFamilyData } from '@/components/family/family-data-provider'
import { PRESENCE_MANAGER } from '@/lib/guardian-data'
import { fetchNotifications, markAllNotificationsRead, type AppNotification } from '@/lib/db/notifications'
import { cn } from '@/lib/utils'

const NAV = [
  { href: '/guardian', label: 'Today', icon: CalendarDays, match: (p: string) => p === '/guardian' || p.startsWith('/guardian/visits') },
  { href: '/guardian/check-in', label: 'Check In', icon: CircleCheckBig, match: (p: string) => p.startsWith('/guardian/check-in') },
  { href: '/guardian/messages', label: 'Messages', icon: MessageCircle, match: (p: string) => p.startsWith('/guardian/messages') },
  { href: '/guardian/profile', label: 'Profile', icon: User, match: (p: string) => p.startsWith('/guardian/profile') },
]

function NotifIcon({ type }: { type: string }) {
  const Icon =
    type === 'companion_assigned' || type === 'booking_confirmed' ? CalendarDays
    : type === 'visit_started' || type === 'report_ready' ? CircleCheckBig
    : type === 'emergency_alert' ? Siren
    : Bell
  return <Icon className="h-4 w-4" strokeWidth={1.75} />
}

function timeAgo(iso: string): string {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (m < 1) return 'Just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d ago`
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

export function GuardianShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { profile, identity } = useFamilyData()
  const [sos, setSos] = useState(false)
  const [notif, setNotif] = useState(false)
  const [notifs, setNotifs] = useState<AppNotification[]>([])

  const userId = profile?.id
  const unread = notifs.filter((n) => !n.read).length
  const fullName = profile?.full_name?.trim() || 'Guardian'
  const firstName = fullName.split(' ')[0]

  useEffect(() => {
    if (!userId) return
    let live = true
    void fetchNotifications(userId).then((rows) => { if (live) setNotifs(rows) }).catch(() => {})
    return () => { live = false }
  }, [userId])

  function openNotifs() {
    setNotif(true)
    if (userId && unread > 0) {
      void markAllNotificationsRead(userId).catch(() => {})
      setNotifs((prev) => prev.map((n) => ({ ...n, read: true })))
    }
  }

  return (
    <div className="min-h-dvh bg-ivory">
      {/* Console header */}
      <header className="sticky top-0 z-30 border-b border-line bg-ivory/90 backdrop-blur-xl">
        <div className="mx-auto flex h-[3.75rem] max-w-lg items-center justify-between gap-3 px-5">
          <Link href="/guardian" aria-label="Guardian Console" className="flex items-center gap-2.5">
            <LogoMark className="h-8 w-8 shrink-0" />
            <span className="flex flex-col leading-none">
              <span className="text-[1.15rem] font-extrabold lowercase leading-none tracking-[-0.02em] text-ink">close eye</span>
              <span className="mt-1 text-[0.6rem] font-semibold uppercase tracking-[0.16em] text-muted">Guardian Console</span>
            </span>
          </Link>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={openNotifs}
              aria-label={unread > 0 ? `Notifications (${unread} unread)` : 'Notifications'}
              className="relative grid h-11 w-11 place-items-center rounded-full text-ink transition-colors hover:bg-accent-soft"
            >
              <Bell className="h-5 w-5" strokeWidth={1.75} />
              {unread > 0 && (
                <span className="absolute right-1.5 top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-error px-1 text-[0.6rem] font-bold text-ivory ring-2 ring-ivory">
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setSos(true)}
              aria-label="Emergency"
              className="grid h-11 w-11 place-items-center rounded-full border border-error/30 text-error transition-colors hover:bg-error/10"
            >
              <Siren className="h-5 w-5" strokeWidth={1.75} />
            </button>
            <AvatarLink href="/guardian/profile" initials={identity.initials} avatarUrl={identity.avatarUrl} name={identity.isPlaceholder ? fullName : identity.fullName} />
          </div>
        </div>
        {/* Sync strip */}
        <div className="border-t border-line/70 bg-card/40">
          <div className="mx-auto flex h-9 max-w-lg items-center justify-between px-5">
            <SyncStatus />
            <span className="truncate text-caption font-medium text-muted">{firstName}</span>
          </div>
        </div>
      </header>

      <main id="main" className="mx-auto max-w-lg px-5 pb-28 pt-5">{children}</main>

      {/* Bottom navigation — large, one-handed */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl"
        aria-label="Guardian"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="mx-auto flex h-[4.75rem] max-w-lg items-stretch">
          {NAV.map((item) => {
            const active = item.match(pathname)
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn('flex flex-1 flex-col items-center justify-center gap-1 text-[0.72rem] font-semibold transition-colors', active ? 'text-green' : 'text-muted')}
              >
                <Icon className="h-6 w-6" strokeWidth={active ? 2 : 1.5} />
                {item.label}
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Notifications */}
      <Overlay open={notif} onClose={() => setNotif(false)}>
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <h2 className="text-h4">Updates</h2>
          <button onClick={() => setNotif(false)} aria-label="Close" className="grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-accent-soft">
            <X className="h-5 w-5" strokeWidth={1.5} />
          </button>
        </div>
        {notifs.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
            <span className="grid h-14 w-14 place-items-center rounded-full bg-accent-soft text-green"><BellOff className="h-6 w-6" strokeWidth={1.5} /></span>
            <p className="text-body-sm font-semibold text-ink">You&apos;re all caught up</p>
            <p className="max-w-xs text-body-sm text-muted">New visit assignments and updates from your Presence Manager will appear here.</p>
          </div>
        ) : (
          <ul className="max-h-[70vh] overflow-y-auto">
            {notifs.map((n) => (
              <li key={n.id} className="flex gap-3 border-b border-line px-6 py-3.5 last:border-b-0">
                <span className={cn('mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full', n.type === 'emergency_alert' ? 'bg-error/12 text-error' : 'bg-accent-soft text-green')}>
                  <NotifIcon type={n.type} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-body-sm font-semibold text-ink">{n.title}</p>
                  {n.message && <p className="mt-0.5 text-body-sm leading-relaxed text-muted">{n.message}</p>}
                  <p className="mt-1 text-caption text-muted">{timeAgo(n.created_at)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Overlay>

      {/* Emergency */}
      <Overlay open={sos} onClose={() => setSos(false)}>
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-error/10 text-error">
              <Siren className="h-5 w-5" strokeWidth={1.5} />
            </span>
            <h2 className="text-h4">Emergency</h2>
          </div>
          <button onClick={() => setSos(false)} aria-label="Close" className="grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-accent-soft">
            <X className="h-5 w-5" strokeWidth={1.5} />
          </button>
        </div>
        <div className="flex flex-col gap-3 px-6 py-5">
          <a href="tel:108" className="flex min-h-[3.5rem] items-center justify-center gap-2 rounded-sm bg-error py-4 text-body font-semibold text-ivory transition-opacity hover:opacity-90">
            <Ambulance className="h-5 w-5" strokeWidth={1.75} /> Call 108 · Ambulance
          </a>
          <a href={`tel:${PRESENCE_MANAGER.phone.replace(/\s/g, '')}`} className="flex min-h-[3.5rem] items-center justify-center gap-2 rounded-sm border border-line py-4 text-body font-semibold text-ink transition-colors hover:border-accent">
            <Phone className="h-5 w-5" strokeWidth={1.75} /> Call Close Eye · Presence Manager
          </a>
          <p className="text-caption text-muted">
            You&apos;re signed in as {fullName}. In a life-threatening emergency, call 108 first, then your Presence Manager.
          </p>
        </div>
      </Overlay>
    </div>
  )
}
