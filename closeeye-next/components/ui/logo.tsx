import { cn } from '@/lib/utils'

/**
 * Close Eye logo mark — the OFFICIAL brand asset (`public/logo-mark.png`).
 * Rendered as a plain <img> so it stays crisp at every size it's used (h-7…h-20)
 * and paints immediately in headers (no image-optimisation lazy-flash).
 * (Replaces the earlier hand-traced SVG stand-in.)
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/logo-mark.png" alt="Close Eye" className={cn('h-8 w-8 object-contain', className)} />
  )
}

/**
 * Full logo lockup — mark + wordmark. The official wordmark is lowercase
 * "close eye" (the logo only); body copy elsewhere still reads "Close Eye".
 */
export function Logo({
  className,
  tone = 'dark',
  showWordmark = true,
}: {
  className?: string
  tone?: 'dark' | 'light'
  showWordmark?: boolean
}) {
  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      <LogoMark className="h-8 w-8 shrink-0" />
      {showWordmark && (
        <span
          className={cn(
            'text-[1.25rem] font-extrabold lowercase leading-none tracking-[-0.02em]',
            tone === 'light' ? 'text-white' : 'text-ink',
          )}
        >
          close eye
        </span>
      )}
    </span>
  )
}
