'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Loader2, MoreVertical, Pencil, Trash2 } from 'lucide-react'
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

/** A family member, from real Supabase data, with status badges + edit/remove. */
export function LovedOneCard({ lo }: { lo: LovedOne }) {
  const { removeLovedOne } = useLovedOnes()
  const toast = useToast()
  const [photo, setPhoto] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [confirmRemove, setConfirmRemove] = useState(false)
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

  function closeMenu() {
    if (deleting) return
    setMenuOpen(false)
    setConfirmRemove(false)
  }

  async function remove() {
    if (deleting) return
    setDeleting(true)
    try {
      await removeLovedOne(lo.id) // card unmounts on success; toast persists app-wide
      toast(`${firstName} was removed from your family.`)
    } catch (e) {
      console.error('[remove-family-member] failed:', e)
      setDeleting(false)
      closeMenu()
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
            onClick={() => { setConfirmRemove(false); setMenuOpen(true) }}
            aria-label={`Options for ${lo.full_name}`}
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
      </article>

      <Overlay open={menuOpen} onClose={closeMenu}>
        <div className="p-6">
          <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-line sm:hidden" />
          {!confirmRemove ? (
            <>
              <div className="flex items-center gap-4">
                <Avatar initials={initialsOf(lo.full_name)} src={photo} alt={lo.full_name} size="md" tone="solid" />
                <div className="min-w-0">
                  <p className="truncate text-body font-semibold text-ink">{lo.full_name}</p>
                  {meta && <p className="truncate text-caption text-muted">{meta}</p>}
                </div>
              </div>
              <div className="mt-5 flex flex-col gap-2.5">
                <Button asChild size="lg" variant="secondary" className="w-full">
                  <Link href={`/family/members/${lo.id}`}><Pencil className="h-5 w-5" strokeWidth={1.75} /> Edit details</Link>
                </Button>
                <button
                  type="button"
                  onClick={() => setConfirmRemove(true)}
                  className="inline-flex items-center justify-center gap-2 rounded-sm py-2.5 text-body-sm font-semibold text-error transition-colors hover:bg-error/[0.06]"
                >
                  <Trash2 className="h-4 w-4" strokeWidth={1.75} /> Remove from family
                </button>
              </div>
            </>
          ) : (
            <>
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
                <Button variant="secondary" size="lg" onClick={() => setConfirmRemove(false)} disabled={deleting} className="w-full">Back</Button>
              </div>
            </>
          )}
        </div>
      </Overlay>
    </>
  )
}
