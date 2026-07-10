'use client'

import Link from 'next/link'
import { Avatar } from '@/components/family/avatar'
import { cn } from '@/lib/utils'

/**
 * AvatarLink — the header account avatar on app surfaces that already have a
 * bottom Profile/Me tab (Family, Guardian). It's a quiet tap-through to the
 * Profile page, NOT a dropdown: account, settings and logout live on the
 * Profile page (native iOS/Android convention), so a header menu would only
 * duplicate the bottom tab.
 *
 * Surfaces WITHOUT a bottom nav (Presence Console, Admin, marketing) keep the
 * full <UserMenu> in the header — there the avatar IS the account home.
 */
export function AvatarLink({
  href,
  initials,
  avatarUrl,
  name,
  tone = 'soft',
  className,
}: {
  href: string
  initials: string
  avatarUrl?: string | null
  name?: string
  tone?: 'soft' | 'solid'
  className?: string
}) {
  return (
    <Link
      href={href}
      aria-label="Your profile"
      className={cn(
        'grid place-items-center rounded-full outline-none transition-all duration-200 ease-premium',
        'hover:opacity-90 active:scale-95',
        'focus-visible:ring-2 focus-visible:ring-green focus-visible:ring-offset-2 focus-visible:ring-offset-ivory',
        className,
      )}
    >
      <Avatar initials={initials} src={avatarUrl} alt={name ?? ''} size="sm" tone={tone} />
    </Link>
  )
}
