import { redirect } from 'next/navigation'

/**
 * Retired 2026-07-21 — the "Complete profile" form (`/space/people/[id]/add`) is now the single
 * profile-edit door (basics · core health · around, with completeness + the deep care brief linked
 * from it). This route stays only as a permanent redirect so old links / bookmarks keep working.
 */
export default async function EditPersonRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  redirect(`/space/people/${id}/add`)
}
