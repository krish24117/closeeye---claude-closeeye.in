import { cn } from '@/lib/utils'

const sizes = {
  sm: 'h-9 w-9 text-caption',
  md: 'h-12 w-12 text-body-sm',
  lg: 'h-16 w-16 text-h4',
  xl: 'h-20 w-20 text-h3',
} as const

/** Initials avatar — inherits brand green. Used where we have no photo yet. */
export function Avatar({
  initials,
  size = 'md',
  tone = 'soft',
  className,
}: {
  initials: string
  size?: keyof typeof sizes
  tone?: 'soft' | 'solid'
  className?: string
}) {
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
