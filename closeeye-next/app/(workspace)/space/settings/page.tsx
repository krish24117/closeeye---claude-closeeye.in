'use client'

/**
 * Profile — the Dock's "Profile" tab (canonical Settings Owner route, /space/settings). Grounded
 * to the approved dock2 mockup's Profile screen: "You and your access." — who can see your family,
 * your plan, what Connect notifies you about — plus the account actions every app must have
 * (sign out, close account). GLOBAL Connect only: NO India Care membership, NO "Explore
 * Membership", NO closeeye.in eldercare content. Self-contained on useAuth so it carries none of
 * the India family-app components. Honest: it states only what's true (no fabricated people/dates).
 */
import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Loader2, LogOut, Trash2 } from 'lucide-react'
import { useAuth } from '@/components/auth/auth-provider'
import { supabase } from '@/lib/supabase'
import { Overlay } from '@/components/family/overlay'

const initialsFrom = (name?: string | null, email?: string | null) => {
  const raw = (name || email?.split('@')[0] || '').trim()
  const parts = raw ? raw.split(/\s+/) : []
  return (parts.slice(0, 2).map((s) => s[0]).join('') || '?').toUpperCase()
}

function Tile({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-edge/70 bg-surface-raised p-5 shadow-sm">
      <h2 className="text-h4 text-content">{title}</h2>
      <p className="mt-1.5 text-body-sm leading-relaxed text-content-muted">{children}</p>
    </section>
  )
}

export default function ProfilePage() {
  const router = useRouter()
  const { user } = useAuth()
  const [confirmDelete, setConfirmDelete] = React.useState(false)
  const [deleting, setDeleting] = React.useState(false)
  const [err, setErr] = React.useState('')

  const name = (user?.user_metadata?.full_name as string | undefined) || (user?.user_metadata?.name as string | undefined) || null
  const email = user?.email || ''
  const initials = initialsFrom(name, email)

  async function signOut() {
    try { await supabase.auth.signOut() } catch {}
    router.replace('/connect')
  }

  async function closeAccount() {
    if (deleting) return
    setDeleting(true); setErr('')
    try {
      const { data, error } = await supabase.functions.invoke('delete-account')
      if (error || !data?.ok) { setErr((data?.error as string) || 'We couldn’t close your account just now. Please try again.'); setDeleting(false); return }
      try { await supabase.auth.signOut() } catch {}
      router.replace('/connect')
    } catch {
      setErr('We couldn’t close your account just now. Please try again.'); setDeleting(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-caption font-semibold uppercase tracking-widest text-content-muted">Profile</p>
        <h1 className="mt-1 text-h2 text-content">You and your access.</h1>
      </div>

      {/* Identity */}
      <section className="flex items-center gap-4 rounded-lg border border-edge/70 bg-surface-raised p-5 shadow-sm">
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-surface-accent text-h4 font-semibold text-brand">{initials}</span>
        <div className="min-w-0">
          <p className="truncate text-body font-semibold text-content">{name || 'Your account'}</p>
          {email && <p className="truncate text-body-sm text-content-muted">{email}</p>}
        </div>
      </section>

      <Tile title="Who can see your family">
        Only you. Close Eye keeps your family private to you — a Guardian sees a person only during a visit, never before and never after.
      </Tile>

      <Tile title="Plan">
        Close Eye Connect — the intelligence that stays with your family.
      </Tile>

      <Tile title="What Connect may notify you about">
        Health changes, missed visits, and Guardian reports.
      </Tile>

      {/* Account */}
      <section className="mt-2 flex flex-col gap-3">
        <button onClick={signOut} className="inline-flex items-center justify-center gap-2 rounded-full border border-edge bg-surface-raised py-3 text-body-sm font-semibold text-content transition-colors hover:bg-surface-accent/50">
          <LogOut className="h-4 w-4" strokeWidth={1.75} /> Sign out
        </button>
        <button onClick={() => setConfirmDelete(true)} className="inline-flex items-center justify-center gap-2 rounded-full py-2.5 text-body-sm font-semibold text-error transition-colors hover:bg-error/[0.06]">
          <Trash2 className="h-4 w-4" strokeWidth={1.75} /> Close account
        </button>
      </section>

      <p className="text-center text-caption text-content-muted">
        <Link href="/privacy" className="hover:text-content">Privacy</Link>
        <span className="px-2 text-line">·</span>
        <Link href="/terms" className="hover:text-content">Terms</Link>
      </p>

      <Overlay open={confirmDelete} onClose={() => { if (!deleting) setConfirmDelete(false) }}>
        <div className="p-6">
          <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-edge" aria-hidden />
          <h3 className="text-h4 text-content">Close your account?</h3>
          <p className="mt-2 text-body-sm leading-relaxed text-content-muted">
            This permanently closes your Close Eye account and removes your family’s data. You’ll be signed out. This can’t be undone.
          </p>
          {err && <p className="mt-3 rounded-sm border border-error/20 bg-error/[0.04] px-3.5 py-2.5 text-caption text-error">{err}</p>}
          <div className="mt-5 flex flex-col gap-2.5">
            <button onClick={() => setConfirmDelete(false)} disabled={deleting} className="w-full rounded-full border border-edge bg-surface-raised py-3 text-body-sm font-semibold text-content transition-colors hover:bg-surface-accent/50 disabled:opacity-50">Keep my account</button>
            <button onClick={closeAccount} disabled={deleting} className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-error py-3 text-body-sm font-semibold text-content-inverse transition-opacity hover:opacity-90 disabled:opacity-60">
              {deleting ? <><Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} /> Closing…</> : <><Trash2 className="h-4 w-4" strokeWidth={1.75} /> Close account</>}
            </button>
          </div>
        </div>
      </Overlay>
    </div>
  )
}
