import { notFound } from 'next/navigation'
import { ConsoleFamilyProfile } from '@/components/console/family-profile'
import { FAMILIES, familyById } from '@/lib/console-data'

export function generateStaticParams() {
  return FAMILIES.map((f) => ({ id: f.id }))
}

export default async function ConsoleFamilyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const family = familyById(id)
  if (!family) notFound()
  return <ConsoleFamilyProfile family={family} />
}
