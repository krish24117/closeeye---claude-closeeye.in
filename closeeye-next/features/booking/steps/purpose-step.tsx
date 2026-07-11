'use client'

import { useState } from 'react'
import { Field, Textarea } from '@/components/ui/field'
import { Chip } from '@/components/ui/choice'
import { StepScaffold } from '../step-shell'
import { useBooking } from '../state'
import { purposeSchema, PURPOSES } from '../schema'

export function PurposeStep() {
  const { data, patch, next } = useBooking()
  // A Custom Request needs the family to say WHAT they need — otherwise the
  // Guardian/PM gets a visit with no task. The generic purpose chips don't apply
  // once "Custom Request" is chosen, so we swap in a required description.
  const isCustom = data.serviceId === 'custom-request'
  const [purpose, setPurpose] = useState(data.purpose)
  const [details, setDetails] = useState(data.details ?? '')
  const [error, setError] = useState<string>()

  function handleContinue() {
    if (isCustom) {
      if (details.trim().length < 4) {
        setError('Please tell us what you need for this visit.')
        return
      }
      patch({ purpose: 'custom', details: details.trim() })
      next()
      return
    }
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
      title={isCustom ? 'What do you need?' : 'Tell us more'}
      subtitle={
        isCustom
          ? 'Tell us what your family needs for this visit, so your Guardian arrives ready to help.'
          : "What's the visit mainly for? This helps us match the right Guardian."
      }
      onContinue={handleContinue}
    >
      <div className="flex flex-col gap-6">
        {!isCustom && (
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
        )}

        <Field
          label={isCustom ? 'Describe the request' : 'Anything we should know?'}
          htmlFor="details"
          optional={!isCustom}
          error={isCustom ? error : undefined}
          hint={
            isCustom
              ? 'The more detail you give, the better we can help.'
              : 'Share as much or as little as you like. Every detail helps us show up prepared.'
          }
        >
          <Textarea
            id="details"
            value={details}
            onChange={(e) => {
              setDetails(e.target.value)
              if (isCustom && error) setError(undefined)
            }}
            placeholder={
              isCustom
                ? "e.g. Pick up this month's medicines from Apollo Pharmacy and drop them home; please check the BP monitor is working."
                : 'e.g. Recovering after a knee procedure — please help with a short walk and check the medicine box.'
            }
          />
        </Field>
      </div>
    </StepScaffold>
  )
}
