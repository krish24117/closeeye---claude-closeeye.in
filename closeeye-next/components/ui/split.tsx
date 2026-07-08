import * as React from 'react'
import { cn } from '@/lib/utils'
import { Reveal } from './reveal'

/**
 * Two-column media/content layout. `reverse` swaps sides so consecutive splits
 * alternate — the backbone of the page's visual rhythm (not everything is a card).
 * Stacks media-first on mobile.
 */
export function Split({
  media,
  children,
  reverse = false,
  className,
}: {
  media: React.ReactNode
  children: React.ReactNode
  reverse?: boolean
  className?: string
}) {
  return (
    <div className={cn('grid items-center gap-10 lg:grid-cols-2 lg:gap-16', className)}>
      <Reveal direction={reverse ? 'left' : 'right'} className={cn(reverse && 'lg:order-2')}>
        {media}
      </Reveal>
      <Reveal direction={reverse ? 'right' : 'left'} className={cn(reverse && 'lg:order-1')}>
        {children}
      </Reveal>
    </div>
  )
}
