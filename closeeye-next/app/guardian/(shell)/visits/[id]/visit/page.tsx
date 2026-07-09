import { redirect } from 'next/navigation'

/**
 * The in-visit journey now lives on the real visit brief (../[id]), which drives
 * check-in → report → complete against live data. Redirect any old link here.
 */
export default async function VisitJourneyRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  redirect(`/guardian/visits/${id}`)
}
