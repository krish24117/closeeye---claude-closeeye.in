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
 * Admin). Avatar → dropdown: My Profile · Account Settings · Notification
 * Preferences · Help & Support · Logout.
 *
 * Craft notes (Design Authority): card = r-md (20px) on soft `shadow-lg`
 * elevation with a hairline edge; rows use inset r-sm highlights (macOS/Apple
 * Settings idiom, not full-bleed); Lucide @ stroke 1.5, one size; motion is a
 * 200ms fade+scale+slide on the `premium` curve, reduced-motion safe.
 *
 * Sign-out is real: clears the Supabase session (via the app AuthProvider),
 * wipes local/session storage, and returns the user to the correct entry
 * screen. Auth is Supabase across Close Eye — there is no Firebase here.
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
          'grid place-items-center rounded-full outline-none transition-all duration-200 ease-premium',
          'hover:opacity-90 active:scale-95',
          'focus-visible:ring-2 focus-visible:ring-green focus-visible:ring-offset-2 focus-visible:ring-offset-ivory',
          open && 'ring-2 ring-green/80 ring-offset-2 ring-offset-ivory',
        )}
      >
        <Avatar initials={initials} src={avatarUrl} alt={displayName} size="sm" tone={avatarTone} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            aria-label="Account"
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              'absolute top-[calc(100%+0.5rem)] z-50 w-72 rounded-md border border-line/70 bg-card p-1.5 shadow-lg',
              align === 'right' ? 'right-0 origin-top-right' : 'left-0 origin-top-left',
            )}
          >
            {/* Identity header */}
            <div className="flex items-center gap-3 px-2.5 pb-3 pt-2">
              <Avatar initials={initials} src={avatarUrl} alt={displayName} size="md" tone={avatarTone} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-body-sm font-semibold text-ink">{displayName}</p>
                {email && <p className="truncate text-caption text-muted">{email}</p>}
                {roleLabel && (
                  <span className="mt-1.5 inline-flex rounded-full bg-accent-soft px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.08em] text-green">
                    {roleLabel}
                  </span>
                )}
              </div>
            </div>

            <div className="mx-1 border-t border-line/70" />

            {/* Navigation items — inset rounded highlights */}
            <div className="flex flex-col pt-1">
              {items.map(({ label, href, icon: Icon }) => (
                <Link
                  key={label}
                  href={href}
                  role="menuitem"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 rounded-sm px-2.5 py-2 text-body-sm font-medium text-ink outline-none transition-colors duration-150 hover:bg-accent-soft focus-visible:bg-accent-soft"
                >
                  <Icon className="h-[18px] w-[18px] shrink-0 text-muted" strokeWidth={1.5} />
                  <span className="flex-1 truncate">{label}</span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted/40" strokeWidth={1.5} />
                </Link>
              ))}
            </div>

            <div className="mx-1 my-1 border-t border-line/70" />

            {/* Sign out */}
            <button
              type="button"
              role="menuitem"
              onClick={askLogout}
              className="flex w-full items-center gap-3 rounded-sm px-2.5 py-2 text-body-sm font-semibold text-error outline-none transition-colors duration-150 hover:bg-error/[0.07] focus-visible:bg-error/[0.07]"
            >
              <LogOut className="h-[18px] w-[18px] shrink-0" strokeWidth={1.5} />
              Logout
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Logout confirmation */}
      <Overlay open={confirm} onClose={() => !busy && setConfirm(false)} align="center">
        <div className="flex flex-col gap-5 p-6">
          <div className="flex items-center gap-3.5">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-error/10 text-error">
              <LogOut className="h-5 w-5" strokeWidth={1.5} />
            </span>
            <div>
              <h2 className="text-h4 text-ink">Sign out?</h2>
              <p className="mt-0.5 text-caption text-muted">You’ll need to sign in again to return.</p>
            </div>
          </div>
          <div className="flex gap-2.5">
            <Button variant="secondary" size="sm" className="flex-1" disabled={busy} onClick={() => setConfirm(false)}>
              Stay signed in
            </Button>
            <Button size="sm" className="flex-1 bg-error hover:bg-error/90" disabled={busy} onClick={handleLogout}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} /> : <LogOut className="h-4 w-4" strokeWidth={1.5} />}
              Sign out
            </Button>
          </div>
        </div>
      </Overlay>
    </div>
  )
}
