'use client'

import * as React from 'react'
import { AIStoryCard } from '@/components/family/ai-story-card'
import { getReport, reportKey, type SharedVisitReport } from '@/lib/visit-reports'

/** Shows the latest visit's AI story on the overview — only once a Guardian has
 *  completed a visit (else the existing Latest Update carries the page). */
export function OverviewStory({ memberName, fallback }: { memberName: string; fallback?: React.ReactNode }) {
  const [report, setReport] = React.useState<SharedVisitReport | null>(null)
  React.useEffect(() => {
    setReport(getReport(reportKey(memberName)))
  }, [memberName])

  if (!report) return <>{fallback ?? null}</>
  return <AIStoryCard report={report} />
}
