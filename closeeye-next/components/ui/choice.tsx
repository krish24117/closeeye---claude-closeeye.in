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
          'focus-visible:ring-green focus-visible:ring-offset-2 focus-visible:ring-offset-ivory',
        selected
          ? 'border-green bg-accent-soft text-green'
          : 'border-line bg-card text-ink hover:border-ink/30',
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
        'group relative flex w-full flex-col items-start gap-4 rounded-md border bg-card p-6 text-left ' +
          'transition duration-feedback ease-standard focus-visible:outline-none focus-visible:ring-2 ' +
          'focus-visible:ring-green focus-visible:ring-offset-2 focus-visible:ring-offset-ivory',
        selected
          ? 'border-green shadow-md ring-1 ring-green'
          : 'border-line shadow-sm hover:-translate-y-0.5 hover:border-ink/20 hover:shadow-md',
        className,
      )}
      {...props}
    >
      <span
        className={cn(
          'absolute right-5 top-5 grid h-6 w-6 place-items-center rounded-full border transition-colors',
          selected ? 'border-green bg-green text-ivory' : 'border-line text-transparent',
        )}
        aria-hidden
      >
        <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
      </span>

      {icon && <FeatureIcon icon={icon} size="md" tone={selected ? 'solid' : 'soft'} />}
      <span className="pr-8">
        <span className="block text-h4 text-ink">{title}</span>
        {description && <span className="mt-1.5 block text-body-sm text-muted">{description}</span>}
      </span>
      {meta && <span className="mt-auto text-body-sm text-muted">{meta}</span>}
    </button>
  )
}
