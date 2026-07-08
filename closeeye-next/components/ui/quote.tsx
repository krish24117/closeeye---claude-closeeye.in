import { cn } from '@/lib/utils'

/**
 * Large editorial pull-quote. Used for the founder line and testimonials —
 * a deliberate break from card layouts. `size="hero"` is the full-bleed register.
 */
export function Quote({
  children,
  cite,
  size = 'md',
  tone = 'dark',
  className,
}: {
  children: React.ReactNode
  cite?: string
  size?: 'md' | 'hero'
  tone?: 'dark' | 'light'
  className?: string
}) {
  return (
    <figure className={cn('flex flex-col gap-6', className)}>
      <blockquote
        className={cn(
          'font-medium tracking-[-0.02em]',
          size === 'hero' ? 'text-h3 sm:text-h2' : 'text-h4 leading-relaxed sm:text-h3',
          tone === 'light' ? 'text-white' : 'text-ink',
        )}
      >
        <span aria-hidden className={cn('mr-1 align-top', tone === 'light' ? 'text-accent' : 'text-green/40')}>
          “
        </span>
        {children}
      </blockquote>
      {cite && (
        <figcaption className={cn('text-body-sm', tone === 'light' ? 'text-white/60' : 'text-muted')}>
          {cite}
        </figcaption>
      )}
    </figure>
  )
}
