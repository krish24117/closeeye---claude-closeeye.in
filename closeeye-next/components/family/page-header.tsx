import { cn } from '@/lib/utils'

/** Consistent screen header for every Family Space page. */
export function PageHeader({
  title,
  subtitle,
  action,
  className,
}: {
  title: string
  subtitle?: string
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-wrap items-end justify-between gap-4', className)}>
      <div>
        <h1 className="text-h3">{title}</h1>
        {subtitle && <p className="mt-1.5 text-body text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}
