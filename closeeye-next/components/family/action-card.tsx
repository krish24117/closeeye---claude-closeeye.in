import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { FeatureIcon } from '@/components/ui/feature-icon'
import { cn } from '@/lib/utils'

export interface ActionCardData {
  label: string
  description: string
  href: string
  icon: LucideIcon
}

/**
 * The one action-card. Icon · title · one-line description · arrow, with the
 * standard card treatment (rounded-lg, hairline border, shadow-sm) and the
 * standard press/hover feedback. Reused for Quick Actions and anywhere a
 * navigational card is needed.
 */
export function ActionCard({ label, description, href, icon }: ActionCardData) {
  return (
    <Link
      href={href}
      className={cn(
        'group flex items-start gap-4 rounded-lg border border-line/70 bg-card p-5 shadow-sm',
        'transition-all duration-200 ease-premium hover:-translate-y-0.5 hover:border-accent hover:shadow-md active:translate-y-0 active:shadow-sm',
      )}
    >
      <FeatureIcon icon={icon} size="md" />
      <div className="min-w-0 flex-1">
        <p className="text-body font-semibold text-ink">{label}</p>
        <p className="mt-0.5 text-body-sm text-muted">{description}</p>
      </div>
      <ChevronRight className="mt-0.5 h-5 w-5 shrink-0 text-muted transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-green" strokeWidth={1.5} />
    </Link>
  )
}
