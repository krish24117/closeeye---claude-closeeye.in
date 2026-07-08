import { clsx, type ClassValue } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

/**
 * tailwind-merge, taught about our custom type scale. Without this, twMerge
 * cannot tell `text-body-sm` / `text-h1` (font sizes) apart from `text-ivory`
 * (a colour) and drops one when both appear in a single cn() call — which
 * silently stripped `text-ivory` off primary buttons. Registering the scale in
 * the `font-size` group keeps sizes and colours from ever colliding.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [{ text: ['h1', 'h2', 'h3', 'h4', 'lead', 'body', 'body-sm', 'caption'] }],
    },
  },
})

/** Merge Tailwind class lists with correct conflict resolution. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
