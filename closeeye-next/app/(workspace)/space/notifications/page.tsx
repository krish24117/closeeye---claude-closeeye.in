'use client'

/**
 * Notifications — the workspace's real feed (reached from the shell bell). Reads the live,
 * user-scoped `notifications` table via lib/db/notifications (created server-side by triggers /
 * edge functions), and marks everything read on open so the bell badge clears. Honest: it shows
 * only real rows — an empty feed says so plainly, never seeds a demo notification.
 */
import * as React from 'react'
import Link from 'next/link'
import { ArrowLeft, Bell, Check } from 'lucide-react'
import { useAuth } from '@/components/auth/auth-provider'
import { fetchNotifications, markAllNotificationsRead, type AppNotification } from '@/lib/db/notifications'
import { formatTime, formatDate } from '@/lib/platform/locale'
import { DEFAULT_REGION_CODE } from '@/lib/platform/regions'

function whenLabel(iso: string): string {
  const d = new Date(iso), now = new Date()
  const time = formatTime(d, DEFAULT_REGION_CODE, { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase()
  return d.toDateString() === now.toDateString() ? `Today · ${time}` : formatDate(d, DEFAULT_REGION_CODE, { day: 'numeric', month: 'short' })
}

export default function NotificationsPage() {
  const { user } = useAuth()
  const [items, setItems] = React.useState<AppNotification[] | null>(null)
  const [error, setError] = React.useState(false)

  const load = React.useCallback(async () => {
    if (!user) return
    setError(false)
    try {
      const list = await fetchNotifications(user.id)
      setItems(list)
      // Clear the badge once seen — best-effort, never blocks the render.
      if (list.some((n) => !n.read)) void markAllNotificationsRead(user.id).catch(() => {})
    } catch { setError(true) }
  }, [user])
  React.useEffect(() => { void load() }, [load])

  return (
    <div className="flex flex-col gap-6">
      <Link href="/space" className="inline-flex items-center gap-1.5 text-caption font-semibold text-content-muted hover:text-content">
        <ArrowLeft className="h-4 w-4" strokeWidth={1.75} /> Home
      </Link>
      <h1 className="text-h2 text-content">Notifications</h1>

      {items === null && !error && <p className="py-16 text-center text-caption text-content-muted">Opening…</p>}
      {error && (
        <div className="py-16 text-center">
          <p className="text-body-sm text-content">We couldn’t open your notifications just now.</p>
          <button onClick={load} className="mt-4 rounded-full bg-surface-inverse px-5 py-2 text-body-sm font-semibold text-content-inverse">Try again</button>
        </div>
      )}

      {items !== null && items.length === 0 && (
        <div className="rounded-lg border border-edge/70 bg-surface-raised p-10 text-center shadow-sm">
          <span className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-surface-accent text-brand"><Bell className="h-6 w-6" strokeWidth={1.6} /></span>
          <p className="text-body-sm font-semibold text-content">You’re all caught up</p>
          <p className="mx-auto mt-1 max-w-xs text-caption text-content-muted">Close Eye will reach out here about the people you love — a change worth knowing, or a reply to something you asked.</p>
        </div>
      )}

      {items !== null && items.length > 0 && (
        <div className="flex flex-col gap-2.5">
          {items.map((n) => (
            <Link key={n.id} href={n.target} className="flex items-start gap-3 rounded-lg border border-edge/70 bg-surface-raised p-4 shadow-sm transition-colors hover:border-brand/40">
              <span className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full ${n.read ? 'bg-surface-accent/60 text-content-muted' : 'bg-surface-accent text-brand'}`}>
                <Bell className="h-4 w-4" strokeWidth={1.75} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="min-w-0 flex-1 truncate text-body-sm font-semibold text-content">{n.title}</p>
                  {!n.read && <span className="h-2 w-2 shrink-0 rounded-full bg-brand" aria-label="Unread" />}
                </div>
                {n.message && <p className="mt-0.5 text-caption leading-relaxed text-content-muted">{n.message}</p>}
                <p className="mt-1 text-caption text-content-muted/70">{whenLabel(n.created_at)}</p>
              </div>
            </Link>
          ))}
          <p className="mt-2 inline-flex items-center justify-center gap-1.5 self-center text-caption text-content-muted">
            <Check className="h-3.5 w-3.5 text-brand" strokeWidth={2.4} /> All marked read
          </p>
        </div>
      )}
    </div>
  )
}
