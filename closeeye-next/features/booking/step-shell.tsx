'use client'

import { ArrowLeft, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useBooking } from './state'

/** Consistent layout for every form step: header + body + Back/Continue. */
export function StepScaffold({
  eyebrow,
  title,
  subtitle,
  children,
  onContinue,
  continueLabel = 'Continue',
  showBack = true,
}: {
  eyebrow: string
  title: string
  subtitle?: string
  children: React.ReactNode
  onContinue: () => void
  continueLabel?: string
  showBack?: boolean
}) {
  const { back, step } = useBooking()
  return (
    <div className="flex flex-col">
      <span className="text-caption font-semibold uppercase tracking-widest text-green">{eyebrow}</span>
      <h1 className="mt-3 text-h3">{title}</h1>
      {subtitle && <p className="mt-3 max-w-xl text-body text-muted">{subtitle}</p>}

      <div className="mt-8">{children}</div>

      <div className="mt-10 flex items-center justify-between gap-4">
        {showBack && step > 0 ? (
          <Button variant="ghost" onClick={back}>
            <ArrowLeft className="h-5 w-5" strokeWidth={1.5} /> Back
          </Button>
        ) : (
          <span />
        )}
        <Button onClick={onContinue}>
          {continueLabel} <ArrowRight className="h-5 w-5" strokeWidth={1.5} />
        </Button>
      </div>
    </div>
  )
}
