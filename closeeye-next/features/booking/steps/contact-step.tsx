'use client'

import { useState } from 'react'
import { Field, Input } from '@/components/ui/field'
import { Chip } from '@/components/ui/choice'
import { StepScaffold } from '../step-shell'
import { useBooking } from '../state'
import { contactSchema, COMM_PREFS } from '../schema'

type Errors = Partial<Record<string, string>>

export function ContactStep() {
  const { data, patch, next } = useBooking()
  const [yourName, setYourName] = useState(data.yourName ?? '')
  const [phone, setPhone] = useState(data.phone ?? '')
  const [whatsapp, setWhatsapp] = useState(data.whatsapp ?? '')
  const [email, setEmail] = useState(data.email ?? '')
  const [commPref, setCommPref] = useState(data.commPref)
  const [errors, setErrors] = useState<Errors>({})

  function handleContinue() {
    const result = contactSchema.safeParse({ yourName, phone, whatsapp, email, commPref })
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
      eyebrow="Step 5 of 6"
      title="How can we reach you?"
      subtitle="Your Presence Manager will use this to keep you close — updates, photos, and anything you need."
      onContinue={handleContinue}
      continueLabel="Review booking"
    >
      <div className="flex flex-col gap-6">
        <Field label="Your name" htmlFor="yourName" error={errors.yourName}>
          <Input id="yourName" value={yourName} onChange={(e) => setYourName(e.target.value)} placeholder="Your full name" autoComplete="name" />
        </Field>

        <div className="grid gap-6 sm:grid-cols-2">
          <Field label="Phone" htmlFor="phone" error={errors.phone}>
            <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" placeholder="10-digit mobile" autoComplete="tel" />
          </Field>
          <Field label="WhatsApp" htmlFor="whatsapp" optional error={errors.whatsapp} hint="If different from your phone number.">
            <Input id="whatsapp" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} inputMode="tel" placeholder="10-digit WhatsApp number" />
          </Field>
        </div>

        <Field label="Email" htmlFor="email" optional error={errors.email}>
          <Input id="email" value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="you@email.com" autoComplete="email" />
        </Field>

        <Field label="Preferred way to stay in touch" error={errors.commPref}>
          <div className="flex flex-wrap gap-2.5">
            {COMM_PREFS.map((c) => (
              <Chip key={c} selected={commPref === c} onClick={() => setCommPref(c)}>
                {c}
              </Chip>
            ))}
          </div>
        </Field>
      </div>
    </StepScaffold>
  )
}
