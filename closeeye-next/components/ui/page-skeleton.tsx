import { Skeleton, SkeletonCard, SkeletonList, SkeletonStats, SkeletonChart } from '@/components/ui/skeleton'

type Variant = 'dashboard' | 'list' | 'finance' | 'detail'

/** A calm, shimmer page-loading skeleton (no spinners). Used by route `loading.tsx`. */
export function PageSkeleton({ variant = 'list' }: { variant?: Variant }) {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Loading">
      {/* Heading */}
      <div className="space-y-2.5">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-3.5 w-80 max-w-full" />
      </div>

      {variant === 'dashboard' && (
        <>
          <SkeletonStats count={6} />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <SkeletonCard /><SkeletonCard /><SkeletonCard />
          </div>
          <SkeletonList rows={5} />
        </>
      )}

      {variant === 'list' && (
        <>
          <SkeletonStats count={4} />
          <SkeletonList rows={6} />
        </>
      )}

      {variant === 'finance' && (
        <>
          <SkeletonStats count={6} />
          <SkeletonChart />
          <SkeletonList rows={5} />
        </>
      )}

      {variant === 'detail' && (
        <>
          <SkeletonCard />
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-4"><SkeletonCard /><SkeletonList rows={4} /></div>
            <div className="space-y-4"><SkeletonCard /><SkeletonCard /></div>
          </div>
        </>
      )}
    </div>
  )
}
