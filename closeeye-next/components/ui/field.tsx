import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * Form primitives — inherit the Design System (radius-sm, border-line, green
 * focus ring, ink text). No new styles; these complete the Component Library's
 * Forms entry. Used across the Booking flow and any future form.
 */

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn('block text-body-sm font-semibold text-ink', className)}
      {...props}
    />
  )
}

const fieldBase =
  'w-full rounded-sm border border-line bg-card px-4 text-body text-ink placeholder:text-muted/70 ' +
  'transition-colors duration-200 ease-premium focus:border-green focus:outline-none ' +
  'focus:ring-2 focus:ring-green/25 disabled:cursor-not-allowed disabled:bg-muted/10 ' +
  'aria-[invalid=true]:border-error aria-[invalid=true]:ring-error/25'

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input ref={ref} className={cn(fieldBase, 'h-12', className)} {...props} />
  ),
)
Input.displayName = 'Input'

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea ref={ref} className={cn(fieldBase, 'min-h-[7rem] resize-y py-3', className)} {...props} />
))
Textarea.displayName = 'Textarea'

/** Label + control + helper/error, with correct aria wiring. */
export function Field({
  label,
  htmlFor,
  error,
  hint,
  optional,
  className,
  children,
}: {
  label: string
  htmlFor?: string
  error?: string
  hint?: string
  optional?: boolean
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <Label htmlFor={htmlFor}>
        {label}
        {optional && <span className="ml-1.5 font-normal text-muted">(optional)</span>}
      </Label>
      {children}
      {error ? (
        <p className="text-caption text-error">{error}</p>
      ) : hint ? (
        <p className="text-caption text-muted">{hint}</p>
      ) : null}
    </div>
  )
}
