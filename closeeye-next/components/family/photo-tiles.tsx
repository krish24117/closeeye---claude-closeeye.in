import { Camera } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Placeholder photo tiles — warm, on-brand. Real photos drop in via `srcs`
 * later (see Photography direction); until then these carry the intent.
 */
export function PhotoTiles({ count, className }: { count: number; className?: string }) {
  return (
    <div className={cn('grid grid-cols-3 gap-2', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="grid aspect-square place-items-center rounded-sm border border-line bg-accent-soft text-green/40"
        >
          <Camera className="h-5 w-5" strokeWidth={1.5} aria-hidden />
        </div>
      ))}
    </div>
  )
}
