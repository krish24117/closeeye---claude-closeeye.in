'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { ChevronLeft } from 'lucide-react'
import { Avatar } from '@/components/family/avatar'
import type { GuardianVisit } from '@/lib/guardian-data'
import { VisitProvider, useVisit } from './visit-state'
import { VisitTimer } from './visit-timer'
import { ArriveStep } from './steps/arrive'
import { CheckinStep } from './steps/checkin'
import { PrepStep } from './steps/prep'
import { StartStep } from './steps/start'
import { ChecklistStep } from './steps/checklist'
import { ObservationsStep } from './steps/observations'
import { VitalsStep } from './steps/vitals'
import { CompleteStep } from './steps/complete'
import { PostStep } from './steps/post'

/** Entry point — wraps the journey in its own offline-persisted state. */
export function VisitJourney({ visit }: { visit: GuardianVisit }) {
  return (
    <VisitProvider visitId={visit.id}>
      <Journey visit={visit} />
    </VisitProvider>
  )
}

function Journey({ visit }: { visit: GuardianVisit }) {
  const { stepKey, step, startedAt, confirmed, dispatch } = useVisit()

  // A slim context bar during the working part of the visit — not on the calm
  // full-screen moments (arrive / check-in) or the confirmation / post screens.
  const showBar = ['prep', 'start', 'checklist', 'observations', 'vitals'].includes(stepKey) || (stepKey === 'complete' && !confirmed)
  const canGoBack = showBar && stepKey !== 'prep'

  return (
    <div className="flex flex-col gap-4">
      {showBar && (
        <div className="-mx-5 -mt-5 mb-1 flex items-center gap-3 border-b border-line bg-ivory/80 px-5 py-2.5 backdrop-blur">
          <button
            type="button"
            onClick={() => dispatch({ type: 'back' })}
            disabled={!canGoBack}
            aria-label="Back a step"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-accent-soft disabled:opacity-0"
          >
            <ChevronLeft className="h-5 w-5" strokeWidth={1.75} />
          </button>
          <Avatar initials={visit.memberInitials} size="sm" />
          <span className="min-w-0 flex-1 truncate text-body-sm font-semibold text-ink">{visit.memberName}</span>
          {startedAt && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1 text-caption font-semibold text-green">
              <span className="h-1.5 w-1.5 rounded-full bg-green" />
              <VisitTimer startedAt={startedAt} />
            </span>
          )}
        </div>
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        >
          {stepKey === 'arrive' && <ArriveStep visit={visit} />}
          {stepKey === 'checkin' && <CheckinStep visit={visit} />}
          {stepKey === 'prep' && <PrepStep visit={visit} />}
          {stepKey === 'start' && <StartStep visit={visit} />}
          {stepKey === 'checklist' && <ChecklistStep visit={visit} />}
          {stepKey === 'observations' && <ObservationsStep visit={visit} />}
          {stepKey === 'vitals' && <VitalsStep visit={visit} />}
          {stepKey === 'complete' && <CompleteStep visit={visit} />}
          {stepKey === 'post' && <PostStep visit={visit} />}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
