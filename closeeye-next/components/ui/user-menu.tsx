'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { User, Settings, Bell, LifeBuoy, LogOut, Loader2, ChevronRight } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Avatar } from '@/components/family/avatar'
import { Overlay } from '@/components/family/overlay'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/components/auth/auth-provider'
import { useToast } from '@/components/ui/toast'
import { haptic } from '@/lib/haptics'
import { cn } from '@/lib/utils'

/**
 * UserMenu — the single, shared account menu for every authenticated Close Eye
 * surface in the Next.js app (Family, Guardian, Presence Console, Founder OS,
 * Admin). It shows the signed-in person's avatar and, on click, a consistent
 * dropdown: My Profile · Account Settings · Notification Preferences ·
 * Help & Support · Logout.
 *
 * Destinations differ per surface (a Guardian's profile lives at /guardian/…,
 * a family's at /family/…) so those hrefs are injected; the structure, styling,
 * and the full sign-out flow live here once and are never duplicated.
 *
 * Sign-out is real: it clears the Supabase session (via the app AuthProvider),
 * wipes local/session storage, and returns the user to the correct entry screen.
 * Auth is Supabase across Close Eye — there is no Firebase in this codebase.
 */
export interface UserMenuProps {
  /** Display name of the signed-in person. */
  name: string
  /** Account email, shown under the name (optional). */
  email?: string | null
  /** Photo URL (e.g. a Google avatar); falls back to initials. */
  avatarUrl?: string | null
  /** 1–2 letter fallback shown when there's no photo. */
  initials: string
  /** Contextual role for this surface, e.g. "Presence Manager". */
  roleLabel?: string
  /** Where "My Profile" goes. */
  profileHref: string
  /** Where "Account Settings" goes. */
  accountHref: string
  /** Where "Notification Preferences" goes. */
  notificationsHref: string
  /** Where "Help & Support" goes. Defaults to /help. */
  helpHref?: string
  /** Entry screen to land on after signing out. Defaults to /welcome. */
  loginPath?: string
  /** Dropdown alignment relative to the avatar. Defaults to right. */
  align?: 'left' | 'right'
  /** Avatar fill — solid ink or soft tint. */
  avatarTone?: 'soft' | 'solid'
  className?: string
}

export function UserMenu({
  name,
  email,
  avatarUrl,
  initials,
  roleLabel,
  profileHref,
  accountHref,
  notificationsHref,
  helpHref = '/help',
  loginPath = '/welcome',
  align = 'right',
  avatarTone = 'soft',
  className,
}: UserMenuProps) {
  const { signOut } = useAuth()
  const toast = useToast()
  const router = useRouter()
  const wrapRef = React.useRef<HTMLDivElement>(null)

  const [open, setOpen] = React.useState(false)
  const [confirm, setConfirm] = React.useState(false)
  const [busy, setBusy] = React.useState(false)

  const displayName = name?.trim() || 'Your account'

  // Close the dropdown on outside click or Escape.
  React.useEffect(() => {
    if (!open) return
    const onPointer = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const items: { label: string; href: string; icon: LucideIcon }[] = [
    { label: 'My Profile', href: profileHref, icon: User },
    { label: 'Account Settings', href: accountHref, icon: Settings },
    { label: 'Notification Preferences', href: notificationsHref, icon: Bell },
    { label: 'Help & Support', href: helpHref, icon: LifeBuoy },
  ]

  function askLogout() {
    setOpen(false)
    haptic('warning')
    setConfirm(true)
  }

  async function handleLogout() {
    if (busy) return
    setBusy(true)
    try {
      await signOut()
    } catch {
      // Even if the network sign-out fails, we still clear this device and
      // send the user to the login screen — never leave them half-signed-in.
      toast('We hit a snag, but we’ve signed you out on this device.', 'info')
    } finally {
      try {
        window.localStorage.clear()
        window.sessionStorage.clear()
      } catch {
        /* storage may be unavailable (private mode) — safe to ignore */
      }
      router.replace(loginPath)
    }
  }

  return (
    <div ref={wrapRef} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        className={cn(
          'grid place-items-center rounded-full transition-opacity hover:opacity-90',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green focus-visible:ring-offset-2 focus-visible:ring-offset-ivory',
          open && 'ring-2 ring-green ring-offset-2 ring-offset-ivory',
        )}
      >
        <Avatar initials={initials} src={avatarUrl} alt={displayName} size="sm" tone={avatarTone} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            aria-label="Account"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              'absolute top-[calc(100%+0.5rem)] z-50 w-64 overflow-hidden rounded-lg border border-line bg-card shadow-lg',
              align === 'right' ? 'right-0 origin-top-right' : 'left-0 origin-top-left',
            )}
          >
            {/* Identity header */}
            <div className="flex items-center gap-3 border-b border-line px-4 py-3.5">
              <Avatar initials={initials} src={avatarUrl} alt={displayName} size="md" tone={avatarTone} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-body-sm font-semibold text-ink">{displayName}</p>
                {email && <p className="truncate text-caption text-muted">{email}</p>}
                {roleLabel && (
                  <p className="mt-1 text-[0.6rem] font-bold uppercase tracking-widest text-green">{roleLabel}</p>
                )}
              </div>
            </div>

            {/* Navigation items */}
            <div className="py-1">
              {items.map(({ label, href, icon: Icon }) => (
                <Link
                  key={label}
                  href={href}
                  role="menuitem"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-body-sm font-medium text-ink transition-colors hover:bg-accent-soft/50"
                >
                  <Icon className="h-4 w-4 shrink-0 text-muted" strokeWidth={1.75} />
                  <span className="flex-1">{label}</span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted/60" strokeWidth={1.5} />
                </Link>
              ))}
            </div>

            {/* Sign out */}
            <div className="border-t border-line py-1">
              <button
                type="button"
                role="menuitem"
                onClick={askLogout}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-body-sm font-semibold text-error transition-colors hover:bg-error/[0.06]"
              >
                <LogOut className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                Logout
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Logout confirmation */}
      <Overlay open={confirm} onClose={() => !busy && setConfirm(false)} align="center">
        <div className="flex flex-col gap-4 px-6 py-6">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-error/10 text-error">
              <LogOut className="h-5 w-5" strokeWidth={1.75} />
            </span>
            <div>
              <h2 className="text-h4 text-ink">Sign out?</h2>
              <p className="text-caption text-muted">You’ll need to sign in again to return.</p>
            </div>
          </div>
          <div className="flex gap-2.5">
            <Button variant="secondary" size="sm" className="flex-1" disabled={busy} onClick={() => setConfirm(false)}>
              Stay signed in
            </Button>
            <Button size="sm" className="flex-1 bg-error hover:bg-error/90" disabled={busy} onClick={handleLogout}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} /> : <LogOut className="h-4 w-4" strokeWidth={1.75} />}
              Sign out
            </Button>
          </div>
        </div>
      </Overlay>
    </div>
  )
}
