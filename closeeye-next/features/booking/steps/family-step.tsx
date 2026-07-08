'use client'

import { useState } from 'react'
import { Field, Input, Textarea } from '@/components/ui/field'
import { Chip } from '@/components/ui/choice'
import { StepScaffold } from '../step-shell'
import { useBooking } from '../state'
import { lovedOneSchema, RELATIONSHIPS } from '../schema'

type Errors = Partial<Record<string, string>>

export function FamilyStep() {
  const { data, patch, next } = useBooking()
  const [relationship, setRelationship] = useState(data.relationship)
  const [name, setName] = useState(data.name ?? '')
  const [age, setAge] = useState(data.age ?? '')
  const [city, setCity] = useState(data.city ?? '')
  const [address, setAddress] = useState(data.address ?? '')
  const [notes, setNotes] = useState(data.notes ?? '')
  const [errors, setErrors] = useState<Errors>({})

  function handleContinue() {
    const result = lovedOneSchema.safeParse({ relationship, name, age, city, address, notes })
    if (!result.success) {
      const f = result.error.flatten().fieldErrors
      setErrors(Object.fromEntries(Object.entries(f).map(([k, v]) => [k, v?.[0]])))
      return
    }
    patch(result.data)
    next()
  }

  return (
    <StepScaffold
      eyebrow="Step 2 of 6"
      title="Who needs our support?"
      subtitle="Tell us about the person you'd like us to visit. These details help your Guardian care for them well."
      onContinue={handleContinue}
    >
      <div className="flex flex-col gap-6">
        <Field label="Their relationship to you" error={errors.relationship}>
          <div className="flex flex-wrap gap-2.5">
            {RELATIONSHIPS.map((r) => (
              <Chip key={r} selected={relationship === r} onClick={() => setRelationship(r)}>
                {r}
              </Chip>
            ))}
          </div>
        </Field>

        <div className="grid gap-6 sm:grid-cols-2">
          <Field label="Their name" htmlFor="name" error={errors.name}>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Lakshmi" autoComplete="off" />
          </Field>
          <Field label="Their age" htmlFor="age" optional error={errors.age}>
            <Input id="age" value={age} onChange={(e) => setAge(e.target.value)} inputMode="numeric" placeholder="e.g. 72" />
          </Field>
        </div>

        <Field label="City" htmlFor="city" error={errors.city}>
          <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Hyderabad" />
        </Field>

        <Field label="Address" htmlFor="address" error={errors.address} hint="A complete address helps the Guardian arrive without calling around.">
          <Textarea id="address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="House / flat, street, area, landmark, pincode" />
        </Field>

        <Field label="Special notes" htmlFor="notes" optional hint="Anything that helps us care for them — mobility, language, routines, preferences.">
          <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Prefers Telugu, uses a walking stick, likes a morning visit." />
        </Field>
      </div>
    </StepScaffold>
  )
}
