import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * The single card. White surface, hairline border, soft shadow. `interactive`
 * adds the lift-on-hover used by clickable cards. Cards are used sparingly — most
 * sections use full-width / split / timeline layouts instead (see design system).
 */
export const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { interactive?: boolean }
>(({ className, interactive = false, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'rounded-lg border border-edge bg-surface-raised p-7 shadow-sm',
      interactive && 'transition duration-transition ease-standard hover:-translate-y-1 hover:shadow-md',
      className,
    )}
    {...props}
  />
))
Card.displayName = 'Card'
