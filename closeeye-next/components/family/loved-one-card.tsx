'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CalendarClock, CalendarPlus, Loader2, MessageCircle, MoreVertical, Trash2, UserRound } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Avatar } from '@/components/family/avatar'
import { Overlay } from '@/components/family/overlay'
import { Button } from '@/components/ui/button'
import { useLovedOnes } from '@/components/family/family-data-provider'
import { useToast } from '@/components/ui/toast'
import { getLocalPhoto } from '@/lib/local-photos'
import type { LovedOne } from '@/lib/db/types'
import { cn } from '@/lib/utils'

/** Initials from a full name (first two words) — the default avatar. */
export function initialsOf(name: string): string {
  const p = name.trim().split(/\s+/).filter(Boolean)
  return (p.slice(0, 2).map((s) => s[0]).join('') || '·').toUpperCase()
}

type BadgeTone = 'grey' | 'green' | 'yellow'

function Badge({ value, tone }: { value: string; tone: BadgeTone }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-caption font-semibold',
        tone === 'green' ? 'bg-success/12 text-success' : tone === 'yellow' ? 'bg-warning/12 text-warning' : 'bg-ink/[0.06] text-muted',
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', tone === 'green' ? 'bg-success' : tone === 'yellow' ? 'bg-warning' : 'bg-muted/60')} />
      {value}
    </span>
  )
}

function CardAction({ href, icon: Icon, label, primary }: { href: string; icon: LucideIcon; label: string; primary?: boolean }) {
  return (
    <Link
      href={href}
      className={cn(
        'flex flex-1 flex-col items-center gap-1 rounded-lg py-2.5 text-caption font-semibold transition-colors',
        primary ? 'text-green hover:bg-accent-soft/60' : 'text-muted hover:bg-accent-soft/40 hover:text-ink',
      )}
    >
      <Icon className="h-5 w-5" strokeWidth={1.75} />
      {label}
    </Link>
  )
}

/** A family member, from real Supabase data, with status badges + actions. */
export function LovedOneCard({ lo }: { lo: LovedOne }) {
  const { removeLovedOne } = useLovedOnes()
  const toast = useToast()
  const [photo, setPhoto] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  useEffect(() => { setPhoto(getLocalPhoto(lo.id)) }, [lo.id])

  const firstName = lo.full_name.trim().split(/\s+/)[0]
  const healthComplete = Boolean(lo.medical_notes?.trim() && lo.phone_number?.trim() && lo.emergency_contact_name?.trim())
  const meta = [lo.relationship, lo.city].filter(Boolean).join(' · ')

  const rows: { label: string; value: string; tone: BadgeTone }[] = [
    { label: 'Membership', value: 'Inactive', tone: 'grey' },
    { label: 'Health profile', value: healthComplete ? 'Complete' : 'Incomplete', tone: healthComplete ? 'green' : 'yellow' },
    { label: 'Next visit', value: 'Not scheduled', tone: 'grey' },
  ]

  async function remove() {
    if (deleting) return
    setDeleting(true)
    try {
      await removeLovedOne(lo.id) // card unmounts on success; toast persists app-wide
      toast(`${firstName} was removed from your family.`)
    } catch (e) {
      console.error('[remove-family-member] failed:', e)
      setDeleting(false)
      setMenuOpen(false)
      toast('We couldn’t remove them. Please try again.')
    }
  }

  return (
    <>
      <article className="ce-fade-in overflow-hidden rounded-[20px] border border-line bg-card shadow-sm">
        <header className="flex items-center gap-5 px-7 pb-6 pt-7">
          <Avatar initials={initialsOf(lo.full_name)} src={photo} alt={lo.full_name} size="xl" tone="solid" />
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-h3 leading-tight text-ink">{lo.full_name}</h2>
            {meta && <p className="mt-1 truncate text-body-sm text-muted">{meta}</p>}
          </div>
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label={`More options for ${lo.full_name}`}
            className="grid h-9 w-9 shrink-0 -mt-1 self-start place-items-center rounded-full text-muted transition-colors hover:bg-accent-soft hover:text-ink"
          >
            <MoreVertical className="h-5 w-5" strokeWidth={1.75} />
          </button>
        </header>

        <dl className="divide-y divide-line border-t border-line px-7">
          {rows.map((r) => (
            <div key={r.label} className="flex items-center justify-between gap-3 py-3.5">
              <dt className="text-body-sm text-muted">{r.label}</dt>
              <dd><Badge value={r.value} tone={r.tone} /></dd>
            </div>
          ))}
        </dl>

        <div className="flex items-center gap-1 border-t border-line px-3 py-1.5">
          <CardAction href={`/family/book?member=${lo.id}`} icon={CalendarPlus} label="Book a visit" primary />
          <CardAction href={`/family/members/${lo.id}`} icon={UserRound} label="Profile" />
          <CardAction href="/family/visits" icon={CalendarClock} label="Visits" />
          <CardAction href="/family/messages" icon={MessageCircle} label="Message" />
        </div>
      </article>

      <Overlay open={menuOpen} onClose={() => { if (!deleting) setMenuOpen(false) }}>
        <div className="p-6">
          <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-line sm:hidden" />
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-error/10 text-error"><Trash2 className="h-5 w-5" strokeWidth={1.75} /></span>
            <h3 className="text-h4 text-ink">Remove {lo.full_name}?</h3>
          </div>
          <p className="mt-3 text-body-sm leading-relaxed text-muted">
            This permanently removes {firstName} and their care details from your family. This can’t be undone.
          </p>
          <div className="mt-5 flex flex-col gap-2.5">
            <Button size="lg" onClick={remove} disabled={deleting} className="w-full bg-error text-white hover:bg-error/90">
              {deleting ? <><Loader2 className="h-5 w-5 animate-spin" strokeWidth={2} /> Removing…</> : <><Trash2 className="h-5 w-5" strokeWidth={1.75} /> Remove from family</>}
            </Button>
            <Button variant="secondary" size="lg" onClick={() => setMenuOpen(false)} disabled={deleting} className="w-full">Cancel</Button>
          </div>
        </div>
      </Overlay>
    </>
  )
}
