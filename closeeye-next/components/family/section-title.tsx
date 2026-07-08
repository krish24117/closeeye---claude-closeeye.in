import Link from 'next/link'
import { cn } from '@/lib/utils'

/** One section-title treatment across every Family Space screen. */
export function SectionTitle({
  children,
  href,
  cta,
  className,
}: {
  children: React.ReactNode
  href?: string
  cta?: string
  className?: string
}) {
  return (
    <div className={cn('flex items-end justify-between gap-4', className)}>
      <h2 className="text-h4">{children}</h2>
      {href && cta && (
        <Link href={href} className="shrink-0 text-body-sm font-semibold text-green transition-colors hover:text-green-hover">
          {cta}
        </Link>
      )}
    </div>
  )
}
