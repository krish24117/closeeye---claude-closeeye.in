import * as React from 'react'
import { CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/**
 * Production experience states — one warm, on-brand treatment for empty, success and
 * error. Reusable across every module. No new colours; design-system tokens only.
 */

export function EmptyState({
  icon: Icon,
  title,
  hint,
  action,
  className,
}: {
  icon: LucideIcon
  title: string
  hint?: string
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-line bg-card/50 px-6 py-12 text-center', className)}>
      <span className="grid h-16 w-16 place-items-center rounded-full bg-accent-soft text-green">
        <Icon className="h-8 w-8" strokeWidth={1.5} />
      </span>
      <div>
        <p className="text-h4 text-ink">{title}</p>
        {hint && <p className="mt-1.5 text-body-sm leading-relaxed text-muted">{hint}</p>}
      </div>
      {action}
    </div>
  )
}

export function SuccessState({
  title,
  message,
  action,
  className,
}: {
  title: string
  message?: string
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-5 px-6 py-12 text-center', className)}>
      <span className="ce-pop grid h-24 w-24 place-items-center rounded-full bg-success/12 text-success">
        <CheckCircle2 className="h-12 w-12" strokeWidth={1.5} />
      </span>
      <div className="ce-fade-in">
        <h2 className="text-h2 text-ink">{title}</h2>
        {message && <p className="mx-auto mt-2 max-w-md text-body leading-relaxed text-muted">{message}</p>}
      </div>
      {action && <div className="ce-fade-in">{action}</div>}
    </div>
  )
}

export function ErrorState({
  title = 'Something went wrong',
  message = 'That didn’t go through. Please try again — nothing was lost.',
  icon: Icon = AlertTriangle,
  onRetry,
  retryLabel = 'Try again',
  className,
}: {
  title?: string
  message?: string
  icon?: LucideIcon
  onRetry?: () => void
  retryLabel?: string
  className?: string
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-5 px-6 py-12 text-center', className)}>
      <span className="grid h-20 w-20 place-items-center rounded-full bg-warning/10 text-warning">
        <Icon className="h-9 w-9" strokeWidth={1.5} />
      </span>
      <div>
        <h2 className="text-h3 text-ink">{title}</h2>
        <p className="mx-auto mt-2 max-w-md text-body leading-relaxed text-muted">{message}</p>
      </div>
      {onRetry && (
        <Button onClick={onRetry} size="sm">
          <RefreshCw className="h-4 w-4" strokeWidth={1.75} /> {retryLabel}
        </Button>
      )}
    </div>
  )
}
