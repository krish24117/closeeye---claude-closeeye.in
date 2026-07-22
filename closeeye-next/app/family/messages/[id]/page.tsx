import { redirect } from 'next/navigation'

/** Per-member thread moved under Close Eye Connect — preserve the deep link. */
export default async function MessageThreadMovedToConnect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  redirect(`/family/connect/${id}`)
}
