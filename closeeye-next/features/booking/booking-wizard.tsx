'use client'

import { useEffect } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Lock } from 'lucide-react'
import { Container } from '@/components/ui/container'
import { useBooking, SUCCESS_STEP } from './state'
import { Stepper } from './stepper'
import { ServiceStep } from './steps/service-step'
import { FamilyStep } from './steps/family-step'
import { PurposeStep } from './steps/purpose-step'
import { ScheduleStep } from './steps/schedule-step'
import { ContactStep } from './steps/contact-step'
import { ReviewStep } from './steps/review-step'
import { SuccessStep } from './steps/success-step'

const STEP_COMPONENTS = [
  ServiceStep,
  FamilyStep,
  PurposeStep,
  ScheduleStep,
  ContactStep,
  ReviewStep,
  SuccessStep,
]

export function BookingWizard() {
  const { step } = useBooking()
  const reduce = useReducedMotion()
  const Current = STEP_COMPONENTS[step] ?? ServiceStep
  const isSuccess = step >= SUCCESS_STEP

  // Bring the top of the form into view on each step change.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' })
  }, [step, reduce])

  return (
    <section className="min-h-dvh bg-ivory pb-24 pt-28 sm:pt-32">
      <Container className="max-w-3xl">
        {!isSuccess && (
          <div className="mb-8">
            <Stepper step={step} />
          </div>
        )}

        <div className="rounded-lg border border-line bg-card p-6 shadow-sm sm:p-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={reduce ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? undefined : { opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            >
              <Current />
            </motion.div>
          </AnimatePresence>
        </div>

        {!isSuccess && (
          <p className="mt-6 flex items-center justify-center gap-2 text-caption text-muted">
            <Lock className="h-3.5 w-3.5" strokeWidth={1.5} />
            Your progress is saved. Secure &amp; private — a real person will follow up.
          </p>
        )}
      </Container>
    </section>
  )
}
