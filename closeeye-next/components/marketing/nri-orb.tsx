import { cn } from '@/lib/utils'

/**
 * The Connect orb, sized for marketing surfaces — a dark well with a luminous sage core.
 * Uses the shared `--orb` token (never a raw hex), so it stays in lock-step with the dock/sheet orb.
 * Decorative only (aria-hidden). The gentle pulse is disabled under prefers-reduced-motion.
 */
export function NriOrb({ size = 'md', className }: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const [shell, core] = {
    sm: ['h-10 w-10', 'h-3.5 w-3.5'],
    md: ['h-14 w-14', 'h-5 w-5'],
    lg: ['h-16 w-16', 'h-6 w-6'],
  }[size]
  return (
    <span aria-hidden className={cn('relative grid shrink-0 place-items-center rounded-full bg-surface-inverse', shell, className)}>
      <span
        className={cn('rounded-full bg-orb animate-pulse motion-reduce:animate-none', core)}
        style={{ boxShadow: '0 0 20px 5px hsl(var(--orb) / 0.5)' }}
      />
    </span>
  )
}
