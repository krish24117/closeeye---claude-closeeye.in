'use client'

import Link from 'next/link'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Container } from '@/components/ui/container'
import { ImageFrame } from '@/components/ui/image-frame'
import { HERO_TRUST } from '@/lib/content'

const EASE = [0.22, 1, 0.36, 1] as const

export function Hero() {
  const reduce = useReducedMotion()
  const rise = (delay: number) =>
    reduce ? {} : { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.7, delay, ease: EASE } }

  return (
    <section id="home" className="relative overflow-hidden bg-ivory pt-32 sm:pt-36">
      <Container className="relative">
        <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
          <motion.span
            {...rise(0)}
            className="inline-flex items-center gap-2 rounded-full border border-line bg-card px-4 py-1.5 text-caption font-medium text-green shadow-sm"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success/60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
            </span>
            A trusted human presence
          </motion.span>

          <motion.h1 {...rise(0.08)} className="mt-7 text-h1">
            When you can&apos;t be there,
            <br />
            <span className="text-green">Close Eye can.</span>
          </motion.h1>

          <motion.p {...rise(0.16)} className="mt-6 max-w-xl text-lead text-muted">
            Someone you trust, physically there for your parents — for wellbeing
            visits, hospital days, and the moments that matter most.
          </motion.p>

          <motion.div {...rise(0.24)} className="mt-9 flex w-full flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link href="/book">
                Check on My Family <ArrowRight className="h-5 w-5" strokeWidth={1.5} />
              </Link>
            </Button>
            <Button asChild size="lg" variant="secondary" className="w-full sm:w-auto">
              <Link href="#how-it-works">See how it works</Link>
            </Button>
          </motion.div>

          <motion.ul {...rise(0.34)} className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-caption text-muted">
            {HERO_TRUST.map(({ label }, i) => (
              <li key={label} className="inline-flex items-center gap-2">
                {i > 0 && <span className="hidden h-1 w-1 rounded-full bg-line sm:inline-block" />}
                {label}
              </li>
            ))}
          </motion.ul>
        </div>

        {/* Emotional image band — human before technological */}
        <motion.div
          {...(reduce ? {} : { initial: { opacity: 0, y: 32 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.9, delay: 0.4, ease: EASE } })}
          className="relative mx-auto mt-16 max-w-5xl"
        >
          <ImageFrame
            src="/hero.jpg"
            alt="An elderly mother on a video call with her daughter while a Close Eye Guardian sits beside her, holding her hand, in a sunlit living room"
            ratio="wide"
            priority
            gradient
            className="shadow-lg"
            sizes="(max-width: 1200px) 100vw, 1000px"
          />
        </motion.div>
      </Container>

      <div className="h-16 sm:h-24" />
    </section>
  )
}
