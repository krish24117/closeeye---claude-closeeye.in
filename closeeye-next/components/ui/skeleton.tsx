import { cn } from '@/lib/utils'

/** Shimmer skeleton primitives — replace spinners with calm, on-brand loading. */
export function Skeleton({ className }: { className?: string }) {
  return <span className={cn('ce-skeleton block', className)} aria-hidden />
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-lg border border-line bg-card p-5 shadow-sm', className)} aria-hidden>
      <div className="flex items-center gap-3">
        <Skeleton className="h-11 w-11 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3.5 w-1/2" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-5/6" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    </div>
  )
}

export function SkeletonList({ rows = 4, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn('overflow-hidden rounded-lg border border-line bg-card shadow-sm', className)} aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 border-b border-line px-5 py-3.5 last:border-b-0">
          <Skeleton className="h-9 w-9 rounded-full" />
          <div className="flex-1 space-y-2"><Skeleton className="h-3.5 w-1/3" /><Skeleton className="h-3 w-1/4" /></div>
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
      ))}
    </div>
  )
}

export function SkeletonStats({ count = 4, className }: { count?: number; className?: string }) {
  return (
    <div className={cn('grid grid-cols-2 gap-3 md:grid-cols-4', className)} aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-lg border border-line bg-card p-4 shadow-sm">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="mt-2 h-3 w-1/2" />
        </div>
      ))}
    </div>
  )
}

export function SkeletonChart({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-lg border border-line bg-card p-5 shadow-sm', className)} aria-hidden>
      <Skeleton className="h-4 w-1/4" />
      <div className="mt-5 flex h-40 items-end gap-2">
        {['h-16', 'h-24', 'h-20', 'h-32', 'h-24', 'h-36', 'h-20'].map((h, i) => <Skeleton key={i} className={cn('flex-1 rounded-t-sm', h)} />)}
      </div>
    </div>
  )
}
