import { cn } from '@/lib/utils'

interface Point { label: string; value: number }

/**
 * BarChart — a calm vertical bar chart (design-system tokens only, no libraries).
 * The last bar is emphasised as "now". `format` labels the peak value.
 */
export function BarChart({ data, format, className }: { data: Point[]; format?: (n: number) => string; className?: string }) {
  const max = Math.max(...data.map((d) => d.value)) || 1
  return (
    <div className={cn('flex items-end gap-2', className)} style={{ height: 160 }}>
      {data.map((d, i) => {
        const h = Math.max(4, Math.round((d.value / max) * 132))
        const last = i === data.length - 1
        return (
          <div key={d.label} className="flex flex-1 flex-col items-center gap-1.5" title={format ? format(d.value) : String(d.value)}>
            <span className={cn('text-[0.6rem] font-semibold tabular-nums', last ? 'text-green' : 'text-transparent')}>{format ? format(d.value) : d.value}</span>
            <div className="flex w-full flex-1 items-end">
              <div className={cn('w-full rounded-t-sm transition-all', last ? 'bg-green' : 'bg-accent-soft')} style={{ height: h }} />
            </div>
            <span className="text-caption text-muted">{d.label}</span>
          </div>
        )
      })}
    </div>
  )
}

/** TrendArea — a soft area/line sparkline for trends. */
export function TrendArea({ data, tone = 'green', className }: { data: Point[]; tone?: 'green' | 'warning'; className?: string }) {
  const max = Math.max(...data.map((d) => d.value))
  const min = Math.min(...data.map((d) => d.value))
  const span = max - min || 1
  const pts = data.map((d, i) => {
    const x = (i / (data.length - 1)) * 100
    const y = 34 - ((d.value - min) / span) * 28
    return [x, y] as const
  })
  const line = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const area = `${line} L100,40 L0,40 Z`
  const stroke = tone === 'warning' ? 'stroke-warning' : 'stroke-green'
  const fill = tone === 'warning' ? 'fill-warning/10' : 'fill-green/10'
  return (
    <svg viewBox="0 0 100 40" preserveAspectRatio="none" className={cn('h-16 w-full', className)} aria-hidden>
      <path d={area} className={fill} />
      <path d={line} fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" className={stroke} />
    </svg>
  )
}
