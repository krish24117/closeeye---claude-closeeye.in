'use client'

import * as React from 'react'
import { Loader2 } from 'lucide-react'
import { useAuth } from '@/components/auth/auth-provider'
import { useFamilyData } from '@/components/family/family-data-provider'
import { deriveDashboard, fetchDashboardSignals } from '@/lib/db/dashboard'
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
  const { lovedOnes, subscription, loading } = useFamilyData()
  const [signals, setSignals] = React.useState<{ visits: BookingRequest[]; unreadMessages: number } | null>(null)

  React.useEffect(() => {
    if (!user?.id) {
      setSignals({ visits: [], unreadMessages: 0 })
      return
    }
    fetchDashboardSignals(user.id)
      .then(setSignals)
      .catch(() => setSignals({ visits: [], unreadMessages: 0 }))
  }, [user?.id])

  if (loading || signals === null) {
    return (
      <div className="flex flex-col gap-8">
        <div className="grid place-items-center rounded-lg border border-line bg-card py-20 shadow-sm">
          <Loader2 className="h-6 w-6 animate-spin text-green" strokeWidth={2} />
        </div>
      </div>
    )
  }

  const data = deriveDashboard({ lovedOnes, subscription, visits: signals.visits, unreadMessages: signals.unreadMessages })

  return (
    <div className="flex flex-col gap-8">
      {data.state === 'new' && <NewUserDashboard />}
      {data.state === 'family_added' && <FamilyAddedDashboard data={data} lovedOnes={lovedOnes} />}
      {data.state === 'visit_booked' && <VisitBookedDashboard data={data} lovedOnes={lovedOnes} />}
      {data.state === 'active' && <ActiveDashboard data={data} lovedOnes={lovedOnes} subscription={subscription} />}
    </div>
  )
}
