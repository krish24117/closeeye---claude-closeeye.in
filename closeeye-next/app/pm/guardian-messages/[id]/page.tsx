'use client'

import * as React from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, Loader2, Lock, MessageCircle } from 'lucide-react'
import { AdminGuardianThread } from '@/components/console/admin-guardian-thread'
import { EmptyState } from '@/components/ui/states'
import { Button } from '@/components/ui/button'
import { useFamilyData } from '@/components/family/family-data-provider'
import { fetchGuardianThreadMeta, type GuardianThreadRef } from '@/lib/db/guardian-messages'
import { canUseConsole } from '@/lib/roles'

export default function ConsoleGuardianThreadPage() {
  const params = useParams<{ id: string }>()
  const { profile, loading } = useFamilyData()
  const isStaff = canUseConsole(profile)
  const [meta, setMeta] = React.useState<GuardianThreadRef | null | undefined>(undefined) // undefined = still loading

  React.useEffect(() => {
    if (!isStaff || !params.id) return
    fetchGuardianThreadMeta(params.id)
      .then(setMeta)
      .catch(() => setMeta(null))
  }, [isStaff, params.id])

  if (loading) {
    return <div className="grid place-items-center py-24"><Loader2 className="h-6 w-6 animate-spin text-green" strokeWidth={2} /></div>
  }

  if (!isStaff) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-h2">Guardian messages</h1>
        <EmptyState icon={Lock} title="Restricted" hint="This inbox is only available to Close Eye team members." />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <Link href="/pm/guardian-messages" className="inline-flex items-center gap-1.5 text-caption font-semibold text-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" strokeWidth={1.75} /> All Guardian messages
      </Link>
      {meta === undefined ? (
        <div className="grid place-items-center py-24"><Loader2 className="h-6 w-6 animate-spin text-green" strokeWidth={2} /></div>
      ) : meta === null ? (
        <EmptyState
          icon={MessageCircle}
          title="Conversation not found"
          hint="This Guardian may have been removed."
          action={<Button asChild><Link href="/pm/guardian-messages">Back to messages</Link></Button>}
        />
      ) : (
        <AdminGuardianThread thread={meta} />
      )}
    </div>
  )
}
