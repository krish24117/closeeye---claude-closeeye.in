'use client'

import * as React from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, Loader2, Lock, MessageCircle } from 'lucide-react'
import { AdminMessageThread } from '@/components/console/admin-message-thread'
import { EmptyState } from '@/components/ui/states'
import { Button } from '@/components/ui/button'
import { useFamilyData } from '@/components/family/family-data-provider'
import { fetchAdminThreadMeta, type AdminThreadRef } from '@/lib/db/messages'

export default function ConsoleThreadPage() {
  const params = useParams<{ id: string }>()
  const { profile, loading } = useFamilyData()
  const isAdmin = profile?.role === 'admin'
  const [meta, setMeta] = React.useState<AdminThreadRef | null | undefined>(undefined) // undefined = still loading

  React.useEffect(() => {
    if (!isAdmin || !params.id) return
    fetchAdminThreadMeta(params.id)
      .then(setMeta)
      .catch(() => setMeta(null))
  }, [isAdmin, params.id])

  if (loading) {
    return (
      <div className="grid place-items-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-green" strokeWidth={2} />
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-h2">Messages</h1>
        </div>
        <EmptyState icon={Lock} title="Restricted" hint="This inbox is only available to Close Eye team members." />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <Link href="/console/messages" className="inline-flex items-center gap-1.5 text-caption font-semibold text-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" strokeWidth={1.75} /> All messages
      </Link>
      {meta === undefined ? (
        <div className="grid place-items-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-green" strokeWidth={2} />
        </div>
      ) : meta === null ? (
        <EmptyState
          icon={MessageCircle}
          title="Conversation not found"
          hint="This family member may have been removed."
          action={
            <Button asChild>
              <Link href="/console/messages">Back to messages</Link>
            </Button>
          }
        />
      ) : (
        <AdminMessageThread thread={meta} />
      )}
    </div>
  )
}
