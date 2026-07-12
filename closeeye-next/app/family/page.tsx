'use client'

import * as React from 'react'
import { Loader2 } from 'lucide-react'
import { useAuth } from '@/components/auth/auth-provider'
import { useFamilyData } from '@/components/family/family-data-provider'
import { deriveDashboard, fetchDashboardSignals } from '@/lib/db/dashboard'
import { useVisitSync } from '@/lib/use-visit-sync'
import { ErrorState } from '@/components/ui/states'
import {
  ActiveDashboard,
  FamilyAddedDashboard,
  NewUserDashboard,
  VisitBookedDashboard,
} from '@/components/family/dashboard-states'
import type { BookingRequest } from '@/lib/db/types'

/**
 * Home Dashboard — evolves automatically through four lifecycle states
 * (new → family added → visit booked → active). Exactly one renders per user;
 * state is derived in lib/db/dashboard.ts from data the provider already holds
 * plus two lightweight reads (visits + unread messages).
 */
export default function FamilyHome() {
  const { user } = useAuth()
  const { lovedOnes, subscription, loading, error, refresh } = useFamilyData()
  const [signals, setSignals] = React.useState<{ visits: BookingRequest[]; unreadMessages: number; reportedBookingIds: Set<string> } | null>(null)
  const [signalsError, setSignalsError] = React.useState(false)

  const reload = React.useCallback(() => {
    if (!user?.id) {
      setSignals({ visits: [], unreadMessages: 0, reportedBookingIds: new Set() })
      setSignalsError(false)
      return
    }
    setSignalsError(false)
    fetchDashboardSignals(user.id)
      .then((s) => { setSignals(s); setSignalsError(false) })
      .catch(() => { setSignals(null); setSignalsError(true) })
  }, [user?.id])

  React.useEffect(() => { reload() }, [reload])
  useVisitSync(user?.id, reload)

  // A failed load must NEVER masquerade as the new-user ("add your family") state —
  // a returning customer would read that as their loved ones being deleted.
  if (error || signalsError) {
    return (
      <div className="flex flex-col gap-8">
        <ErrorState
          title="We couldn’t load your family space"
          message="Something interrupted the connection — nothing was lost. Please check your connection and try again."
          onRetry={() => { void refresh(); reload() }}
        />
      </div>
    )
  }

  if (loading || signals === null) {
    return (
      <div className="flex flex-col gap-8">
        <div className="grid place-items-center rounded-lg border border-line/70 bg-card py-20 shadow-sm">
          <Loader2 className="h-6 w-6 animate-spin text-green" strokeWidth={2} />
        </div>
      </div>
    )
  }

  const data = deriveDashboard({ lovedOnes, subscription, visits: signals.visits, unreadMessages: signals.unreadMessages, reportedBookingIds: signals.reportedBookingIds })

  return (
    <div className="flex flex-col gap-8">
      {data.state === 'new' && <NewUserDashboard />}
      {data.state === 'family_added' && <FamilyAddedDashboard data={data} lovedOnes={lovedOnes} />}
      {data.state === 'visit_booked' && <VisitBookedDashboard data={data} lovedOnes={lovedOnes} />}
      {data.state === 'active' && <ActiveDashboard data={data} lovedOnes={lovedOnes} />}
    </div>
  )
}
