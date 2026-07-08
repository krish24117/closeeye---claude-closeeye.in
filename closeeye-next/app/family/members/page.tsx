'use client'

import Link from 'next/link'
import { Loader2, UserPlus } from 'lucide-react'
import { PageHeader } from '@/components/family/page-header'
import { Button } from '@/components/ui/button'
import { useLovedOnes } from '@/components/family/family-data-provider'
import { LovedOneCard } from '@/components/family/loved-one-card'
import { EmptyFamily } from '@/components/family/empty-family'

export default function MembersPage() {
  const { lovedOnes, loading } = useLovedOnes()

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end justify-between gap-4">
        <PageHeader title="Your family" subtitle="The people you’re caring for." />
        {lovedOnes.length > 0 && (
          <Button asChild size="sm">
            <Link href="/family/add"><UserPlus className="h-4 w-4" strokeWidth={2} /> Add</Link>
          </Button>
        )}
      </div>

      {loading && lovedOnes.length === 0 ? (
        <div className="grid place-items-center rounded-lg border border-line bg-card py-16 shadow-sm">
          <Loader2 className="h-6 w-6 animate-spin text-green" strokeWidth={2} />
        </div>
      ) : lovedOnes.length === 0 ? (
        <EmptyFamily />
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {lovedOnes.map((lo) => <LovedOneCard key={lo.id} lo={lo} />)}
        </div>
      )}
    </div>
  )
}
