/* eslint-disable @next/next/no-img-element */
'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

const sizes = {
  sm: 'h-9 w-9 text-caption',
  md: 'h-12 w-12 text-body-sm',
  lg: 'h-16 w-16 text-h4',
  xl: 'h-20 w-20 text-h3',
} as const

/**
 * Avatar — shows the person's photo when we have one (e.g. a Google account
 * picture), and falls back to initials both when there's no photo and if the
 * image fails to load.
 */
export function Avatar({
  initials,
  src,
  alt,
  size = 'md',
  tone = 'soft',
  className,
}: {
  initials: string
  src?: string | null
  alt?: string
  size?: keyof typeof sizes
  tone?: 'soft' | 'solid'
  className?: string
}) {
  const [failed, setFailed] = useState(false)

  if (src && !failed) {
    return (
      <img
        src={src}
        alt={alt ?? ''}
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className={cn('shrink-0 rounded-full bg-accent-soft object-cover', sizes[size], className)}
      />
    )
  }

  return (
    <span
      className={cn(
        'grid shrink-0 place-items-center rounded-full font-semibold',
        tone === 'solid' ? 'bg-ink text-ivory' : 'bg-accent-soft text-green',
        sizes[size],
        className,
      )}
      aria-hidden
    >
      {initials}
    </span>
  )
}
