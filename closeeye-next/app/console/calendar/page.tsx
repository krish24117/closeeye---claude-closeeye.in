'use client'

import * as React from 'react'
import { CalendarCard, CalendarLegend, type CalendarKind } from '@/components/console/calendar-card'
import { cn } from '@/lib/utils'

type Scope = 'day' | 'week' | 'month'
interface Entry { id: string; time: string; title: string; sub: string; kind: CalendarKind; day: string; scope: Scope[] }

const ENTRIES: Entry[] = [
  { id: 'c1', time: '9:30 AM', title: 'Ramesh Rao · Wellbeing visit', sub: 'Guardian Arjun · Jubilee Hills', kind: 'wellbeing', day: 'Today', scope: ['day', 'week', 'month'] },
  { id: 'c2', time: '10:00 AM', title: 'Radha Menon · Video call', sub: 'Guardian Ravi · Kukatpally', kind: 'video', day: 'Today', scope: ['day', 'week', 'month'] },
  { id: 'c3', time: '2:00 PM', title: 'Fatima Sheikh · Cardiology follow-up', sub: 'Companion Vikram · Apollo', kind: 'hospital', day: 'Today', scope: ['day', 'week', 'month'] },
  { id: 'c4', time: '3:00 PM', title: 'Radha Menon · Companion visit', sub: 'Companion Anita · cancelled by family', kind: 'cancelled', day: 'Today', scope: ['day', 'week', 'month'] },
  { id: 'c5', time: '4:30 PM', title: 'Sunita Mehta · Wellbeing visit', sub: 'Guardian Meena · BP reading requested', kind: 'wellbeing', day: 'Today', scope: ['day', 'week', 'month'] },
  { id: 'c6', time: '10:00 AM', title: 'Lakshmi Rao · Wellbeing review', sub: 'Guardian Arjun · moved from today', kind: 'rescheduled', day: 'Tomorrow', scope: ['week', 'month'] },
  { id: 'c7', time: 'All day', title: 'Priyanka Das · Leave', sub: 'Guardian on leave', kind: 'leave', day: 'Tomorrow', scope: ['week', 'month'] },
  { id: 'c8', time: '—', title: 'Gopal Reddy · Birthday 🎂', sub: 'Reddy family · a call would mean a lot', kind: 'birthday', day: 'Fri, 10 Jul', scope: ['week', 'month'] },
  { id: 'c9', time: '11:00 AM', title: 'Shankar Nair · Companion visit', sub: 'Companion Anita · Gachibowli', kind: 'companion', day: 'Sat, 11 Jul', scope: ['month'] },
]

const SCOPES: { key: Scope; label: string }[] = [
  { key: 'day', label: 'Day' },
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
]

export default function CalendarPage() {
  const [scope, setScope] = React.useState<Scope>('day')
  const entries = ENTRIES.filter((e) => e.scope.includes(scope))
  const days = Array.from(new Set(entries.map((e) => e.day)))

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-h2">Calendar</h1>
          <p className="mt-1.5 text-body leading-relaxed text-muted">Visits, appointments, birthdays, guardian leave and family requests — colour-coded by type.</p>
        </div>
        <div className="inline-flex rounded-full border border-line bg-card p-1">
          {SCOPES.map((s) => (
            <button key={s.key} type="button" onClick={() => setScope(s.key)} className={cn('rounded-full px-4 py-1.5 text-caption font-semibold transition-colors', scope === s.key ? 'bg-green text-ivory' : 'text-muted hover:text-ink')}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <CalendarLegend />

      {days.map((day) => (
        <section key={day}>
          <p className="mb-3 text-caption font-semibold uppercase tracking-widest text-muted">{day}</p>
          <div className="flex flex-col gap-2.5">
            {entries.filter((e) => e.day === day).map((e) => <CalendarCard key={e.id} entry={e} />)}
          </div>
        </section>
      ))}
    </div>
  )
}
