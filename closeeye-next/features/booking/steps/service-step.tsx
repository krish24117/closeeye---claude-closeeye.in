'use client'

import { useState } from 'react'
import { OptionCard } from '@/components/ui/choice'
import { StepScaffold } from '../step-shell'
import { useBooking } from '../state'
import { BOOKING_SERVICES, type BookingService } from '../schema'

export function ServiceStep() {
  const { data, patch, next } = useBooking()
  const [selected, setSelected] = useState<BookingService['id'] | undefined>(data.serviceId)
  const [error, setError] = useState<string>()

  function handleContinue() {
    if (!selected) {
      setError('Choose a visit to continue')
      return
    }
    patch({ serviceId: selected })
    next()
  }

  return (
    <StepScaffold
      eyebrow="Step 1 of 6"
      title="What kind of visit would help?"
      subtitle="Choose the support your family needs. You can add details in a moment — nothing is booked yet."
      onContinue={handleContinue}
      showBack={false}
    >
      <div className="grid gap-4 sm:grid-cols-3">
        {BOOKING_SERVICES.map((s) => (
          <OptionCard
            key={s.id}
            icon={s.icon}
            title={s.name}
            description={s.blurb}
            selected={selected === s.id}
            onClick={() => {
              setSelected(s.id)
              setError(undefined)
            }}
            meta={
              <span className="flex flex-col gap-0.5">
                <span>{s.duration}</span>
                <span className="font-semibold text-ink">Starting at {s.priceFrom}</span>
              </span>
            }
          />
        ))}
      </div>
      {error && <p className="mt-4 text-caption text-error">{error}</p>}
    </StepScaffold>
  )
}
