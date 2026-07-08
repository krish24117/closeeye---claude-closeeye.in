import { notFound } from 'next/navigation'
import { TODAY_VISITS, visitById } from '@/lib/guardian-data'
import { VisitJourney } from '@/features/guardian/visit-journey'

export function generateStaticParams() {
  return TODAY_VISITS.map((v) => ({ id: v.id }))
}

/** The Guardian's in-visit journey: arrive → check-in → care → complete. */
export default async function VisitJourneyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const v = visitById(id)
  if (!v) notFound()
  return <VisitJourney visit={v} />
}
