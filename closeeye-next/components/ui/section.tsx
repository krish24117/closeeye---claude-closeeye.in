import * as React from 'react'
import { cn } from '@/lib/utils'
import { Container } from './container'
import { Reveal } from './reveal'

type Tone = 'ivory' | 'card' | 'ink'

// Only three section backgrounds exist — they alternate to create rhythm.
const toneClass: Record<Tone, string> = {
  ivory: 'bg-ivory',
  card: 'bg-card',
  ink: 'bg-ink text-white',
}

interface SectionProps extends React.HTMLAttributes<HTMLElement> {
  tone?: Tone
  bleed?: boolean
  containerClassName?: string
}

export function Section({
  tone = 'ivory',
  bleed = false,
  className,
  containerClassName,
  children,
  ...props
}: SectionProps) {
  return (
    <section className={cn(toneClass[tone], !bleed && 'section-pad', className)} {...props}>
      <Container className={containerClassName}>{children}</Container>
    </section>
  )
}

interface HeadingProps {
  eyebrow?: string
  title: React.ReactNode
  intro?: React.ReactNode
  align?: 'left' | 'center'
  tone?: 'dark' | 'light'
  /** Render the title in the display serif (Newsreader) — for editorial surfaces. Opt-in. */
  serif?: boolean
  className?: string
}

/** Eyebrow → title → intro. The one heading block used by every section. */
export function SectionHeading({
  eyebrow,
  title,
  intro,
  align = 'center',
  tone = 'dark',
  serif = false,
  className,
}: HeadingProps) {
  return (
    <Reveal
      className={cn(
        'flex max-w-measure flex-col gap-5',
        align === 'center' ? 'mx-auto items-center text-center' : 'items-start',
        className,
      )}
    >
      {eyebrow && (
        <span className={cn('eyebrow', align === 'center' && 'is-centered', tone === 'light' && 'is-light')}>
          {eyebrow}
        </span>
      )}
      <h2 className={cn('text-h2', serif && 'font-display', tone === 'light' && 'text-white')}>{title}</h2>
      {intro && (
        <p className={cn('text-lead', tone === 'light' ? 'text-white/70' : 'text-muted')}>{intro}</p>
      )}
    </Reveal>
  )
}
