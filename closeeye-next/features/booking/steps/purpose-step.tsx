'use client'

import { useState } from 'react'
import { Field, Textarea } from '@/components/ui/field'
import { Chip } from '@/components/ui/choice'
import { StepScaffold } from '../step-shell'
import { useBooking } from '../state'
import { purposeSchema, PURPOSES } from '../schema'

export function PurposeStep() {
  const { data, patch, next } = useBooking()
  const [purpose, setPurpose] = useState(data.purpose)
  const [details, setDetails] = useState(data.details ?? '')
  const [error, setError] = useState<string>()

  function handleContinue() {
    const result = purposeSchema.safeParse({ purpose, details })
    if (!result.success) {
      setError(result.error.flatten().fieldErrors.purpose?.[0] ?? 'Pick the reason for the visit')
      return
    }
    patch(result.data)
    next()
  }

  return (
    <StepScaffold
      eyebrow="Step 3 of 6"
      title="Tell us more"
      subtitle="What's the visit mainly for? This helps us match the right Guardian."
      onContinue={handleContinue}
    >
      <div className="flex flex-col gap-6">
        <Field label="Purpose of the visit" error={error}>
          <div className="flex flex-wrap gap-2.5">
            {PURPOSES.map((p) => (
              <Chip
                key={p.id}
                selected={purpose === p.id}
                onClick={() => {
                  setPurpose(p.id)
                  setError(undefined)
                }}
              >
                {p.label}
              </Chip>
            ))}
          </div>
        </Field>

        <Field
          label="Anything we should know?"
          htmlFor="details"
          optional
          hint="Share as much or as little as you like. Every detail helps us show up prepared."
        >
          <Textarea
            id="details"
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="e.g. Recovering after a knee procedure — please help with a short walk and check the medicine box."
          />
        </Field>
      </div>
    </StepScaffold>
  )
}
