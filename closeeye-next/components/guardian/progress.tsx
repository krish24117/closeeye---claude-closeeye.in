import { cn } from '@/lib/utils'

/**
 * Progress — a calm segmented step indicator for multi-step Guardian flows.
 * Reusable: pass how many segments are complete out of the total. No numbers
 * shouted at the Guardian; a soft label ("Care · step 2 of 4") sits above.
 *
 * Design tokens only: accent-soft track, green fill, r-full segments.
 */
export function Progress({
  value,
  total,
  label,
  className,
}: {
  value: number
  total: number
  label?: string
  className?: string
}) {
  const clamped = Math.max(0, Math.min(value, total))
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {label && (
        <div className="flex items-center justify-between">
          <span className="text-caption font-semibold uppercase tracking-widest text-muted">{label}</span>
          <span className="text-caption font-semibold text-green">
            {clamped} of {total}
          </span>
        </div>
      )}
      <div className="flex gap-1.5" role="progressbar" aria-valuenow={clamped} aria-valuemin={0} aria-valuemax={total}>
        {Array.from({ length: total }).map((_, i) => (
          <span
            key={i}
            className={cn('h-1.5 flex-1 rounded-full transition-colors duration-300', i < clamped ? 'bg-green' : 'bg-accent-soft')}
          />
        ))}
      </div>
    </div>
  )
}
