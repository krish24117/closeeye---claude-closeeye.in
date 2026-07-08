'use client'

import * as React from 'react'
import Link from 'next/link'
import {
  ArrowLeft, CalendarCheck, CreditCard, ShieldCheck, Users, LifeBuoy, HeartPulse, Siren, RefreshCw, Tag, Cog, BellOff, Archive, Trash2, ArrowRight, CheckCheck,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { LogoMark } from '@/components/ui/logo'
import { EmptyState } from '@/components/ui/states'
import { cn } from '@/lib/utils'

type Cat = 'Bookings' | 'Payments' | 'Guardians' | 'Companions' | 'Care Team' | 'Medical' | 'Emergency' | 'Renewals' | 'Offers' | 'System'
const CAT_ICON: Record<Cat, LucideIcon> = {
  Bookings: CalendarCheck, Payments: CreditCard, Guardians: ShieldCheck, Companions: Users, 'Care Team': LifeBuoy, Medical: HeartPulse, Emergency: Siren, Renewals: RefreshCw, Offers: Tag, System: Cog,
}
interface Notif { id: string; cat: Cat; title: string; text: string; time: string; unread: boolean; href: string }
const SEED: Notif[] = [
  { id: 'n1', cat: 'Guardians', title: 'Arjun checked in', text: 'Arjun has arrived at the Rao family for the 9:30 visit.', time: '2m', unread: true, href: '/family/visits' },
  { id: 'n2', cat: 'Bookings', title: 'Visit completed', text: 'Ramesh Rao’s wellbeing report is ready to read.', time: '18m', unread: true, href: '/family/visits/v-103' },
  { id: 'n3', cat: 'Medical', title: 'BP reading added', text: 'Blood pressure 128/82 — within the expected range.', time: '20m', unread: true, href: '/family/visits/v-103' },
  { id: 'n4', cat: 'Payments', title: 'Payment received', text: '₹1,500 for your CloseEye Care membership.', time: '1h', unread: false, href: '/admin/finance' },
  { id: 'n5', cat: 'Care Team', title: 'Ticket resolved', text: 'Your medicine coordination request is complete.', time: '2h', unread: false, href: '/console' },
  { id: 'n6', cat: 'Renewals', title: 'Membership renews soon', text: 'Lakshmi Rao’s plan renews in 6 days.', time: '5h', unread: false, href: '/admin/memberships' },
  { id: 'n7', cat: 'Companions', title: 'Companion assigned', text: 'Vikram will accompany Fatima to her cardiology visit.', time: 'Yesterday', unread: false, href: '/console/families/f-sheikh' },
  { id: 'n8', cat: 'Offers', title: 'Refer a family, get ₹500', text: 'Share Close Eye with someone who needs it.', time: '2d', unread: false, href: '/about' },
]

export default function NotificationsPage() {
  const [items, setItems] = React.useState<Notif[]>(SEED)
  const [filter, setFilter] = React.useState<Cat | 'All'>('All')

  const cats = Array.from(new Set(items.map((n) => n.cat)))
  const shown = items.filter((n) => (filter === 'All' ? true : n.cat === filter))
  const unread = items.filter((n) => n.unread).length

  const markAll = () => setItems((s) => s.map((n) => ({ ...n, unread: false })))
  const read = (id: string) => setItems((s) => s.map((n) => (n.id === id ? { ...n, unread: false } : n)))
  const remove = (id: string) => setItems((s) => s.filter((n) => n.id !== id))

  return (
    <div className="min-h-dvh bg-ivory">
      <header className="sticky top-0 z-20 border-b border-line bg-ivory/90 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-2xl items-center gap-3 px-4">
          <Link href="/" aria-label="Home" className="grid h-9 w-9 place-items-center rounded-full text-ink hover:bg-ink/[0.04]"><ArrowLeft className="h-5 w-5" strokeWidth={1.75} /></Link>
          <LogoMark className="h-7 w-7" />
          <span className="flex-1 text-body-sm font-bold text-ink">Notifications{unread > 0 && <span className="ml-2 rounded-full bg-success px-1.5 text-[0.6rem] font-bold text-ivory">{unread}</span>}</span>
          {unread > 0 && <button type="button" onClick={markAll} className="inline-flex items-center gap-1.5 text-caption font-semibold text-green hover:underline"><CheckCheck className="h-4 w-4" strokeWidth={1.75} /> Mark all read</button>}
        </div>
      </header>

      <main className="ce-fade-in mx-auto max-w-2xl px-4 py-5">
        <div className="mb-4 flex flex-wrap gap-1.5">
          {(['All', ...cats] as (Cat | 'All')[]).map((c) => (
            <button key={c} type="button" onClick={() => setFilter(c)} className={cn('rounded-full border px-3 py-1.5 text-caption font-semibold transition-colors', filter === c ? 'border-green bg-green text-ivory' : 'border-line text-muted hover:border-ink/25 hover:text-ink')}>{c}</button>
          ))}
        </div>

        {shown.length > 0 ? (
          <ul className="overflow-hidden rounded-lg border border-line bg-card shadow-sm">
            {shown.map((n) => {
              const Icon = CAT_ICON[n.cat]
              return (
                <li key={n.id} className={cn('group flex items-start gap-3 border-b border-line px-4 py-3.5 last:border-b-0 transition-colors', n.unread && 'bg-accent-soft/20')}>
                  <span className={cn('mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full', n.cat === 'Emergency' ? 'bg-error/10 text-error' : 'bg-accent-soft text-green')}><Icon className="h-4 w-4" strokeWidth={1.75} /></span>
                  <Link href={n.href} onClick={() => read(n.id)} className="min-w-0 flex-1">
                    <span className="flex items-center gap-2"><span className="block truncate text-body-sm font-semibold text-ink">{n.title}</span>{n.unread && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-success" />}</span>
                    <span className="block text-body-sm text-muted">{n.text}</span>
                    <span className="mt-0.5 inline-flex items-center gap-1 text-caption text-muted">{n.time} <ArrowRight className="h-3 w-3" strokeWidth={1.75} /></span>
                  </Link>
                  <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                    <button type="button" onClick={() => read(n.id)} aria-label="Archive" className="grid h-8 w-8 place-items-center rounded-full text-muted hover:bg-ink/5 hover:text-ink"><Archive className="h-4 w-4" strokeWidth={1.75} /></button>
                    <button type="button" onClick={() => remove(n.id)} aria-label="Delete" className="grid h-8 w-8 place-items-center rounded-full text-muted hover:bg-error/10 hover:text-error"><Trash2 className="h-4 w-4" strokeWidth={1.75} /></button>
                  </div>
                </li>
              )
            })}
          </ul>
        ) : (
          <EmptyState icon={BellOff} title="You’re all caught up" hint="No notifications here right now — we’ll let you know the moment something needs you." />
        )}
      </main>
    </div>
  )
}
