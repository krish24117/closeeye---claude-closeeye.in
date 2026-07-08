import * as React from 'react'
import { cn } from '@/lib/utils'

/** Centred content column — caps at the brand max-width. 32px gutters on mobile. */
export function Container({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('mx-auto w-full max-w-content px-8', className)} {...props} />
}
