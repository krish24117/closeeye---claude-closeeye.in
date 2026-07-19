import * as React from 'react'
import { Check } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { FeatureIcon } from './feature-icon'

/**
 * Selection controls — inherit the Design System. Chip for single-word choices;
 * OptionCard for richer, explained choices. Both keyboard-accessible.
 */

export function Chip({
  selected,
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { selected?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-4 py-2.5 text-body-sm font-medium ' +
          'transition duration-feedback ease-standard focus-visible:outline-none focus-visible:ring-2 ' +
          'focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
        selected
          ? 'border-brand bg-surface-accent text-brand'
          : 'border-edge bg-surface-raised text-content hover:border-content/30',
        className,
      )}
      {...props}
    >
      {selected && <Check className="h-4 w-4" strokeWidth={2} />}
      {children}
    </button>
  )
}

export function OptionCard({
  selected,
  icon,
  title,
  description,
  meta,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  selected?: boolean
  icon?: LucideIcon
  title: string
  description?: string
  meta?: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cn(
        'group relative flex w-full flex-col items-start gap-4 rounded-md border bg-surface-raised p-6 text-start ' +
          'transition duration-feedback ease-standard focus-visible:outline-none focus-visible:ring-2 ' +
          'focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
        selected
          ? 'border-brand shadow-md ring-1 ring-brand'
          : 'border-edge shadow-sm hover:-translate-y-0.5 hover:border-content/20 hover:shadow-md',
        className,
      )}
      {...props}
    >
      <span
        className={cn(
          'absolute right-5 top-5 grid h-6 w-6 place-items-center rounded-full border transition-colors',
          selected ? 'border-brand bg-brand text-content-inverse' : 'border-edge text-transparent',
        )}
        aria-hidden
      >
        <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
      </span>

      {icon && <FeatureIcon icon={icon} size="md" tone={selected ? 'solid' : 'soft'} />}
      <span className="pe-8">
        <span className="block text-h4 text-content">{title}</span>
        {description && <span className="mt-1.5 block text-body-sm text-content-muted">{description}</span>}
      </span>
      {meta && <span className="mt-auto text-body-sm text-content-muted">{meta}</span>}
    </button>
  )
}
