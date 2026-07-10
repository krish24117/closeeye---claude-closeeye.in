'use client'

import { Loader2 } from 'lucide-react'
import { GuardianMessageThread } from '@/components/guardian/guardian-message-thread'
import { useFamilyData } from '@/components/family/family-data-provider'

/**
 * The guardian's single conversation with their Presence Manager / care team.
 * companions.id == auth.uid() == profile.id, so profile.id IS the thread key.
 * The (shell) layout already gates this route to signed-in guardians.
 */
export default function GuardianMessagesPage() {
  const { profile, loading } = useFamilyData()

  if (loading || !profile) {
    return <div className="grid place-items-center py-24"><Loader2 className="h-6 w-6 animate-spin text-green" strokeWidth={2} /></div>
  }

  return <GuardianMessageThread companionId={profile.id} />
}
