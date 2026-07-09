'use client'

import { useState } from 'react'
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
import { SyncStatus } from '@/components/guardian/sync-status'
import { useFamilyData } from '@/components/family/family-data-provider'
import { PRESENCE_MANAGER } from '@/lib/guardian-data'
import { cn } from '@/lib/utils'

const NAV = [
  { href: '/guardian', label: 'Today', icon: CalendarDays, match: (p: string) => p === '/guardian' || p.startsWith('/guardian/visits') },
  { href: '/guardian/check-in', label: 'Check In', icon: CircleCheckBig, match: (p: string) => p.startsWith('/guardian/check-in') },
  { href: '/guardian/messages', label: 'Messages', icon: MessageCircle, match: (p: string) => p.startsWith('/guardian/messages') },
  { href: '/guardian/profile', label: 'Profile', icon: User, match: (p: string) => p.startsWith('/guardian/profile') },
]

export function GuardianShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { profile } = useFamilyData()
  const [sos, setSos] = useState(false)
  const [notif, setNotif] = useState(false)

  const fullName = profile?.full_name?.trim() || 'Guardian'
  const firstName = fullName.split(' ')[0]

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
              onClick={() => setNotif(true)}
              aria-label="Notifications"
              className="relative grid h-11 w-11 place-items-center rounded-full text-ink transition-colors hover:bg-accent-soft"
            >
              <Bell className="h-5 w-5" strokeWidth={1.75} />
            </button>
            <button
              type="button"
              onClick={() => setSos(true)}
              aria-label="Emergency"
              className="grid h-11 w-11 place-items-center rounded-full border border-error/30 text-error transition-colors hover:bg-error/10"
            >
              <Siren className="h-5 w-5" strokeWidth={1.75} />
            </button>
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
        <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-full bg-accent-soft text-green"><BellOff className="h-6 w-6" strokeWidth={1.5} /></span>
          <p className="text-body-sm font-semibold text-ink">You&apos;re all caught up</p>
          <p className="max-w-xs text-body-sm text-muted">Care requests from families and schedule updates from your Presence Manager will appear here.</p>
        </div>
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
