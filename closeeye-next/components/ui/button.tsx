import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

/**
 * Design Authority — the ONLY four buttons in Close Eye:
 *   • primary   — solid ink, the single most important action
 *   • secondary — bordered, sits beside a primary
 *   • ghost     — filled-on-hover, low-emphasis (toolbars, cards, steppers)
 *   • text      — inline text action
 * `onDark` inverts them for placement on ink (dark) surfaces.
 * Do not add a fifth style. Radius = 12px (r-sm), per the Authority.
 */
const button = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-sm font-semibold ' +
    'transition-all duration-200 ease-premium select-none disabled:pointer-events-none disabled:opacity-50 ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-green ' +
    'focus-visible:ring-offset-ivory [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary: 'bg-ink text-ivory shadow-sm hover:bg-green-hover hover:-translate-y-0.5 hover:shadow-md',
        secondary: 'border border-ink/15 bg-transparent text-ink hover:border-ink/35 hover:bg-ink/[0.03]',
        ghost: 'bg-transparent text-ink hover:bg-accent-soft',
        text: 'h-auto rounded-none px-0 text-green underline-offset-4 hover:underline',
      },
      size: {
        sm: 'h-11 px-5 text-body-sm',
        md: 'h-12 px-7 text-[0.975rem]',
        lg: 'h-14 px-8 text-body',
      },
      onDark: { true: '', false: '' },
    },
    compoundVariants: [
      { variant: 'primary', onDark: true, class: 'bg-ivory text-ink hover:bg-white hover:shadow-lg' },
      { variant: 'secondary', onDark: true, class: 'border-white/25 text-white hover:border-white/50 hover:bg-white/10' },
      { variant: 'ghost', onDark: true, class: 'text-white hover:bg-white/10' },
      { variant: 'text', onDark: true, class: 'text-accent' },
      { variant: 'text', size: 'sm', class: 'h-auto' },
      { variant: 'text', size: 'md', class: 'h-auto' },
      { variant: 'text', size: 'lg', class: 'h-auto' },
    ],
    defaultVariants: { variant: 'primary', size: 'md', onDark: false },
  },
)

export interface ButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onDark'>,
    VariantProps<typeof button> {
  asChild?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, onDark, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return <Comp ref={ref} className={cn(button({ variant, size, onDark }), className)} {...props} />
  },
)
Button.displayName = 'Button'
