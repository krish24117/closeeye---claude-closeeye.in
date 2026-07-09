'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, Loader2, UserRound } from 'lucide-react'
import { MessagesThread } from '@/components/family/messages-thread'
import { EmptyState } from '@/components/ui/states'
import { Button } from '@/components/ui/button'
import { useFamilyData } from '@/components/family/family-data-provider'

export default function MemberConversationPage() {
  const params = useParams<{ id: string }>()
  const { lovedOnes, loading } = useFamilyData()
  const member = lovedOnes.find((l) => l.id === params.id)

  if (loading && !member) {
    return (
      <div className="grid place-items-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-green" strokeWidth={2} />
      </div>
    )
  }

  if (!member) {
    return (
      <div className="flex flex-col gap-6">
        <Link href="/family/connect" className="inline-flex items-center gap-1.5 text-caption font-semibold text-muted hover:text-ink">
          <ArrowLeft className="h-4 w-4" strokeWidth={1.75} /> Connect
        </Link>
        <EmptyState
          icon={UserRound}
          title="Conversation not found"
          hint="This family member may have been removed."
          action={
            <Button asChild>
              <Link href="/family/connect">Back to Connect</Link>
            </Button>
          }
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <Link href="/family/connect" className="inline-flex items-center gap-1.5 text-caption font-semibold text-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" strokeWidth={1.75} /> All conversations
      </Link>
      <MessagesThread lovedOne={member} />
    </div>
  )
}
