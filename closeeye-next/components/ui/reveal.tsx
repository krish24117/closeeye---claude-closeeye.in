'use client'

import * as React from 'react'
import { motion, useReducedMotion, type Variants } from 'framer-motion'
import { cn } from '@/lib/utils'

const EASE = [0.22, 1, 0.36, 1] as const

type Direction = 'up' | 'down' | 'left' | 'right' | 'none'

const offset: Record<Direction, { x?: number; y?: number }> = {
  up: { y: 24 },
  down: { y: -24 },
  left: { x: 24 },
  right: { x: -24 },
  none: {},
}

interface RevealProps extends React.HTMLAttributes<HTMLDivElement> {
  as?: 'div' | 'section' | 'article' | 'li' | 'ul' | 'span'
  direction?: Direction
  delay?: number
  duration?: number
  /** Re-animate every time it re-enters the viewport. */
  once?: boolean
  amount?: number
}

/**
 * Scroll-triggered fade/slide. Honours prefers-reduced-motion (renders static).
 * The workhorse animation primitive — every section reveals through this.
 */
export function Reveal({
  as = 'div',
  direction = 'up',
  delay = 0,
  duration = 0.6,
  once = true,
  amount = 0.35,
  className,
  children,
  ...props
}: RevealProps) {
  const reduce = useReducedMotion()
  const MotionTag = motion[as] as typeof motion.div

  if (reduce) {
    const Tag = as as React.ElementType
    return (
      <Tag className={className} {...props}>
        {children}
      </Tag>
    )
  }

  return (
    <MotionTag
      className={cn(className)}
      initial={{ opacity: 0, ...offset[direction] }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once, amount }}
      transition={{ duration, delay, ease: EASE }}
      {...(props as React.ComponentProps<typeof motion.div>)}
    >
      {children}
    </MotionTag>
  )
}

/* ── Stagger container + item — for grids/lists that cascade in ─────────── */

export const staggerContainer: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.09, delayChildren: 0.05 },
  },
}

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
}

interface StaggerProps extends React.HTMLAttributes<HTMLDivElement> {
  amount?: number
}

export function Stagger({ className, children, amount = 0.2, ...props }: StaggerProps) {
  const reduce = useReducedMotion()
  if (reduce) {
    return (
      <div className={className} {...props}>
        {children}
      </div>
    )
  }
  return (
    <motion.div
      className={className}
      variants={staggerContainer}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount }}
      {...(props as React.ComponentProps<typeof motion.div>)}
    >
      {children}
    </motion.div>
  )
}

export function StaggerItem({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const reduce = useReducedMotion()
  if (reduce) {
    return (
      <div className={className} {...props}>
        {children}
      </div>
    )
  }
  return (
    <motion.div
      className={className}
      variants={staggerItem}
      {...(props as React.ComponentProps<typeof motion.div>)}
    >
      {children}
    </motion.div>
  )
}
