'use client'

import * as React from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { CalendarClock, CheckCircle2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/states'
import { useAuth } from '@/components/auth/auth-provider'
import { fetchGuardianProfile, fetchGuardianVisitFull, type GuardianVisitFull } from '@/lib/db/guardian'
import { VisitJourney } from '@/features/guardian/visit-journey'

/** The Guardian's in-visit journey: arrive → check-in → care → complete, on real data. */
export default function VisitJourneyPage() {
  const params = useParams<{ id: string }>()
  const { user } = useAuth()
  const [data, setData] = React.useState<GuardianVisitFull | null | undefined>(undefined)
  const [guardianName, setGuardianName] = React.useState('Your Guardian')

  React.useEffect(() => {
    if (!user?.id || !params.id) {
      setData(null)
      return
    }
    fetchGuardianVisitFull(user.id, params.id).then(setData).catch(() => setData(null))
    fetchGuardianProfile(user.id).then((p) => setGuardianName(p.fullName)).catch(() => {})
  }, [user?.id, params.id])

  if (data === undefined) {
    return <div className="grid place-items-center py-24"><Loader2 className="h-6 w-6 animate-spin text-green" strokeWidth={2} /></div>
  }

  if (!data || !user?.id) {
    return (
      <div className="flex flex-col gap-6">
        <EmptyState
          icon={CalendarClock}
          title="Visit not found"
          hint="This visit may have been reassigned or isn't assigned to you."
          action={<Button asChild><Link href="/guardian">Back to today</Link></Button>}
        />
      </div>
    )
  }

  // Once a visit is completed, the report is written and sent — never re-run the
  // journey (it would write a second report and re-notify the family).
  if (data.visit.status === 'completed') {
    return (
      <div className="flex flex-col gap-6">
        <EmptyState
          icon={CheckCircle2}
          title="Visit already completed"
          hint="This visit is finished and the family has their report. Thank you for your care."
          action={<Button asChild><Link href="/guardian">Back to today</Link></Button>}
        />
      </div>
    )
  }

  return <VisitJourney visit={data.visit} companionId={user.id} guardianName={guardianName} elderProfileId={data.elderProfileId} />
}
