'use client'

import { Smile, UserCheck, BadgeCheck, Target, BellOff, PhoneCall, ArrowRight } from 'lucide-react'
import { ChecklistItem } from '@/components/guardian/checklist-item'
import { Progress } from '@/components/guardian/progress'
import { Button } from '@/components/ui/button'
import type { GuardianVisit } from '@/lib/guardian-data'
import { useVisit } from '../visit-state'

const PREP = [
  { id: 'smile', label: 'A warm smile', hint: 'They may have waited all day for this.', icon: Smile },
  { id: 'introduce', label: 'Introduce yourself gently', hint: 'Name, and that Close Eye sent you.', icon: UserCheck },
  { id: 'confirm', label: 'Confirm who you’re visiting', hint: 'Make sure it’s the right family member.', icon: BadgeCheck },
  { id: 'objective', label: 'Review today’s objective', hint: 'What the family hoped for today.', icon: Target },
  { id: 'silent', label: 'Phone on silent', hint: 'Be fully present with them.', icon: BellOff },
  { id: 'contacts', label: 'Emergency contacts within reach', hint: 'Just in case — you’re prepared.', icon: PhoneCall },
]

/** Screen 4 — a mindful pause before entering. A ritual, not a form. */
export function PrepStep({ visit }: { visit: GuardianVisit }) {
  const { prep, dispatch } = useVisit()
  const allReady = PREP.every((p) => prep.includes(p.id))

  return (
    <div className="flex flex-col gap-5 py-2">
      <div className="text-center">
        <p className="text-caption font-semibold uppercase tracking-widest text-green">Before you enter</p>
        <h1 className="mt-1.5 text-h2 text-ink">Take a moment</h1>
        <p className="mt-2 text-body leading-relaxed text-muted">
          You’re about to spend time with {visit.memberName.split(' ')[0]}. A calm, present start makes all the difference.
        </p>
      </div>

      <Progress value={prep.length} total={PREP.length} label="Ready to enter" />

      <div className="flex flex-col gap-2.5">
        {PREP.map((p) => (
          <ChecklistItem
            key={p.id}
            label={p.label}
            hint={p.hint}
            icon={p.icon}
            checked={prep.includes(p.id)}
            onToggle={() => dispatch({ type: 'togglePrep', id: p.id })}
          />
        ))}
      </div>

      <Button
        size="lg"
        className="w-full"
        disabled={!allReady}
        onClick={() => {
          dispatch({ type: 'start', at: Date.now() })
          dispatch({ type: 'next' })
        }}
      >
        {allReady ? 'Start visit' : 'Check each to begin'} <ArrowRight className="h-5 w-5" strokeWidth={2} />
      </Button>
    </div>
  )
}
