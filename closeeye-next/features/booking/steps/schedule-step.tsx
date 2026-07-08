'use client'

import { useEffect, useState } from 'react'
import { Check } from 'lucide-react'
import { Field, Input } from '@/components/ui/field'
import { StepScaffold } from '../step-shell'
import { useBooking } from '../state'
import { scheduleSchema, TIME_SLOTS, serviceById } from '../schema'
import { cn } from '@/lib/utils'

export function ScheduleStep() {
  const { data, patch, next } = useBooking()
  const [date, setDate] = useState(data.date ?? '')
  const [timeSlot, setTimeSlot] = useState(data.timeSlot)
  const [minDate, setMinDate] = useState<string | undefined>()
  const [errors, setErrors] = useState<{ date?: string; timeSlot?: string }>({})

  // Compute "today" on the client only, to avoid hydration mismatch.
  useEffect(() => {
    setMinDate(new Date().toISOString().slice(0, 10))
  }, [])

  const service = serviceById(data.serviceId)
  const slots = TIME_SLOTS.filter((s) => !s.emergencyOnly || service?.allowsEmergency)

  function handleContinue() {
    const result = scheduleSchema.safeParse({ date, timeSlot })
    if (!result.success) {
      const f = result.error.flatten().fieldErrors
      setErrors({ date: f.date?.[0], timeSlot: f.timeSlot?.[0] })
      return
    }
    patch(result.data)
    next()
  }

  return (
    <StepScaffold
      eyebrow="Step 4 of 6"
      title="When should we visit?"
      subtitle="Pick a day and a window that suits your family. We'll confirm the exact time with you."
      onContinue={handleContinue}
    >
      <div className="flex flex-col gap-7">
        <Field label="Preferred date" htmlFor="date" error={errors.date} className="max-w-xs">
          <Input id="date" type="date" min={minDate} value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>

        <Field label="Preferred time" error={errors.timeSlot}>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {slots.map((s) => {
              const selected = timeSlot === s.id
              const emergency = s.id === 'emergency'
              return (
                <button
                  key={s.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setTimeSlot(s.id)}
                  className={cn(
                    'relative flex flex-col items-start gap-1 rounded-md border bg-card p-4 text-left transition-all duration-200 ease-premium',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green focus-visible:ring-offset-2 focus-visible:ring-offset-ivory',
                    selected ? 'border-green ring-1 ring-green' : 'border-line hover:border-ink/20',
                  )}
                >
                  {selected && (
                    <span className="absolute right-3 top-3 grid h-5 w-5 place-items-center rounded-full bg-green text-ivory">
                      <Check className="h-3 w-3" strokeWidth={3} />
                    </span>
                  )}
                  <span className={cn('text-body font-semibold', emergency ? 'text-warning' : 'text-ink')}>
                    {s.label}
                  </span>
                  <span className="text-caption text-muted">{s.note}</span>
                </button>
              )
            })}
          </div>
        </Field>
      </div>
    </StepScaffold>
  )
}
