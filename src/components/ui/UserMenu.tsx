import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { User, Settings, Bell, LifeBuoy, LogOut, Loader2, ChevronRight } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import clsx from 'clsx'

/**
 * UserMenu — the shared account menu for the Vite app (closeeye.in). Mirrors the
 * closeeye-next UserMenu so the signed-in experience is consistent across both
 * Close Eye codebases: an avatar that opens a dropdown with My Profile, Account
 * Settings, Notification Preferences, Help & Support, and Logout.
 *
 * This is a sibling of closeeye-next/components/ui/user-menu.tsx — the two apps
 * are separate builds (Vite + react-router here, Next.js there) with different
 * design systems, so they can't share one file, but they share one behaviour.
 *
 * Sign-out is real: it clears the Supabase session (via the app auth context),
 * wipes local/session storage, and hard-redirects to the login screen. Auth is
 * Supabase across Close Eye — there is no Firebase here.
 */
export interface UserMenuProps {
  name: string
  email?: string | null
  avatarUrl?: string | null
  initials: string
  roleLabel?: string
  profileHref: string
  accountHref: string
  notificationsHref: string
  helpHref?: string
  loginPath?: string
  align?: 'left' | 'right'
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
  helpHref = '/faq',
  loginPath = '/auth',
  align = 'right',
}: UserMenuProps) {
  const { signOut } = useAuth()
  const navigate = useNavigate()
  const wrapRef = useRef<HTMLDivElement>(null)

  const [open, setOpen] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [busy, setBusy] = useState(false)
  const [imgFailed, setImgFailed] = useState(false)

  const displayName = name?.trim() || 'Your account'

  useEffect(() => {
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

  const items = [
    { label: 'My Profile', href: profileHref, icon: User },
    { label: 'Account Settings', href: accountHref, icon: Settings },
    { label: 'Notification Preferences', href: notificationsHref, icon: Bell },
    { label: 'Help & Support', href: helpHref, icon: LifeBuoy },
  ]

  async function handleLogout() {
    if (busy) return
    setBusy(true)
    try {
      await signOut()
    } catch (err) {
      // Even if the network sign-out fails, clear this device and go to login —
      // never leave the user half-signed-in.
      console.error('Sign out failed; clearing device anyway:', err)
    } finally {
      try {
        window.localStorage.clear()
        window.sessionStorage.clear()
      } catch {
        /* storage unavailable (private mode) — safe to ignore */
      }
      window.location.replace(loginPath)
    }
  }

  const avatar = (
    <span className="grid h-9 w-9 place-items-center overflow-hidden rounded-full bg-green-800 text-white">
      {avatarUrl && !imgFailed ? (
        // eslint-disable-next-line jsx-a11y/alt-text
        <img
          src={avatarUrl}
          alt=""
          referrerPolicy="no-referrer"
          onError={() => setImgFailed(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <span className="text-xs font-bold leading-none">{initials}</span>
      )}
    </span>
  )

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        className={clsx(
          'grid place-items-center rounded-full transition-opacity hover:opacity-90',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2',
          open && 'ring-2 ring-green-600 ring-offset-2',
        )}
      >
        {avatar}
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Account"
          className={clsx(
            'absolute top-[calc(100%+0.5rem)] z-50 w-64 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl',
            align === 'right' ? 'right-0' : 'left-0',
          )}
        >
          <div className="flex items-center gap-3 border-b border-gray-100 px-4 py-3.5">
            {avatar}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-gray-900">{displayName}</p>
              {email && <p className="truncate text-xs text-gray-500">{email}</p>}
              {roleLabel && (
                <p className="mt-1 text-[0.6rem] font-bold uppercase tracking-widest text-green-700">{roleLabel}</p>
              )}
            </div>
          </div>

          <div className="py-1">
            {items.map(({ label, href, icon: Icon }) => (
              <Link
                key={label}
                to={href}
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-green-50 hover:text-green-800"
              >
                <Icon size={16} className="shrink-0 text-gray-400" />
                <span className="flex-1">{label}</span>
                <ChevronRight size={15} className="shrink-0 text-gray-300" />
              </Link>
            ))}
          </div>

          <div className="border-t border-gray-100 py-1">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false)
                setConfirm(true)
              }}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50"
            >
              <LogOut size={16} className="shrink-0" />
              Logout
            </button>
          </div>
        </div>
      )}

      {/* Logout confirmation */}
      {confirm && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4"
          onClick={() => !busy && setConfirm(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-red-50 text-red-600">
                <LogOut size={18} />
              </span>
              <div>
                <h2 className="text-base font-bold text-gray-900">Sign out?</h2>
                <p className="text-xs text-gray-500">You&apos;ll need to sign in again to return.</p>
              </div>
            </div>
            <div className="mt-5 flex gap-2.5">
              <button
                type="button"
                disabled={busy}
                onClick={() => setConfirm(false)}
                className="flex-1 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
              >
                Stay signed in
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={handleLogout}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-60"
              >
                {busy ? <Loader2 size={16} className="animate-spin" /> : <LogOut size={16} />}
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
