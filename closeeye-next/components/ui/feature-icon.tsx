import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * The single icon treatment in Close Eye. Every section/card/list icon renders
 * through here, so stroke width (1.5), sizing, and the containing chip are
 * identical everywhere. Two visual registers only: soft (default) and solid.
 */
const sizes = {
  sm: { box: 'h-10 w-10 rounded-md', icon: 'h-5 w-5' },
  md: { box: 'h-12 w-12 rounded-lg', icon: 'h-6 w-6' },
  lg: { box: 'h-14 w-14 rounded-lg', icon: 'h-7 w-7' },
} as const

export function FeatureIcon({
  icon: Icon,
  size = 'md',
  tone = 'soft',
  className,
}: {
  icon: LucideIcon
  size?: keyof typeof sizes
  tone?: 'soft' | 'solid' | 'onDark'
  className?: string
}) {
  const s = sizes[size]
  const toneClass =
    tone === 'solid'
      ? 'bg-ink text-ivory'
      : tone === 'onDark'
        ? 'bg-white/10 text-accent'
        : 'bg-accent-soft text-green'
  return (
    <span className={cn('grid shrink-0 place-items-center', s.box, toneClass, className)}>
      <Icon className={s.icon} strokeWidth={1.5} aria-hidden />
    </span>
  )
}
