import * as React from 'react'
import { cn } from '@/lib/utils'

/** Small status/label chip. Two tones only — soft (light UI) and onDark. */
export function Badge({
  className,
  tone = 'soft',
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: 'soft' | 'onDark' }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-caption font-medium',
        tone === 'onDark' ? 'bg-white/10 text-accent' : 'bg-accent-soft text-green',
        className,
      )}
      {...props}
    />
  )
}
