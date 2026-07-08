'use client'

import { useState } from 'react'
import { X, UserPlus } from 'lucide-react'
import { Overlay } from '@/components/family/overlay'
import { Field, Input, Textarea } from '@/components/ui/field'
import { Chip } from '@/components/ui/choice'
import { Button } from '@/components/ui/button'
import { RELATIONSHIPS, type Member } from '@/lib/family-data'

function initialsOf(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .map((w) => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || '··'
  )
}

/** Add a new family member, or edit an existing one (pass `member`). */
export function AddMemberDialog({
  open,
  onClose,
  onSave,
  member,
}: {
  open: boolean
  onClose: () => void
  onSave: (m: Member) => void
  member?: Member
}) {
  const editing = Boolean(member)
  const [relationship, setRelationship] = useState<string | undefined>(member?.relationship)
  const [name, setName] = useState(member?.name ?? '')
  const [age, setAge] = useState(member?.age ? String(member.age) : '')
  const [city, setCity] = useState(member?.city ?? '')
  const [love, setLove] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  function reset() {
    setRelationship(member?.relationship)
    setName(member?.name ?? '')
    setAge(member?.age ? String(member.age) : '')
    setCity(member?.city ?? '')
    setLove('')
    setErrors({})
  }

  function close() {
    reset()
    onClose()
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const errs: Record<string, string> = {}
    if (!relationship) errs.relationship = 'Tell us who this is'
    if (name.trim().length < 2) errs.name = 'Please enter their name'
    if (city.trim().length < 2) errs.city = 'Which city are they in?'
    if (Object.keys(errs).length) {
      setErrors(errs)
      return
    }

    const base: Member = member ?? {
      id: `local-${name.trim().toLowerCase().replace(/\s+/g, '-')}`,
      name: '',
      relationship: 'Other',
      age: 0,
      city: '',
      initials: '··',
      statusLine: 'Just added',
      mood: 'Good',
      personality: [],
      medicalNotes: ['No medical notes recorded yet'],
      preferences: ['To be set up with your Presence Manager'],
      emergencyContacts: [],
      guardianName: 'To be assigned',
    }

    const next: Member = {
      ...base,
      relationship: relationship!,
      name: name.trim(),
      age: age.trim() ? Number(age) : 0,
      city: city.trim(),
      initials: initialsOf(name),
      personality:
        !editing && love.trim()
          ? [{ emoji: '💚', label: love.trim() }, ...base.personality]
          : base.personality,
    }

    onSave(next)
    close()
  }

  return (
    <Overlay open={open} onClose={close}>
      <div className="flex items-center justify-between border-b border-line px-6 py-4">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-accent-soft text-green">
            <UserPlus className="h-5 w-5" strokeWidth={1.5} />
          </span>
          <h2 className="text-h4">{editing ? 'Edit family member' : 'Add a family member'}</h2>
        </div>
        <button onClick={close} aria-label="Close" className="grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-accent-soft">
          <X className="h-5 w-5" strokeWidth={1.5} />
        </button>
      </div>

      <form onSubmit={submit} className="flex flex-col gap-5 px-6 py-6">
        <Field label="Their relationship to you" error={errors.relationship}>
          <div className="flex flex-wrap gap-2">
            {RELATIONSHIPS.map((r) => (
              <Chip key={r} selected={relationship === r} onClick={() => setRelationship(r)}>
                {r}
              </Chip>
            ))}
          </div>
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Their name" htmlFor="m-name" error={errors.name}>
            <Input id="m-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Lakshmi" autoComplete="off" />
          </Field>
          <Field label="Their age" htmlFor="m-age" optional>
            <Input id="m-age" value={age} onChange={(e) => setAge(e.target.value)} inputMode="numeric" placeholder="e.g. 72" />
          </Field>
        </div>

        <Field label="City" htmlFor="m-city" error={errors.city}>
          <Input id="m-city" value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Hyderabad" />
        </Field>

        {!editing && (
          <Field label="What do they love?" htmlFor="m-love" optional hint="A little warmth helps their Guardian connect from day one.">
            <Textarea id="m-love" value={love} onChange={(e) => setLove(e.target.value)} placeholder="e.g. Morning walks, filter coffee, cricket on the radio." className="min-h-[4.5rem]" />
          </Field>
        )}

        <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={close}>Cancel</Button>
          <Button type="submit">{editing ? 'Save changes' : 'Add family member'}</Button>
        </div>
        {!editing && (
          <p className="text-caption text-muted">
            Your Presence Manager will complete their care profile and reach out to set up the first visit.
          </p>
        )}
      </form>
    </Overlay>
  )
}
