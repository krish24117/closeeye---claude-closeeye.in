'use client'

import Link from 'next/link'
import { ArrowRight, CalendarPlus, ClipboardList, Loader2, UserPlus } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Greeting } from '@/components/family/greeting'
import { SectionTitle } from '@/components/family/section-title'
import { EmptyFamily } from '@/components/family/empty-family'
import { LovedOneCard } from '@/components/family/loved-one-card'
import { useLovedOnes } from '@/components/family/family-data-provider'
import type { LovedOne } from '@/lib/db/types'

function ActionCard({ href, icon: Icon, title, desc }: { href: string; icon: LucideIcon; title: string; desc: string }) {
  return (
    <Link href={href} className="group flex items-start gap-3 rounded-lg border border-line bg-card p-5 shadow-sm transition-all duration-200 ease-premium hover:-translate-y-0.5 hover:shadow-md">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent-soft text-green"><Icon className="h-5 w-5" strokeWidth={1.75} /></span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-2">
          <span className="text-body font-semibold text-ink">{title}</span>
          <ArrowRight className="h-4 w-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5" strokeWidth={1.75} />
        </span>
        <span className="mt-0.5 block text-caption text-muted">{desc}</span>
      </span>
    </Link>
  )
}

function RealOverview({ lovedOnes }: { lovedOnes: LovedOne[] }) {
  const first = lovedOnes[0]!.full_name.split(/\s+/)[0]
  return (
    <>
      <section className="flex flex-col gap-4">
        <SectionTitle href="/family/members" cta="Manage →">Your family</SectionTitle>
        <div className="grid gap-5 md:grid-cols-2">
          {lovedOnes.map((lo) => <LovedOneCard key={lo.id} lo={lo} />)}
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <SectionTitle>Getting started</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-3">
          <ActionCard href="/book" icon={CalendarPlus} title="Book the first visit" desc={`Schedule a wellbeing visit for ${first}.`} />
          <ActionCard href="/family/members" icon={ClipboardList} title="Complete their profile" desc="Add health details and emergency contacts." />
          <ActionCard href="/family/add" icon={UserPlus} title="Add another family member" desc="Care for more of your family." />
        </div>
      </section>
    </>
  )
}

export default function FamilyHome() {
  const { lovedOnes, loading } = useLovedOnes()

  return (
    <div className="flex flex-col gap-8">
      <Greeting />
      {loading && lovedOnes.length === 0 ? (
        <div className="grid place-items-center rounded-lg border border-line bg-card py-20 shadow-sm">
          <Loader2 className="h-6 w-6 animate-spin text-green" strokeWidth={2} />
        </div>
      ) : lovedOnes.length === 0 ? (
        <EmptyFamily />
      ) : (
        <RealOverview lovedOnes={lovedOnes} />
      )}
    </div>
  )
}
