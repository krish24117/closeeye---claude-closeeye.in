import type { LucideIcon } from 'lucide-react'
import { FeatureIcon } from '@/components/ui/feature-icon'

/** Placeholder for tabs that arrive in a later milestone — keeps nav honest. */
export function ComingSoon({ icon, title, description, milestone }: { icon: LucideIcon; title: string; description: string; milestone: string }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <FeatureIcon icon={icon} size="lg" />
      <div>
        <h1 className="text-h3">{title}</h1>
        <p className="mt-2 max-w-xs text-body text-muted">{description}</p>
      </div>
      <span className="rounded-full bg-accent-soft px-3.5 py-1.5 text-caption font-semibold text-green">Arrives in {milestone}</span>
    </div>
  )
}
